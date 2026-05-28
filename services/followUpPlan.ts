export type FollowUpPlanStatus = 'scheduled' | 'monitoring' | 'completed' | 'urgent';

export interface FollowUpPlanPayload {
  description: string;
  nextFollowUpDate: string;
  status: FollowUpPlanStatus;
}

const FOLLOW_UP_PLAN_PREFIX = 'FOLLOW_UP_PLAN::';

export function encodeFollowUpPlan(payload: FollowUpPlanPayload): string {
  return `${FOLLOW_UP_PLAN_PREFIX}${JSON.stringify(payload)}`;
}

export function decodeFollowUpPlan(content?: string | null): FollowUpPlanPayload | null {
  if (!content || !content.startsWith(FOLLOW_UP_PLAN_PREFIX)) return null;

  try {
    const parsed = JSON.parse(content.slice(FOLLOW_UP_PLAN_PREFIX.length)) as Partial<FollowUpPlanPayload>;
    if (!parsed || typeof parsed.description !== 'string' || typeof parsed.nextFollowUpDate !== 'string' || typeof parsed.status !== 'string') {
      return null;
    }

    if (!isFollowUpPlanStatus(parsed.status)) return null;

    return {
      description: parsed.description,
      nextFollowUpDate: parsed.nextFollowUpDate,
      status: parsed.status
    };
  } catch {
    return null;
  }
}

export function isFollowUpPlanMessage(content?: string | null): boolean {
  return Boolean(decodeFollowUpPlan(content));
}

function isFollowUpPlanStatus(value: string): value is FollowUpPlanStatus {
  return value === 'scheduled' || value === 'monitoring' || value === 'completed' || value === 'urgent';
}
