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

  # Uncomment and fill in once you have an S3 bucket + DynamoDB table for
  # remote state (create these by hand once, outside this config, so state
  # locking works from the start). Local state is fine to start with, but
  # move off it before more than one person touches this.
  #
  # backend "s3" {
  #   bucket         = "carecoord-hub-terraform-state"
  #   key            = "carecoord-hub/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "carecoord-hub-terraform-locks"
  #   encrypt        = true
  # }
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
