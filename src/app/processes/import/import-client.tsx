'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { importCsv, type ImportResult } from '@/lib/actions';
import { parseCsvRecord, csvTemplate, CSV_COLUMNS, type ParsedRow } from '@/lib/domain/csv';
import { Card, btn, StatusPill } from '@/components/ui';

export function ImportClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [fileName, setFileName] = useState<string | null>(null);
  const [records, setRecords] = useState<Record<string, string>[]>([]);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const applyRecords = (name: string, data: Record<string, string>[]) => {
    setFileName(name);
    setRecords(data);
    setPreview(data.map((r, i) => parseCsvRecord(r, i + 2)));
  };

  const handleFile = async (file: File) => {
    setResult(null);
    setParseError(null);
    const isExcel = /\.xlsx?$/i.test(file.name);
    if (isExcel) {
      try {
        const { parseXlsxToRecords } = await import('@/lib/xlsx');
        const data = await parseXlsxToRecords(await file.arrayBuffer());
        if (data.length === 0) {
          setParseError('No data rows found below the header row.');
          return;
        }
        applyRecords(file.name, data);
      } catch (e) {
        setParseError(e instanceof Error ? e.message : 'Could not read the workbook.');
      }
      return;
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: ({ data, errors }) => {
        if (errors.length > 0 && data.length === 0) {
          setParseError(`Could not parse the file: ${errors[0].message}`);
          return;
        }
        applyRecords(file.name, data);
      },
      error: (err) => setParseError(`Could not read the file: ${err.message}`),
    });
  };

  const download = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcelTemplate = async () => {
    const { buildTemplateWorkbook } = await import('@/lib/xlsx');
    const buffer = await buildTemplateWorkbook();
    download(
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      'bia-import-template.xlsx'
    );
  };

  const downloadCsvTemplate = () => {
    download(new Blob([csvTemplate()], { type: 'text/csv' }), 'bia-import-template.csv');
  };

  const errorCount = preview.filter((r) => r.errors.length > 0).length;
  const importable = preview.length - errorCount;

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="1 · Get the template"
        subtitle="The Excel workbook includes a Column reference sheet; hand it to process owners to fill in"
      >
        <div className="flex flex-wrap items-center gap-3">
          <button className={btn.primary} onClick={downloadExcelTemplate}>
            Download Excel template
          </button>
          <button className={btn.secondary} onClick={downloadCsvTemplate}>
            CSV template
          </button>
          <p className="text-xs text-ink-muted">
            {CSV_COLUMNS.filter((c) => c.required).length} required column,{' '}
            {CSV_COLUMNS.length - 1} optional (dependencies, upstream, losses, severities 0-4).
          </p>
        </div>
      </Card>

      <Card title="2 · Upload and review">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button className={btn.primary} onClick={() => inputRef.current?.click()}>
            Choose Excel or CSV file
          </button>
          {fileName && (
            <span className="font-mono text-xs text-ink-soft">
              {fileName} · {preview.length} row{preview.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        {parseError && (
          <p className="mt-3 rounded bg-bad/10 px-3 py-2 text-xs text-bad">{parseError}</p>
        )}

        {preview.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  {['Process', 'Owner', 'Dependencies', 'Assessment data', 'Status'].map((h) => (
                    <th
                      key={h}
                      className="pb-2 pr-4 font-mono text-[10px] font-normal uppercase tracking-wider text-ink-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => {
                  const depCount = Object.values(row.dependencies).reduce(
                    (s, list) => s + list.length,
                    0
                  );
                  return (
                    <tr key={i} className="border-b border-line/60 align-top last:border-0">
                      <td className="py-2 pr-4 font-medium">{row.name || `(row ${i + 2})`}</td>
                      <td className="py-2 pr-4 text-ink-soft">{row.owner || '·'}</td>
                      <td className="tnum py-2 pr-4 text-ink-soft">{depCount}</td>
                      <td className="py-2 pr-4">
                        {row.hasAssessment ? (
                          <StatusPill tone="ok">Included</StatusPill>
                        ) : (
                          <StatusPill tone="neutral">None</StatusPill>
                        )}
                      </td>
                      <td className="py-2">
                        {row.errors.length > 0 ? (
                          <div>
                            <StatusPill tone="bad">Error</StatusPill>
                            {row.errors.map((e, j) => (
                              <p key={j} className="mt-1 text-xs text-bad">{e}</p>
                            ))}
                          </div>
                        ) : row.warnings.length > 0 ? (
                          <div>
                            <StatusPill tone="warn">Adjusted</StatusPill>
                            {row.warnings.map((w, j) => (
                              <p key={j} className="mt-1 text-xs text-warn">{w}</p>
                            ))}
                          </div>
                        ) : (
                          <StatusPill tone="ok">Ready</StatusPill>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {preview.length > 0 && (
        <Card title="3 · Import">
          <div className="flex flex-wrap items-center gap-3">
            <button
              className={btn.primary}
              disabled={pending || importable === 0}
              onClick={() =>
                start(async () => {
                  const res = await importCsv(records);
                  setResult(res);
                  router.refresh();
                })
              }
            >
              {pending
                ? 'Importing…'
                : `Import ${importable} process${importable === 1 ? '' : 'es'}`}
            </button>
            {errorCount > 0 && (
              <span className="text-xs text-bad">
                {errorCount} row{errorCount === 1 ? '' : 's'} with errors will be skipped.
              </span>
            )}
          </div>

          {result && (
            <div className="mt-4 rounded-md border border-line bg-paper/60 p-4 text-sm">
              <p>
                <span className="font-medium">{result.created}</span> created,{' '}
                <span className="font-medium">{result.updated}</span> updated,{' '}
                <span className="font-medium">{result.assessments}</span> impact assessment
                {result.assessments === 1 ? '' : 's'} written.
              </p>
              {result.warnings.length > 0 && (
                <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-xs text-warn">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
              <Link href="/processes" className="mt-3 inline-block text-xs text-accent hover:underline">
                Go to processes →
              </Link>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
