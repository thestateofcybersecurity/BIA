import { loadWorkspace } from '@/lib/actions';
import { PageHeader } from '@/components/ui';
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
      <MaturityClient initial={ws.maturity} />
    </>
  );
}
