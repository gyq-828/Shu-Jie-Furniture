import type { WorkBook } from '@e965/xlsx'
import type { CellValue, DataRow, DataSheet, ParsedWorkbook } from '../types'

export const MAX_FILE_SIZE = 10 * 1024 * 1024
export const MAX_ROWS = 100_000

function normalizeCell(value: unknown): CellValue {
  if (value === undefined || value === null || value === '') return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.trim()
  return String(value)
}

function decodeCsv(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder('gb18030').decode(buffer)
  }
}

function workbookToSheets(workbook: WorkBook, XLSX: typeof import('@e965/xlsx')): DataSheet[] {
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name]
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
      raw: true,
    })
    const rows = rawRows.slice(0, MAX_ROWS).map((row) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim(), normalizeCell(value)])),
    ) as DataRow[]
    const columns = Array.from(new Set(rows.slice(0, 500).flatMap((row) => Object.keys(row))))

    return {
      name,
      rows,
      columns,
      totalRows: rawRows.length,
      truncated: rawRows.length > MAX_ROWS,
    }
  }).filter((sheet) => sheet.columns.length > 0)
}

export async function parseWorkbookFile(file: File): Promise<ParsedWorkbook> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension || !['csv', 'xls', 'xlsx'].includes(extension)) {
    throw new Error('仅支持 CSV、XLS 和 XLSX 文件。')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('文件超过 10 MB，请精简后重试。')
  }

  const buffer = await file.arrayBuffer()
  const XLSX = await import('@e965/xlsx')
  const workbook = extension === 'csv'
    ? XLSX.read(decodeCsv(buffer), { type: 'string', cellDates: true })
    : XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheets = workbookToSheets(workbook, XLSX)

  if (sheets.length === 0) throw new Error('未在文件中识别到可分析的数据表。')

  return { fileName: file.name, fileSize: file.size, sheets }
}
