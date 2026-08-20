# Deploying to production

This is the actual, repeatable process for shipping an app-code change to
`avanza.care`. `infra/README.md` covers infrastructure (Terraform) changes —
this covers ordinary app-code deploys, which is almost every day-to-day
change.

There is no CI/CD pipeline yet (a known gap — see the pre-launch technical
assessment). Every deploy today is a manually-run sequence. This doc exists
so that sequence doesn't only live in one person's head or one chat
transcript.

## What you need

- AWS CLI access to account `413790912837`, region `us-east-1`, with
  permission to use ECR, ECS, CodeBuild, IAM (to create/delete a scratch
  role), and S3 (to create/delete a scratch bucket).
- The repo checked out locally, on the commit you want to ship, with a
  clean working tree (`git status` shows nothing pending).

## The short version

```
1. Build & push a Docker image tagged with the git commit SHA, to ECR.
2. Register a new ECS task definition revision pointing at that image.
3. If this deploy includes a Prisma schema change, run a one-off ECS task
   to sync the schema BEFORE deploying the new app code.
4. Point the ECS service at the new task definition and force a new
   deployment.
5. Verify the site is actually healthy.
```

## Step 1 — Build and push the image

**If you have Docker available locally** (a real laptop with Docker
Desktop, or a CI runner with Docker-in-Docker):

```bash
SHA=$(git rev-parse --short HEAD)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 413790912837.dkr.ecr.us-east-1.amazonaws.com
docker build -t 413790912837.dkr.ecr.us-east-1.amazonaws.com/carecoord-hub-pilot-app:$SHA .
docker push 413790912837.dkr.ecr.us-east-1.amazonaws.com/carecoord-hub-pilot-app:$SHA
```

**If you don't have Docker available** (e.g. a sandboxed CLI environment,
which is how every deploy in this project's history so far has actually
been done — no local Docker, no dev machine involved), build it via a
throwaway AWS CodeBuild project instead. This does the same thing, just
runs the `docker build` on AWS's infrastructure rather than yours:

