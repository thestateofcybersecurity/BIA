import { PageHeader } from '@/components/ui';
import { HelpBox } from '@/components/help';
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
      <HelpBox title="CSV rules worth knowing">
        <ul>
          <li>
            <strong>Only "name" is required.</strong> Everything else is optional; you can import
            bare process names first and enrich later, because re-importing updates by name
            instead of duplicating.
          </li>
          <li>
            List cells (the six dependency columns and upstream) use <strong>semicolons</strong>{' '}
            between items; upstream references other rows or existing processes by name.
          </li>
          <li>
            The optional loss and severity columns write the impact assessment in the same pass:
            five loss_* columns take currency amounts, and the twenty severity columns take 0-4.
            Values that shrink over time get raised to the running maximum (impact of an outage
            never decreases as it continues) and flagged as a warning.
          </li>
          <li>Rows with errors are skipped and reported; nothing partial is written for them.</li>
        </ul>
      </HelpBox>
      <ImportClient />
    </>
  );
}
