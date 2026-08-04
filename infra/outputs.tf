output "alb_dns_name" {
  description = "ALB DNS name. Point your domain's CNAME/alias here if not using Terraform-managed Route53."
  value       = aws_lb.main.dns_name
}

output "app_url" {
  description = "URL the app is reachable at."
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "http://${aws_lb.main.dns_name}"
}

output "ecr_repository_url" {
  description = "Push your built app image here, then update var.app_image and re-apply (or redeploy the ECS service)."
  value       = aws_ecr_repository.app.repository_url
}

output "rds_endpoint" {
  description = "RDS Postgres endpoint (host:port). Not publicly reachable — only from inside the VPC."
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "database_url_secret_arn" {
  description = "Secrets Manager ARN holding the full DATABASE_URL connection string."
  value       = aws_secretsmanager_secret.database_url.arn
}

output "documents_bucket_name" {
  description = "S3 bucket for member document uploads."
  value       = aws_s3_bucket.documents.id
}

output "cloudtrail_bucket_name" {
  description = "S3 bucket holding the CloudTrail audit log."
  value       = aws_s3_bucket.cloudtrail.id
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_task_family" {
  description = "Task definition family — pass to `aws ecs run-task` for one-off jobs like database migrations (see infra/README.md)."
  value       = aws_ecs_task_definition.app.family
}

output "private_subnet_ids" {
  description = "Private subnet IDs — needed for `aws ecs run-task`'s --network-configuration."
  value       = aws_subnet.private[*].id
}

output "ecs_security_group_id" {
  description = "Security group ID — needed for `aws ecs run-task`'s --network-configuration."
  value       = aws_security_group.ecs_tasks.id
}

output "run_migration_command" {
  description = "Ready-to-use command to sync the schema (via scripts/prebuild-db-sync.mjs, which works around a Prisma schema-engine bug a raw `db push` can hit on this schema) as a one-off task against the private RDS instance, once a real app image has been pushed."
  value       = "aws ecs run-task --cluster ${aws_ecs_cluster.main.name} --task-definition ${aws_ecs_task_definition.app.family} --launch-type FARGATE --network-configuration 'awsvpcConfiguration={subnets=[${join(",", aws_subnet.private[*].id)}],securityGroups=[${aws_security_group.ecs_tasks.id}],assignPublicIp=DISABLED}' --overrides '{\"containerOverrides\":[{\"name\":\"app\",\"command\":[\"node\",\"scripts/prebuild-db-sync.mjs\"]}]}' --region ${var.aws_region}"
}
