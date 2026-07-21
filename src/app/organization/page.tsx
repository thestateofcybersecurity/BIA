import { loadWorkspace } from '@/lib/actions';
import { PageHeader, Card } from '@/components/ui';
import { HelpBox } from '@/components/help';
import { OrgForm } from './org-form';
import {
  LoadSampleButton,
  ResetButton,
  ExportButton,
  ImportButton,
} from '@/components/workspace-buttons';

export const dynamic = 'force-dynamic';

export default async function OrganizationPage() {
  const ws = await loadWorkspace();

  return (
    <>
      <PageHeader
        kicker="Step 01"
        title="Organization profile"
        intro="The profile calibrates the methodology to your organization: financial severity bands scale with annual revenue and risk appetite, so the same loss reads differently for a $5M firm and a $5B firm."
      />

      <HelpBox title="Why the profile matters">
        <ul>
          <li>
            <strong>Annual revenue sets the financial severity bands.</strong> A loss is rated by
            its share of revenue (0.01% / 0.05% / 0.25% / 1% at Moderate appetite), so the same
            dollar figure reads differently for a $5M firm and a $5B firm. The preview below the
            form shows your exact bands.
          </li>
          <li>
            <strong>Risk appetite scales the bands.</strong> Conservative halves the thresholds
            (losses count as severe sooner); Aggressive doubles them.
          </li>
          <li>
            Severities are <strong>computed live, never stored</strong>: if you update revenue or
            appetite later, every financial rating, MTPD, and tier re-derives instantly without
            re-entering assessments.
          </li>
          <li>
            Industry and regulatory context flow into the BC plan report and tailor the tabletop
            exercises.
          </li>
        </ul>
      </HelpBox>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OrgForm initial={ws.org} />
        </div>

        <div className="flex flex-col gap-6">
          <Card
            title="Workspace data"
            subtitle="Everything lives in one workspace document"
          >
            <div className="flex flex-wrap gap-2">
              <LoadSampleButton variant="secondary" />
              <ExportButton />
              <ImportButton />
              <ResetButton />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-ink-muted">
              The sample workspace models Lakeside Mutual, a fictional $180M
              regional insurer, with eight processes assessed end to end. Loading
              it replaces the current workspace.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