```bash
SHA=$(git rev-parse --short HEAD)
git archive --format=zip -o /tmp/source.zip HEAD

BUCKET="carecoord-deploy-scratch-$(date +%s)"
aws s3 mb "s3://$BUCKET" --region us-east-1
aws s3 cp /tmp/source.zip "s3://$BUCKET/source.zip"

# Scratch IAM role CodeBuild assumes — least privilege: push to this one
# ECR repo, read this one S3 object, write its own logs. Nothing else.
aws iam create-role --role-name carecoord-deploy-scratch-role \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"codebuild.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
aws iam put-role-policy --role-name carecoord-deploy-scratch-role --policy-name scratch-policy --policy-document "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [
    {\"Effect\": \"Allow\", \"Action\": [\"logs:CreateLogGroup\",\"logs:CreateLogStream\",\"logs:PutLogEvents\"], \"Resource\": \"*\"},
    {\"Effect\": \"Allow\", \"Action\": [\"s3:GetObject\"], \"Resource\": \"arn:aws:s3:::$BUCKET/*\"},
    {\"Effect\": \"Allow\", \"Action\": [\"ecr:GetAuthorizationToken\"], \"Resource\": \"*\"},
    {\"Effect\": \"Allow\", \"Action\": [\"ecr:BatchCheckLayerAvailability\",\"ecr:GetDownloadUrlForLayer\",\"ecr:BatchGetImage\",\"ecr:PutImage\",\"ecr:InitiateLayerUpload\",\"ecr:UploadLayerPart\",\"ecr:CompleteLayerUpload\"], \"Resource\": \"*\"}
  ]
}"
sleep 8  # let IAM propagate before CodeBuild tries to assume the role

# The buildspec MUST be passed via --cli-input-json (a file), not the CLI's
# `source=...` shorthand — the shorthand parser mangles multi-line YAML and
# fails with a cryptic "Expected Version to be of float type" error.
cat > /tmp/buildspec.yml <<EOF
version: 0.2
phases:
  pre_build:
    commands:
      - aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 413790912837.dkr.ecr.us-east-1.amazonaws.com
  build:
    commands:
      - docker build -t 413790912837.dkr.ecr.us-east-1.amazonaws.com/carecoord-hub-pilot-app:\$SHA .
  post_build:
    commands:
      - docker push 413790912837.dkr.ecr.us-east-1.amazonaws.com/carecoord-hub-pilot-app:\$SHA
EOF
python3 - "$BUCKET" <<'PYEOF'
import json, sys
bucket = sys.argv[1]
buildspec = open("/tmp/buildspec.yml").read()
json.dump({"name": "carecoord-deploy-scratch-build", "source": {"type": "S3", "location": f"{bucket}/source.zip", "buildspec": buildspec}}, open("/tmp/update-project.json", "w"))
PYEOF

aws codebuild create-project \
  --name carecoord-deploy-scratch-build \
  --source "type=S3,location=$BUCKET/source.zip" \
  --artifacts "type=NO_ARTIFACTS" \
  --environment "type=LINUX_CONTAINER,image=aws/codebuild/standard:7.0,computeType=BUILD_GENERAL1_MEDIUM,privilegedMode=true,environmentVariables=[{name=SHA,value=$SHA}]" \
  --service-role "arn:aws:iam::413790912837:role/carecoord-deploy-scratch-role" \
  --region us-east-1
# Apply the real (multi-line) buildspec — create-project's shorthand source
# above is a placeholder; this is the fix for the parsing issue noted above.
aws codebuild update-project --cli-input-json file:///tmp/update-project.json --region us-east-1

BUILD_ID=$(aws codebuild start-build --project-name carecoord-deploy-scratch-build --region us-east-1 --query 'build.id' --output text)
echo "Building $BUILD_ID — poll with: aws codebuild batch-get-builds --ids $BUILD_ID --region us-east-1 --query 'builds[0].buildStatus'"
# Wait for buildStatus to become SUCCEEDED (takes ~3-4 min), then clean up:
aws codebuild delete-project --name carecoord-deploy-scratch-build --region us-east-1
aws iam delete-role-policy --role-name carecoord-deploy-scratch-role --policy-name scratch-policy
aws iam delete-role --role-name carecoord-deploy-scratch-role
aws s3 rm "s3://$BUCKET" --recursive
aws s3 rb "s3://$BUCKET"
```

Either way, you now have `413790912837.dkr.ecr.us-east-1.amazonaws.com/carecoord-hub-pilot-app:$SHA` in ECR.

## Step 2 — Register a new task definition revision

```bash
aws ecs describe-task-definition --task-definition carecoord-hub-pilot-app --region us-east-1 --query 'taskDefinition' > /tmp/current-taskdef.json
python3 - <<PYEOF
import json
with open("/tmp/current-taskdef.json") as f:
    td = json.load(f)
for c in td["containerDefinitions"]:
    if c["name"] == "app":
        c["image"] = "413790912837.dkr.ecr.us-east-1.amazonaws.com/carecoord-hub-pilot-app:$SHA"
for key in ["taskDefinitionArn", "revision", "status", "requiresAttributes", "compatibilities", "registeredAt", "registeredBy", "deregisteredAt"]:
    td.pop(key, None)
with open("/tmp/new-taskdef.json", "w") as f:
    json.dump(td, f)
PYEOF
aws ecs register-task-definition --cli-input-json file:///tmp/new-taskdef.json --region us-east-1 --query 'taskDefinition.taskDefinitionArn'
```

## Step 3 — Sync the database schema (only if `prisma/schema.prisma` changed)

If this deploy doesn't touch the Prisma schema, skip this step.

