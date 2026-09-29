# A deliberately narrow policy for an AI coding agent's ongoing AWS access
# (e.g. a Claude Code session), covering exactly what "find a bug, fix it,
# deploy it, check the logs" needs and nothing else — as opposed to the
# credentials used to build this infrastructure in the first place, which
# could create/delete IAM roles, modify the WAF and ALB, and create/delete
# S3 buckets (everything Terraform itself needs, appropriate for a human
# doing infra work, not for a standing agent credential).
#
# Deliberately NOT included, on purpose:
#   - Any iam:* action (can't create/modify/delete roles or policies,
#     including its own)
#   - Any wafv2:* or elasticloadbalancing:Modify*/CreateListener action
#     (can't touch the WAF or TLS/listener config)
#   - s3:CreateBucket / s3:DeleteBucket (can't stand up or tear down
#     infrastructure, only read the one log group and describe the one ALB)
#   - secretsmanager:GetSecretValue on database_url or session_secret (no
#     standing production database or session-signing credential)
#   - rds:* (no direct database access at all — schema/data changes go
#     through a reviewed migration file a human or the CI pipeline applies)
#
# This resource only creates the policy; it is NOT attached to anything
# here on purpose. Attaching it to a real IAM identity (a new, dedicated
# user or role created specifically for agent sessions — not the broader
# credentials used for the rest of this Terraform config) is a deliberate,
# separate step for whoever administers this AWS account.
resource "aws_iam_policy" "ai_agent_deploy" {
  name        = "${local.name_prefix}-ai-agent-deploy"
  description = "Narrow build/deploy/read-logs access for an AI coding agent — see infra/ai-agent-iam.tf for what's deliberately excluded."

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      local.has_ci ? [
        {
          Sid      = "TriggerAndReadDeployBuilds"
          Effect   = "Allow"
          Action   = ["codebuild:StartBuild", "codebuild:BatchGetBuilds"]
          Resource = [aws_codebuild_project.deploy[0].arn]
        },
      ] : [],
      [
        {
          # RegisterTaskDefinition has no resource-level permissions in
          # IAM (the task def ARN doesn't exist until after the call) —
          # AWS requires Resource: "*" for this action specifically.
          Sid      = "RegisterTaskDefinitionRevisions"
          Effect   = "Allow"
          Action   = ["ecs:RegisterTaskDefinition"]
          Resource = ["*"]
        },
        {
          Sid      = "ReadTaskDefinitions"
          Effect   = "Allow"
          Action   = ["ecs:DescribeTaskDefinition"]
          Resource = ["arn:aws:ecs:${var.aws_region}:*:task-definition/${aws_ecs_task_definition.app.family}:*"]
        },
        {
          Sid      = "DeployToTheOneKnownService"
          Effect   = "Allow"
          Action   = ["ecs:UpdateService", "ecs:DescribeServices"]
          Resource = [aws_ecs_service.app.arn]
        },
        {
          Sid      = "ReadAppLogs"
          Effect   = "Allow"
          Action = [
            "logs:GetLogEvents",
            "logs:DescribeLogStreams",
            "logs:StartQuery",
            "logs:GetQueryResults",
            "logs:StopQuery",
          ]
          Resource = ["${aws_cloudwatch_log_group.app.arn}:*"]
        },
        {
          Sid      = "ReadLoadBalancerConfigForVerification"
          Effect   = "Allow"
          Action   = ["elasticloadbalancing:DescribeLoadBalancers", "elasticloadbalancing:DescribeListeners"]
          Resource = ["*"] # these Describe actions don't support resource-level restriction
        },
      ]
    )
  })
}
