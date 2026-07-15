# Single customer-managed KMS key used for RDS, S3, Secrets Manager, and
# CloudWatch Logs encryption at rest. A CMK (rather than the AWS-managed
# default key) gives you key rotation, access policy control, and an audit
# trail of key usage via CloudTrail — expected for a HIPAA-eligible setup.
resource "aws_kms_key" "main" {
  description             = "${local.name_prefix} encryption key (RDS, S3, Secrets Manager, logs)"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnableRootAccountAccess"
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      },
      {
        Sid    = "AllowServiceUse"
        Effect = "Allow"
        Principal = {
          Service = [
            "rds.amazonaws.com",
            "s3.amazonaws.com",
            "secretsmanager.amazonaws.com",
            "logs.${var.aws_region}.amazonaws.com",
            "cloudtrail.amazonaws.com",
          ]
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey*",
          "kms:DescribeKey",
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_kms_alias" "main" {
  name          = "alias/${local.name_prefix}"
  target_key_id = aws_kms_key.main.key_id
}

data "aws_caller_identity" "current" {}
