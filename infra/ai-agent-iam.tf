# Zero standing production access, on purpose: this account decided to keep
# AI-agent sessions out of production entirely (no Anthropic BAA covering
# PHI, instead of narrowing prod access) rather than relying on a scoped-
# but-still-prod-touching credential. An earlier version of this file
# granted read-only prod log access and the ability to register task-def
# revisions and call ecs:UpdateService (push a deployment) — all removed.
#
# What this means in practice:
#   - No ecs:UpdateService / ecs:RegisterTaskDefinition — an agent session
#     cannot push a deployment to the production service, automatically or
#     otherwise. That's a manual, human-triggered action now (see
#     infra/README.md's "Deploying the app" steps), same as a direct
#     `aws ecs update-service --force-new-deployment` run by a person.
#   - No logs:* on the production log group, no ecs:Describe* on the
#     production service/cluster, no elasticloadbalancing:Describe* — an
#     agent session has no read visibility into production either, not
#     just no write/deploy access.
#   - codebuild:StartBuild against infra/ci.tf's deploy project is also
#     excluded here, since that project builds and pushes images to the
#     *production* ECR repository — triggering it is still "pushing toward
#     production" even without the final ecs:UpdateService step.
#
# The actual build/test loop for agent sessions should instead target a
# separate dev/clone environment (own cluster, own database seeded with
# synthetic data, own CodeBuild project) — not yet scaffolded in this repo.
# Once it exists, a policy scoped to *that* environment's resources is the
# right place for an agent credential to have deploy access again.
#
# This resource intentionally has nothing to attach to any identity at all
# right now — it exists as a placeholder/reference until the dev
# environment is built, documenting the decision rather than granting
# anything.
resource "aws_iam_policy" "ai_agent_deploy" {
  name        = "${local.name_prefix}-ai-agent-deploy"
  description = "Deliberately empty of production access — see infra/ai-agent-iam.tf. Scope this to a dev/clone environment once one exists."

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "NoProductionAccessPlaceholder"
        Effect   = "Deny"
        Action   = ["*"]
        Resource = ["*"]
      }
    ]
  })
}
