# Baseline alerting — the pre-launch technical assessment's single biggest
# operational gap was "nobody is notified if the app goes down." This is the
# minimum viable fix: three alarms covering "the app is erroring," "the app
# is unreachable," and "the app is out of capacity," all routed to one SNS
# topic with an email + SMS subscription. Not a full observability stack —
# an error-tracking service (Sentry-class) and richer dashboards are a
# later, proportional next step once this is actually in daily use.

resource "aws_sns_topic" "alerts" {
  name              = "${local.name_prefix}-alerts"
  kms_master_key_id = aws_kms_key.main.id
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# SMS subscriptions don't have a confirmation step (unlike email, which
# requires clicking a link AWS sends automatically) — this is live as soon
# as it's applied.
resource "aws_sns_topic_subscription" "alerts_sms" {
  count     = var.alert_phone != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "sms"
  endpoint  = var.alert_phone
}

# The app is actively erroring — 5xx responses from the app itself (not
# the ALB's own 5xxs, which usually mean something upstream of the app is
# broken and would show up in alb_no_healthy_hosts below instead).
resource "aws_cloudwatch_metric_alarm" "alb_target_5xx" {
  alarm_name          = "${local.name_prefix}-target-5xx"
  alarm_description   = "App returned 10+ 5xx responses in 5 minutes."
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HTTPCode_Target_5XX_Count"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 10
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

# The app is unreachable — no healthy targets behind the ALB at all. This
# is the "is the site actually up" alarm; catches a crash-looping task,
# a bad deploy, or the app failing its health check for any reason.
resource "aws_cloudwatch_metric_alarm" "alb_no_healthy_hosts" {
  alarm_name          = "${local.name_prefix}-no-healthy-hosts"
  alarm_description   = "Zero healthy ECS tasks behind the ALB for 2 minutes straight."
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HealthyHostCount"
  statistic           = "Minimum"
  period              = 60
  evaluation_periods  = 2
  threshold           = 1
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "breaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.app.arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

# The single running task is maxed out — an early warning before it starts
# actually failing requests, relevant since app_desired_count is 1 with no
# autoscaling today.
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "${local.name_prefix}-ecs-cpu-high"
  alarm_description   = "ECS service CPU above 90% for 10 minutes."
  namespace           = "AWS/ECS"
  metric_name         = "CPUUtilization"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = 90
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.app.name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
