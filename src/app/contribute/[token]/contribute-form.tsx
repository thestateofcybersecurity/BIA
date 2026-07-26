'use client';

import { submitContribution } from '@/lib/contribution/actions';
import type { BusinessProcess, ImpactAssessment, OrgProfile } from '@/lib/domain/types';
import {
  AssessmentForm,
  type AssessmentSubmission,
} from '@/app/assessments/[processId]/assessment-form';

const MESSAGES: Record<string, string> = {
  invalid: 'This link is no longer valid. Ask for a fresh one.',
  revoked: 'This request has been withdrawn. Ask for a fresh link.',
  not_found: 'This process no longer exists in the assessment.',
};

export function ContributeForm({
  token,
  process,
  initial,
  org,
}: {
  token: string;
  process: BusinessProcess;
  initial: ImpactAssessment | null;
  org: OrgProfile | null;
}) {
  return (
    <AssessmentForm
      process={process}
      initial={initial}
      org={org}
      variant="contributor"
      submitLabel="Submit assessment"
      submit={async (payload: AssessmentSubmission) => {
        const result = await submitContribution({ token, ...payload });
        return result.ok
          ? { ok: true }
          : { ok: false, message: MESSAGES[result.reason] ?? 'Submission failed.' };
      }}
    />
  );
}