If it does, run it **before** Step 4 — the running (old) app code should
never be pointed at a schema it doesn't expect, and the new app code
shouldn't start until the schema it expects actually exists.

```bash
aws ecs run-task \
  --cluster carecoord-hub-pilot-cluster \
  --task-definition carecoord-hub-pilot-app:<new-revision-number-from-step-2> \
  --launch-type FARGATE \
  --network-configuration 'awsvpcConfiguration={subnets=[subnet-09917034cbd1e80f6,subnet-012760144def58a50],securityGroups=[sg-0bc60f5b02b3b28c3],assignPublicIp=DISABLED}' \
  --overrides '{"containerOverrides":[{"name":"app","command":["node","scripts/prebuild-db-sync.mjs"]}]}' \
  --region us-east-1 --query 'tasks[0].taskArn'
```

Poll `aws ecs describe-tasks --cluster carecoord-hub-pilot-cluster --tasks <arn> --region us-east-1 --query 'tasks[0].lastStatus'`
until it says `STOPPED`, then check the exit code:
`aws ecs describe-tasks --cluster carecoord-hub-pilot-cluster --tasks <arn> --region us-east-1 --query 'tasks[0].containers[0].exitCode'`
— must be `0`. If it isn't, check the logs in CloudWatch
(`/ecs/carecoord-hub-pilot-app`, log stream `app/app/<task-id>`) before
proceeding — do not deploy app code against a schema sync that failed.

## Step 4 — Deploy

```bash
aws ecs update-service \
  --cluster carecoord-hub-pilot-cluster \
  --service carecoord-hub-pilot-app \
  --task-definition carecoord-hub-pilot-app:<new-revision-number-from-step-2> \
  --force-new-deployment \
  --region us-east-1
```

Poll until stable:

```bash
aws ecs describe-services --cluster carecoord-hub-pilot-cluster --services carecoord-hub-pilot-app --region us-east-1 \
  --query 'services[0].deployments[0].rolloutState'
```

Wait for `COMPLETED`.

## Step 5 — Verify

```bash
ALB=$(aws elbv2 describe-load-balancers --names carecoord-hub-pilot-alb --region us-east-1 --query 'LoadBalancers[0].DNSName' --output text)
curl -sk -o /dev/null -w "%{http_code}\n" -H "Host: avanza.care" "https://$ALB/login"   # expect 200
curl -sk -o /dev/null -w "%{http_code}\n" -H "Host: avanza.care" "https://$ALB/"        # expect 307 (redirect to /login when unauthenticated)
```

Then actually log in and click around the parts of the app the deploy
touched — the curl checks only confirm the process is up and serving
pages, not that the specific feature works.

**A known false alarm right after any deploy:** anyone with the app
already open in a browser tab from *before* the deploy will see
`Failed to find Server Action "..." — this request might be from an older
or newer deployment` if they submit a form. That's expected (Next.js
Server Action references are per-build) — the fix is closing and
reopening the tab, not a code change.

## Why there's no CI/CD yet

This is the single biggest gap flagged in the pre-launch technical
assessment. The steps above should become a GitHub Actions workflow (or
equivalent) that runs on merge to the deploy branch — that's tracked as a
90-day item, not done yet. Until then, whoever runs this needs AWS
credentials with the permissions listed at the top of this file and a
clean checkout of the commit being shipped.

## Infrastructure (Terraform) changes

If your change touches anything in `infra/*.tf` (not just app code), see
`infra/README.md` instead — that requires running `terraform apply` from
an environment that can reach `registry.terraform.io` (AWS CloudShell has
worked reliably for this project; some sandboxed CLI environments block
that domain by policy). After a `terraform apply` that changes the ECS
task definition, the service still won't pick it up automatically — the
`aws_ecs_service` resource has `lifecycle { ignore_changes = [task_definition] }`
specifically so Terraform never fights this file's deploy process — so
you still need to run Step 4 above afterward, pointing at whatever
revision Terraform just registered.
