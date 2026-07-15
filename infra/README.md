# Infrastructure (Terraform)

Provisions a HIPAA-eligible AWS setup for CareCoord Hub: private VPC, RDS
Postgres (encrypted, not publicly reachable), ECS Fargate running the app
behind an internet-facing ALB, S3 for document storage, KMS for encryption
at rest, Secrets Manager for credentials, and a CloudTrail audit trail.

**This code has not been applied to any AWS account.** It's ready to run
once you've cleared the prerequisites below — none of which Terraform (or I)
can do for you.

## Prerequisites — organizational, not technical

1. **An AWS account** dedicated to this (or a clearly separated environment
   within one), with billing/ownership settled.
2. **A signed AWS Business Associate Addendum (BAA)**. Available for free
   via AWS Artifact in the account — required before any PHI touches this
   infrastructure.
3. **Only HIPAA-eligible AWS services are used here**: VPC, ECS Fargate,
   RDS, S3, KMS, Secrets Manager, CloudTrail, ALB, ECR, Route53/ACM. If you
   extend this config, check new services against AWS's current HIPAA
   eligibility list first.
4. **A domain name** you control, ideally with an existing Route53 hosted
   zone (or you'll point your registrar's DNS at the ALB manually).
5. Someone with **IAM permissions to create the above resource types** in
   the account, and the AWS CLI configured locally (`aws configure`, or SSO).

## What this does NOT do

- Doesn't build or push the app's Docker image (see "Deploying the app"
  below).
- Doesn't run database migrations (`prisma db push` / your CI pipeline
  handles that against the RDS endpoint output).
- Doesn't replace a formal HIPAA Security Risk Assessment — this is the
  technical half of "lock down the infrastructure," not the paperwork half.
- Doesn't set up CI/CD. Rebuilding/redeploying the ECS service on every
  push is a follow-up, not included here.

## First apply (bootstrap)

```bash
cd infra
terraform init
cp terraform.tfvars.example terraform.tfvars   # edit as needed
terraform plan
terraform apply
```

Leave `domain_name` and `route53_zone_id` blank for this first apply — the
ECS service will come up healthy behind the ALB's raw DNS name over HTTP
only. That's expected and fine for a connectivity smoke test; **do not
point real member data at it yet.**

The ECS service will deploy the placeholder `app_image` (nginx) since no
real image exists in ECR yet — expected, see below.

## Deploying the app

```bash
# Build and push a real image
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <ecr_repository_url>
docker build -t <ecr_repository_url>:latest ..   # from repo root, where the Dockerfile lives
docker push <ecr_repository_url>:latest

# Point Terraform at it and re-apply, or just force a new ECS deployment:
aws ecs update-service --cluster <ecs_cluster_name> --service <name_prefix>-app --force-new-deployment
```

(The `Dockerfile` at the repo root already does this — standard Next.js
standalone-output multi-stage build.)

## Adding HTTPS

Once you have a domain and hosted zone:

1. Set `domain_name` and `route53_zone_id` in `terraform.tfvars`.
2. `terraform apply` — this provisions an ACM certificate, validates it via
   DNS, switches the ALB's port-80 listener to redirect to a new 443
   listener, and points the domain's A record at the ALB.

## Database migrations

`aws_db_instance.main` starts empty and has no public endpoint on purpose —
you can't `psql` into it from your laptop. The way in is a one-off ECS
Fargate task, running the same app image, inside the same private subnet as
the real app, so it can reach RDS but nothing else can reach RDS.

After you've pushed a real app image (see "Deploying the app" above), run:

```bash
terraform output -raw run_migration_command | bash
```

That runs `npx prisma db push` inside a throwaway task using the
`DATABASE_URL` secret already wired into the task definition, then exits.
Watch it finish in the ECS console (or `aws ecs describe-tasks`) — a schema
sync against an empty database only takes a few seconds.

To load the fake demo dataset too (never real PHI — see `prisma/seed.ts`),
swap the container override's command for `["npx","prisma","db","seed"]` and
re-run the same way.

## Remote state

This config uses local state by default. Before more than one person
applies changes, create an S3 bucket + DynamoDB table for remote state and
uncomment the `backend "s3"` block in `versions.tf` — do this early, state
files can contain sensitive values.

## Cost note

The defaults in `terraform.tfvars.example` are a **lean pilot profile** —
roughly **$85–100/month** at low traffic:

| Resource | Pilot default | Monthly (approx) |
|---|---|---|
| NAT gateway | 1 shared (`single_nat_gateway = true`) | ~$32 + data processing |
| RDS `db.t4g.micro`, single-AZ | `db_multi_az = false` | ~$13 |
| ALB | always on | ~$20 + LCU usage |
| Fargate, 1 task (.5 vCPU / 1GB) | `app_desired_count = 1` | ~$18 |
| S3, Secrets Manager, KMS, CloudTrail | — | ~$5 |

None of that is a compliance requirement — it's redundancy/uptime spend.
The actual HIPAA-relevant safeguards (KMS encryption at rest, force-SSL in
transit, private subnets, RBAC, audit logging) cost nothing extra and are
**not** behind any of these knobs.

Scaling up before a real go-live, roughly **$150–250/month**:

```hcl
single_nat_gateway = false  # +~$32/mo — survives a single-AZ NAT outage
db_multi_az         = true  # +~$13/mo — automatic RDS failover
app_desired_count   = 2     # +~$18/mo — zero-downtime deploys
```

Flip these independently, whenever the uptime matters more than the
savings — there's no reason to do it all at once.
