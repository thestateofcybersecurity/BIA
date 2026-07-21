import { loadWorkspace } from '@/lib/actions';
import { PageHeader } from '@/components/ui';
import { HelpBox } from '@/components/help';
import { MaturityClient } from './maturity-client';

export const dynamic = 'force-dynamic';

export default async function MaturityPage() {
  const ws = await loadWorkspace();
  return (
    <>
      <PageHeader
        kicker="Step 06"
        title="Program maturity"
        intro="A 37-question self-assessment across eight ISO 22301 domains, scored on an anchored 0-5 capability scale. BIA and continuity strategy domains carry extra weight in the overall score; the weakest domains form your improvement roadmap."
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
            The BIA and Continuity Strategies domains carry <strong>1.5x weight</strong> in the
            overall score, because a program with weak analysis and no strategies is weak
            regardless of its paperwork.
          </li>
          <li>
            Answers save incrementally; you can score one domain per meeting. The roadmap always
            lists the weakest domains first as the suggested improvement order.
          </li>
          <li>
            After each tabletop exercise, revisit this page: the after-action report's maturity
            signals are written as evidence for exactly these questions.
          </li>
        </ul>
      </HelpBox>
      <MaturityClient initial={ws.maturity} />
    </>
  );
}
