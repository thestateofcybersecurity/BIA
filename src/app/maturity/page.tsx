import { loadWorkspace } from '@/lib/actions';
import { ALL_QUESTIONS } from '@/lib/domain/maturity';
import { maturityEvidence } from '@/lib/domain/maturity-evidence';
import { PageHeader } from '@/components/ui';
import { HelpBox } from '@/components/help';
import { MaturityClient } from './maturity-client';

export const dynamic = 'force-dynamic';

export default async function MaturityPage() {
  const ws = await loadWorkspace();
  const evidence = maturityEvidence(ws);
  return (
    <>
      <PageHeader
        kicker="Step 09"
        title="Program maturity"
        intro={`A ${ALL_QUESTIONS.length}-question self-assessment across eight ISO 22301 domains, scored on an anchored 0-5 capability scale. Where this workspace holds evidence for a practice, the level your data demonstrates is shown beside the question, so ratings can be checked rather than taken on trust.`}
      />
      <HelpBox title="Scoring yourself honestly">
        <ul>
          <li>
            Every answer uses the same anchored capability scale (shown at right): the difference
            between 2 Repeatable and 3 Defined is <strong>documentation and communication</strong>,
            and between 3 and 4 it is <strong>measurement and review</strong>. If nothing is
            written down, the ceiling is 1.
          </li>
          <li>
            The BIA, Risk Assessment, and Continuity Strategies domains carry{' '}
            <strong>1.5x weight</strong> in the overall score. The first two are the two halves of
            ISO 22301 clause 8.2; a program with weak analysis and no strategies is weak regardless
            of its paperwork.
          </li>
          <li>
            <strong>Evidence is a floor, not a verdict.</strong> Questions this workspace can speak
            to show the level your data demonstrates, drawn from your assessments, register,
            plan, and exercise history. A higher rating may be perfectly legitimate, since the app
            cannot see training records, board minutes, or documents kept elsewhere. A rating two
            or more levels above the evidence is flagged so you can point at the proof or lower the
            score. Level 5 is never evidenced from data.
          </li>
          <li>
            Answers save incrementally; you can score one domain per meeting. The roadmap always
            lists the weakest domains first as the suggested improvement order.
          </li>
          <li>
            After each tabletop exercise, revisit this page: the after-action report&apos;s maturity
            signals are written as evidence for exactly these questions.
          </li>
        </ul>
      </HelpBox>
      <MaturityClient initial={ws.maturity} evidence={evidence} />
    </>
  );
}
