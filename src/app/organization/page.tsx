import { loadWorkspace } from '@/lib/actions';
import { PageHeader, Card } from '@/components/ui';
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
