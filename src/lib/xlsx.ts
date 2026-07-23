import ExcelJS from 'exceljs';
import { CSV_COLUMNS, TEMPLATE_EXAMPLE } from '@/lib/domain/csv';

/**
 * Excel import/export for the process inventory. Parsed workbooks feed the
 * exact same record pipeline as CSV (see src/lib/domain/csv.ts), so
 * validation, monotonic auto-fix, and upsert-by-name behave identically.
 * Loaded via dynamic import so exceljs stays out of the main bundle.
 */

const INK = 'FF1B2430';
const ACCENT = 'FFBC4A1B';
const PAPER = 'FFF5F2EA';

export async function buildTemplateWorkbook(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BIA Platform';

  const ws = wb.addWorksheet('Processes', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.columns = CSV_COLUMNS.map((c) => ({
    header: c.name,
    key: c.name,
    width: Math.max(12, Math.min(30, c.name.length + 6)),
  }));

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };
  headerRow.height = 20;

  const example = ws.addRow(TEMPLATE_EXAMPLE);
  example.font = { italic: true, color: { argb: 'FF6B7280' }, size: 10 };
  example.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PAPER } };

  // Reference sheet: what every column means.
  const ref = wb.addWorksheet('Column reference', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  ref.columns = [
    { header: 'Column', key: 'col', width: 24 },
    { header: 'Required', key: 'req', width: 10 },
    { header: 'Description', key: 'desc', width: 80 },
  ];
  const refHeader = ref.getRow(1);
  refHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  refHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT } };
  for (const c of CSV_COLUMNS) {
    ref.addRow([c.name, c.required ? 'Yes' : 'No', c.description]);
  }
  ref.addRow([]);
  ref.addRow(['', '', 'Notes: list cells use semicolons between items. Severity columns take 0-4.']);
  ref.addRow(['', '', 'The example row on the Processes sheet is imported like any other; delete it before importing real data.']);

  return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v == null) return '';
  if (typeof v === 'object' && 'result' in v && v.result != null) return String(v.result);
  if (typeof v === 'object' && 'richText' in v) {
    return (v.richText as { text: string }[]).map((r) => r.text).join('');
  }
  return String(cell.text ?? v).trim();
}

export async function parseXlsxToRecords(
  buffer: ArrayBuffer
): Promise<Record<string, string>[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  // Prefer a sheet named like the template; fall back to the first sheet.
  const ws =
    wb.worksheets.find((w) => w.name.trim().toLowerCase() === 'processes') ??
    wb.worksheets[0];
  if (!ws) throw new Error('The workbook has no worksheets.');

  const headers: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = cellText(cell).toLowerCase();
  });
  if (!headers.some((h) => h === 'name')) {
    throw new Error(
      `Could not find a "name" header in row 1 of sheet "${ws.name}". Use the template's column names.`
    );
  }

  const records: Record<string, string>[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: Record<string, string> = {};
    let hasValue = false;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = headers[colNumber];
      if (!key) return;
      const text = cellText(cell);
      record[key] = text;
      if (text !== '') hasValue = true;
    });
    if (hasValue) records.push(record);
  });
  return records;
}
