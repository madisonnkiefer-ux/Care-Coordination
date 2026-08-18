import "server-only";
import { S3Client } from "@aws-sdk/client-s3";

// Credentials come from the ECS task role (infra/iam.tf's ecs_task role) via
// the default AWS SDK credential provider chain — never static keys.
export const s3 = new S3Client({ region: process.env.AWS_REGION });

export const DOCUMENTS_BUCKET = process.env.S3_DOCUMENTS_BUCKET!;
