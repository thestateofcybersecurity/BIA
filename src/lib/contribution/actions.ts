'use server';

import { z } from 'zod';
import { getStore } from '@/lib/data/store';
import { isAssessmentComplete } from '@/lib/domain/scoring';
import { verifyContributionToken } from './token';
import type { ImpactAssessment } from '@/lib/domain/types';

/**
 * The one mutation reachable without a session. It trusts nothing from the
 * caller except the signed token: the workspace, the process, and the
 * request are all resolved from the token's claims, so a contributor can
 * only ever write the single assessment they were invited to complete.
 */

const severity = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
const horizons = <T extends z.ZodTypeAny>(inner: T) =>
  z.object({ h4: inner, h24: inner, d3: inner, w1: inner, m1: inner });

const submissionSchema = z.object({
  token: z.string().min(1),
  financialLoss: horizons(z.number().min(0).nullable()),
  ratings: z.object({
    operational: horizons(severity.nullable()),
    reputational: horizons(severity.nullable()),
    legal: horizons(severity.nullable()),
    safety: horizons(severity.nullable()),
  }),
  notes: z.string(),
});

export type SubmitResult =
  | { ok: true; complete: boolean }
  | { ok: false; reason: 'invalid' | 'revoked' | 'not_found' | 'conflict' };

export async function submitContribution(
  input: z.infer<typeof submissionSchema>
): Promise<SubmitResult> {
  const parsed = submissionSchema.parse(input);
  const verified = verifyContributionToken(parsed.token);
  if (!verified.ok) return { ok: false, reason: 'invalid' };
  const { orgId, processId, requestId } = verified.claims;

  const store = getStore();
  const { workspace: ws, version } = await store.loadForUpdate(orgId);
  const request = ws.collectionRequests.find((r) => r.id === requestId);
  if (!request || request.processId !== processId) return { ok: false, reason: 'not_found' };
  if (request.status === 'revoked') return { ok: false, reason: 'revoked' };
  if (!ws.processes.some((p) => p.id === processId)) return { ok: false, reason: 'not_found' };

  const now = new Date().toISOString();
  let assessment = ws.assessments.find((a) => a.processId === processId);
  if (!assessment) {
    assessment = {
      id: `c-${requestId}`,
      processId,
      financialLoss: parsed.financialLoss,
      ratings: parsed.ratings,
      mtpdOverride: null,
      notes: parsed.notes,
      updatedAt: now,
    } satisfies ImpactAssessment;
    ws.assessments.push(assessment);
  } else {
    assessment.financialLoss = parsed.financialLoss;
    assessment.ratings = parsed.ratings;
    assessment.notes = parsed.notes;
    assessment.updatedAt = now;
  }

  // A completed submission from the named owner is the owner sign-off; an
  // incomplete one leaves the assessment unapproved and still pending.
  const complete = isAssessmentComplete(assessment);
  if (complete) {
    assessment.approvedBy = request.ownerName || request.email;
    assessment.approvedAt = now;
    request.status = 'submitted';
    request.submittedAt = now;
  } else {
    assessment.approvedBy = null;
    assessment.approvedAt = null;
  }

  if (!(await store.save(orgId, ws, version))) {
    // Another member saved while the owner was filling the form; ask them to
    // resubmit rather than silently discarding either copy.
    return { ok: false, reason: 'conflict' };
  }
  return { ok: true, complete };
}
