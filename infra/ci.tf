# A durable, reviewable deploy pipeline — replacing the ad hoc pattern of
# creating a scratch S3 bucket + scratch CodeBuild project + scratch IAM
# role for every single deploy, then tearing them all down again. That
# pattern existed only because no persistent pipeline existed yet (see
# infra/README.md's original "Doesn't set up CI/CD" note); it also meant
# every deploy needed IAM role create/delete and S3 bucket create/delete
# permissions, which is far more than a deploy actually needs.
#
# Gated on github_repo_url so `terraform apply` stays a no-op here until
# you're ready to wire this in.
locals {
  has_ci = var.github_repo_url != ""
}

# One-time manual step, unavoidable: CodeBuild's GitHub source needs an
# authorized connection, and authorizing it (the actual GitHub OAuth
# handshake) can only be done by a human in the AWS Console — Terraform can
# create the connection resource, but it sits in PENDING status until
# someone opens it in the console (CodeBuild > Settings > Connections) and
# clicks "Update pending connection" to log into GitHub and approve it.
resource "aws_codestarconnections_connection" "github" {
  count         = local.has_ci ? 1 : 0
  name          = "${local.name_prefix}-github"
  provider_type = "GitHub"
}

resource "aws_iam_role" "codebuild_deploy" {
  count = local.has_ci ? 1 : 0
  name  = "${local.name_prefix}-codebuild-deploy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "codebuild.amazonaws.com" }
    }]
  })
}

# What the BUILD ITSELF needs — pushing the image it just built to ECR,
# writing its own logs, and reading the GitHub connection to pull source.
# Deliberately does NOT include ecs:*, since deploying the built image is a
# separate step the ai-agent-deploy policy (infra/ai-agent-iam.tf) covers —
# a compromised build shouldn't be able to force a new ECS deployment on
# its own.
resource "aws_iam_role_policy" "codebuild_deploy" {
  count = local.has_ci ? 1 : 0
  name  = "${local.name_prefix}-codebuild-deploy-policy"
  role  = aws_iam_role.codebuild_deploy[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = ["${aws_cloudwatch_log_group.codebuild_deploy[0].arn}:*"]
      },
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = ["*"] # this specific action has no resource-level permissions in AWS
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
        ]
        Resource = [aws_ecr_repository.app.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["codestar-connections:UseConnection"]
        Resource = [aws_codestarconnections_connection.github[0].arn]
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "codebuild_deploy" {
  count             = local.has_ci ? 1 : 0
  name              = "/codebuild/${local.name_prefix}-deploy"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.main.arn
}

resource "aws_codebuild_project" "deploy" {
  count        = local.has_ci ? 1 : 0
  name         = "${local.name_prefix}-deploy"
  service_role = aws_iam_role.codebuild_deploy[0].arn

  source {
    type            = "GITHUB"
    location        = var.github_repo_url
    buildspec       = "infra/buildspec.yml"
    git_clone_depth = 1

    auth {
      type     = "CODECONNECTIONS"
      resource = aws_codestarconnections_connection.github[0].arn
    }
  }

  # No branch filter / webhook here on purpose — triggering a build is a
  # deliberate action (a human, or the ai-agent-deploy identity, calling
  # codebuild:StartBuild with a specific commit SHA via sourceVersion), not
  # something that fires automatically on every push.

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    type                        = "LINUX_CONTAINER"
    compute_type                = "BUILD_GENERAL1_MEDIUM"
    image                       = "aws/codebuild/standard:7.0"
    privileged_mode             = true # needed for `docker build`
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "ECR_REPOSITORY_URL"
      value = aws_ecr_repository.app.repository_url
    }
  }

  logs_config {
    cloudwatch_logs {
      group_name = aws_cloudwatch_log_group.codebuild_deploy[0].name
    }
  }
}
