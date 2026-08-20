terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Bucket + table created by hand (AWS CLI, not this config — a backend
  # can't bootstrap the resources it depends on to store its own state).
  # Both are versioned/KMS-encrypted/public-access-blocked to match the
  # rest of this account's S3 posture; see infra/README.md's "Remote
  # state" section for the exact commands used to create them.
  backend "s3" {
    bucket         = "carecoord-hub-pilot-terraform-state-413790912837"
    key            = "carecoord-hub-pilot/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "carecoord-hub-pilot-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "carecoord-hub"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
