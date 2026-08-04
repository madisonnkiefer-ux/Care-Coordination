resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${local.name_prefix}-db-subnet-group" }
}

resource "aws_db_parameter_group" "postgres" {
  name   = "${local.name_prefix}-postgres17"
  family = "postgres17"

  # Force SSL for every connection to RDS — encryption in transit, not just at rest.
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
}

resource "aws_db_instance" "main" {
  identifier     = "${local.name_prefix}-db"
  engine         = "postgres"
  engine_version = "17.10" # 17.4 is no longer offered by RDS; pin to whatever's current when you touch this next

  instance_class        = var.db_instance_class
  allocated_storage     = var.db_allocated_storage_gb
  max_allocated_storage = var.db_allocated_storage_gb * 5
  storage_type          = "gp3"

  # Encryption at rest via the shared customer-managed KMS key.
  storage_encrypted = true
  kms_key_id        = aws_kms_key.main.arn

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.postgres.name

  # No public access — reachable only from ECS tasks inside the VPC.
  publicly_accessible = false

  multi_az = var.db_multi_az

  backup_retention_period = var.db_backup_retention_days
  backup_window           = "07:00-08:00"
  maintenance_window      = "sun:08:30-sun:09:30"
  copy_tags_to_snapshot   = true

  # Deletion protection + a final snapshot: a stray `terraform destroy`
  # shouldn't be able to silently delete PHI.
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${local.name_prefix}-db-final-snapshot"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = { Name = "${local.name_prefix}-db" }
}

resource "aws_cloudwatch_log_group" "rds" {
  name              = "/aws/rds/instance/${local.name_prefix}-db/postgresql"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.main.arn
}
