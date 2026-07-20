import { PageHeader } from '@/components/ui';
import { ImportClient } from './import-client';

export const dynamic = 'force-dynamic';

export default function ImportPage() {
  return (
    <>
      <PageHeader
        kicker="Step 02 · Bulk import"
        title="Import processes from CSV"
        intro="One row per process. Existing processes are matched by name and updated, so you can re-import a corrected file safely. Dependency and upstream cells take semicolon-separated lists; the optional loss and severity columns create the impact assessment in the same pass."
      />
      <ImportClient />
    </>
  );
}
