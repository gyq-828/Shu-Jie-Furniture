export type CellValue = string | number | boolean | null

export type DataRow = Record<string, CellValue>

export interface DataSheet {
  name: string
  rows: DataRow[]
  columns: string[]
  totalRows: number
  truncated: boolean
}

export interface ParsedWorkbook {
  fileName: string
  fileSize: number
  sheets: DataSheet[]
}

export type FieldRole =
  | 'date'
  | 'revenue'
  | 'visitors'
  | 'orders'
  | 'conversion'
  | 'avgOrderValue'
  | 'dimension'
  | 'metric'
  | 'ignore'

export type FieldMapping = Record<string, FieldRole>

export interface AnalysisOptions {
  declineThreshold: number
  conversionBenchmark: number
  avgOrderValueBenchmark: number
}

export type WarningLevel = 'critical' | 'warning' | 'notice'

export interface AnalysisWarning {
  id: string
  level: WarningLevel
  title: string
  detail: string
  recommendation: string
}

export type MetricFormat = 'currency' | 'integer' | 'percent' | 'decimal'

export interface MetricSummary {
  id: string
  label: string
  value: number
  delta: number | null
  format: MetricFormat
  description: string
}

export interface TrendPoint {
  label: string
  value: number
  comparison?: number
}

export interface RankingItem {
  name: string
  value: number
  share: number
}

export interface DataQuality {
  missingCells: number
  missingRate: number
  duplicateRows: number
  validRows: number
  numericColumns: number
}

export interface AnalysisResult {
  title: string
  primaryMetricLabel: string
  primaryMetricFormat: MetricFormat
  metrics: MetricSummary[]
  trend: TrendPoint[]
  rankings: RankingItem[]
  rankingDimension: string | null
  warnings: AnalysisWarning[]
  quality: DataQuality
  analyzedRows: number
  summaryForAi: Record<string, unknown>
}

export interface AiFinding {
  title: string
  evidence: string
  level: WarningLevel
}

export interface AiAction {
  priority: 'P0' | 'P1' | 'P2'
  title: string
  detail: string
}

export interface AiAnalysis {
  overview: string
  findings: AiFinding[]
  actions: AiAction[]
  caveats: string[]
  meta?: AiCallMeta
}

export interface AiCallMeta {
  provider: 'DeepSeek'
  model: string
  requestId: string
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
  completedAt: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
