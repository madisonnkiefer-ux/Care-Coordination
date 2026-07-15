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
