import type { CarePlanGoal } from "@/app/generated/prisma/client";

type CompletableGoal = Pick<
  CarePlanGoal,
  | "opportunity"
  | "priority"
  | "strengths"
  | "barriers"
  | "goalText"
  | "memberActionText"
  | "memberActionBeginDate"
  | "memberActionTargetEndDate"
  | "coordinatorActionText"
  | "coordinatorActionBeginDate"
  | "coordinatorActionTargetEndDate"
>;

export const GOAL_COMPLETION_REQUIREMENTS_MESSAGE =
  "Fill out Opportunity, Priority, Strengths, Barriers, the Goal, the member's Action (with Begin and Target dates), and the care coordinator's Action (with Begin and Target dates) before marking this goal Complete.";

// A goal can only be marked Complete once every field that matters to the
// member's plan is actually on record — see GOAL_COMPLETION_REQUIREMENTS_MESSAGE.
// "Date Completed" fields aren't required here since they track when the
// action was finished, not whether the plan itself is fully documented.
export function isGoalReadyForCompletion(goal: CompletableGoal): boolean {
  return Boolean(
    goal.opportunity &&
      goal.priority &&
      goal.strengths &&
      goal.barriers &&
      goal.goalText &&
      goal.memberActionText &&
      goal.memberActionBeginDate &&
      goal.memberActionTargetEndDate &&
      goal.coordinatorActionText &&
      goal.coordinatorActionBeginDate &&
      goal.coordinatorActionTargetEndDate
  );
}
