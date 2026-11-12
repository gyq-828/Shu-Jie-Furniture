import type {
  AnalysisOptions,
  AnalysisResult,
  AnalysisWarning,
  DataRow,
  DataSheet,
  FieldMapping,
  FieldRole,
  MetricFormat,
  MetricSummary,
  RankingItem,
  TrendPoint,
} from '../types'

const rolePatterns: Array<[FieldRole, RegExp]> = [
  ['date', /(^|[^a-z])(日期|时间|周次|月份|日期周|date|time|week|month)/i],
  ['revenue', /(成交额|交易金额|销售额|支付金额|营业额|gmv|revenue|sales)/i],
  ['visitors', /(访客数|访客|流量|uv|visitors?|traffic)/i],
  ['orders', /(支付订单数|订单数|买家数|成交单量|orders?|buyers?)/i],
  ['conversion', /(转化率|支付转化|conversion|cvr)/i],
  ['avgOrderValue', /(客单价|平均订单金额|aov|average.?order)/i],
  ['dimension', /(渠道|商品|产品|地区|类目|类别|名称|channel|product|region|categor)/i],
]

export const defaultOptions: AnalysisOptions = {
  declineThreshold: 10,
  conversionBenchmark: 0.7,
  avgOrderValueBenchmark: 1058,
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const normalized = value.replace(/[¥$,人次单元]/g, '').trim()
  if (!normalized) return null
  const percent = normalized.endsWith('%')
  const parsed = Number(normalized.replace('%', ''))
  if (!Number.isFinite(parsed)) return null
  return percent ? parsed : parsed
}

function looksNumeric(rows: DataRow[], column: string): boolean {
  const values = rows.slice(0, 200).map((row) => row[column]).filter((value) => value !== null)
  if (values.length === 0) return false
  return values.filter((value) => toNumber(value) !== null).length / values.length >= 0.8
}

export function inferFieldMapping(sheet: DataSheet): FieldMapping {
  const mapping: FieldMapping = {}
  const claimed = new Set<FieldRole>()
  const preferredDate = sheet.columns.find((column) => /(^日期$|^date$|时间)/i.test(column))
    ?? sheet.columns.find((column) => rolePatterns[0][1].test(column))

  sheet.columns.forEach((column) => {
    const explicitDimension = /(渠道|来源|商品|产品|地区|类目|类别|名称|channel|source|product|region|categor)/i.test(column)
    const match: [FieldRole, RegExp] | undefined = explicitDimension
      ? ['dimension', /./]
      : rolePatterns.find(([, pattern]) => pattern.test(column))
    if (match) {
      const [role] = match
      if (role === 'date' && column !== preferredDate) {
        mapping[column] = 'dimension'
        return
      }
      if (['date', 'revenue', 'visitors', 'orders', 'conversion', 'avgOrderValue'].includes(role) && claimed.has(role)) {
        mapping[column] = looksNumeric(sheet.rows, column) ? 'metric' : 'dimension'
      } else {
        mapping[column] = role
        claimed.add(role)
      }
    } else {
      mapping[column] = looksNumeric(sheet.rows, column) ? 'metric' : 'dimension'
    }
  })
  return mapping
}

function fieldFor(mapping: FieldMapping, role: FieldRole): string | undefined {
  return Object.keys(mapping).find((column) => mapping[column] === role)
}

function valuesFor(rows: DataRow[], column?: string): number[] {
  if (!column) return []
  return rows.map((row) => toNumber(row[column])).filter((value): value is number => value !== null)
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function average(values: number[]): number {
  return values.length ? sum(values) / values.length : 0
}

function delta(first: number, last: number): number | null {
  return first === 0 ? null : ((last - first) / Math.abs(first)) * 100
}

function metricFormat(role: FieldRole): MetricFormat {
  if (role === 'revenue' || role === 'avgOrderValue') return 'currency'
  if (role === 'conversion') return 'percent'
  if (role === 'visitors' || role === 'orders') return 'integer'
  return 'decimal'
}

function roleLabel(role: FieldRole, fallback: string): string {
  const labels: Partial<Record<FieldRole, string>> = {
    revenue: '成交额', visitors: '访客数', orders: '支付订单',
    conversion: '支付转化率', avgOrderValue: '客单价',
  }
  return labels[role] ?? fallback
}

function aggregateRole(rows: DataRow[], mapping: FieldMapping, role: FieldRole): number {
  const column = fieldFor(mapping, role)
  const revenue = sum(valuesFor(rows, fieldFor(mapping, 'revenue')))
  const visitors = sum(valuesFor(rows, fieldFor(mapping, 'visitors')))
  const orders = sum(valuesFor(rows, fieldFor(mapping, 'orders')))
  if (role === 'conversion' && orders && visitors) return (orders / visitors) * 100
  if (role === 'avgOrderValue' && revenue && orders) return revenue / orders
  const values = valuesFor(rows, column)
  return role === 'conversion' || role === 'avgOrderValue' ? average(values) : sum(values)
}

function groupRows(rows: DataRow[], column?: string): Array<[string, DataRow[]]> {
  if (!column) {
    const size = Math.max(1, Math.ceil(rows.length / 12))
    const groups: Array<[string, DataRow[]]> = []
    for (let index = 0; index < rows.length; index += size) {
      groups.push([`${index + 1}-${Math.min(index + size, rows.length)}`, rows.slice(index, index + size)])
    }
    return groups
  }
  const grouped = new Map<string, DataRow[]>()
  rows.forEach((row) => {
    const raw = row[column]
    const key = raw === null ? '未标记' : String(raw).slice(0, 10)
    grouped.set(key, [...(grouped.get(key) ?? []), row])
  })
  const entries = Array.from(grouped.entries())
  const parseable = entries.every(([key]) => Number.isFinite(Date.parse(key)))
  return parseable ? entries.sort(([a], [b]) => Date.parse(a) - Date.parse(b)) : entries
}

function buildTrend(rows: DataRow[], mapping: FieldMapping, primaryRole: FieldRole, primaryColumn: string): TrendPoint[] {
  const dateColumn = fieldFor(mapping, 'date')
  return groupRows(rows, dateColumn).map(([label, groupedRows]) => ({
    label,
    value: primaryRole === 'metric'
      ? sum(valuesFor(groupedRows, primaryColumn))
      : aggregateRole(groupedRows, mapping, primaryRole),
  }))
}

function buildRankings(rows: DataRow[], mapping: FieldMapping, primaryRole: FieldRole, primaryColumn: string) {
  const dimensions = Object.keys(mapping).filter((column) => mapping[column] === 'dimension')
  const dimension = dimensions.find((column) => /(渠道|来源|channel|source)/i.test(column))
    ?? dimensions.find((column) => /(商品|产品|地区|类目|类别|product|region|categor)/i.test(column))
    ?? dimensions.find((column) => !/(周次|日期|时间|week|date|time)/i.test(column))
    ?? dimensions[0]
  if (!dimension) return { dimension: null, rankings: [] as RankingItem[] }
  const groups = groupRows(rows, dimension)
  const values = groups.map(([name, groupedRows]) => ({
    name,
    value: primaryRole === 'metric'
      ? sum(valuesFor(groupedRows, primaryColumn))
      : aggregateRole(groupedRows, mapping, primaryRole),
  })).sort((a, b) => b.value - a.value).slice(0, 8)
  const total = sum(values.map((item) => item.value))
  return {
    dimension,
    rankings: values.map((item) => ({ ...item, share: total ? (item.value / total) * 100 : 0 })),
  }
}

function buildQuality(rows: DataRow[], columns: string[]) {
  const totalCells = Math.max(1, rows.length * columns.length)
  const missingCells = rows.reduce(
    (total, row) => total + columns.filter((column) => row[column] === null || row[column] === '').length,
    0,
  )
  const seen = new Set<string>()
  let duplicateRows = 0
  rows.forEach((row) => {
    const signature = JSON.stringify(columns.map((column) => row[column]))
    if (seen.has(signature)) duplicateRows += 1
    else seen.add(signature)
  })
  return {
    missingCells,
    missingRate: (missingCells / totalCells) * 100,
    duplicateRows,
    validRows: rows.length - duplicateRows,
    numericColumns: columns.filter((column) => looksNumeric(rows, column)).length,
  }
}

function buildMetrics(rows: DataRow[], mapping: FieldMapping, trend: TrendPoint[]): MetricSummary[] {
  const configured: Array<{ role: FieldRole; field: string | undefined }> = [
    { role: 'revenue', field: fieldFor(mapping, 'revenue') },
    { role: 'visitors', field: fieldFor(mapping, 'visitors') },
    { role: 'conversion', field: fieldFor(mapping, 'conversion') },
    { role: 'avgOrderValue', field: fieldFor(mapping, 'avgOrderValue') },
  ]
  const metrics: MetricSummary[] = configured.filter((item) => item.field).map(({ role, field }) => ({
    id: role,
    label: roleLabel(role, field ?? role),
    value: aggregateRole(rows, mapping, role),
    delta: trend.length > 1 && role === (fieldFor(mapping, 'revenue') ? 'revenue' : role)
      ? delta(trend[0].value, trend.at(-1)?.value ?? 0)
      : null,
    format: metricFormat(role),
    description: role === 'revenue' ? '所有记录汇总' : '根据已映射字段计算',
  }))

  if (metrics.length < 4) {
    Object.keys(mapping).filter((column) => mapping[column] === 'metric').slice(0, 4 - metrics.length).forEach((column) => {
      metrics.push({
        id: column,
        label: column,
        value: sum(valuesFor(rows, column)),
        delta: null,
        format: 'decimal',
        description: '数值字段汇总',
      })
    })
  }
  return metrics.slice(0, 4)
}

function buildWarnings(
  rows: DataRow[], mapping: FieldMapping, trend: TrendPoint[], quality: ReturnType<typeof buildQuality>, options: AnalysisOptions,
): AnalysisWarning[] {
  const warnings: AnalysisWarning[] = []
  if (trend.length > 1) {
    const change = delta(trend[0].value, trend.at(-1)?.value ?? 0)
    if (change !== null && change <= -options.declineThreshold) {
      warnings.push({
        id: 'primary-decline', level: change <= -25 ? 'critical' : 'warning',
        title: `核心指标下降 ${Math.abs(change).toFixed(1)}%`,
        detail: `从首期 ${trend[0].value.toFixed(0)} 下降至末期 ${(trend.at(-1)?.value ?? 0).toFixed(0)}。`,
        recommendation: '优先按时间和分类维度拆分下降贡献，定位损失最大的环节。',
      })
    }
    const recent = trend.slice(-3).map((point) => point.value)
    if (recent.length === 3 && recent[0] > recent[1] && recent[1] > recent[2]) {
      warnings.push({
        id: 'continuous-decline', level: 'warning', title: '指标连续 3 期下降',
        detail: '最近三个观测期均低于前一期，已形成趋势性风险。',
        recommendation: '设置周度跟踪节奏，并为最近一期制定可验证的改善动作。',
      })
    }
  }
  const conversion = aggregateRole(rows, mapping, 'conversion')
  if (fieldFor(mapping, 'conversion') && conversion < options.conversionBenchmark) {
    warnings.push({
      id: 'conversion-low', level: 'warning', title: '转化率低于参考线',
      detail: `当前转化率 ${conversion.toFixed(2)}%，低于 ${options.conversionBenchmark}% 的参考值。`,
      recommendation: '检查低转化渠道、商品详情与价格竞争力，避免继续扩大低质量流量。',
    })
  }
  const avgOrderValue = aggregateRole(rows, mapping, 'avgOrderValue')
  if (fieldFor(mapping, 'avgOrderValue') && avgOrderValue < options.avgOrderValueBenchmark) {
    warnings.push({
      id: 'aov-low', level: 'notice', title: '客单价低于家具模板参考线',
      detail: `当前客单价 ${avgOrderValue.toFixed(0)} 元，低于 ${options.avgOrderValueBenchmark} 元的参考值。`,
      recommendation: '评估高配款引导、组合销售和价格带结构。',
    })
  }
  if (quality.missingRate > 5) {
    warnings.push({
      id: 'missing-data', level: quality.missingRate > 20 ? 'critical' : 'notice', title: '数据缺失率偏高',
      detail: `${quality.missingCells} 个单元格缺失，占比 ${quality.missingRate.toFixed(1)}%。`,
      recommendation: '在采纳结论前确认缺失是否集中在关键指标或特定时间段。',
    })
  }
  if (quality.duplicateRows > 0) {
    warnings.push({
      id: 'duplicates', level: 'notice', title: '检测到重复记录',
      detail: `共有 ${quality.duplicateRows} 行与已有记录完全相同。`,
      recommendation: '确认重复行是业务真实记录还是导出问题，必要时去重后重新分析。',
    })
  }
  if (warnings.length === 0) {
    warnings.push({
      id: 'stable', level: 'notice', title: '未发现明显高风险异常',
      detail: '当前规则和阈值下，数据表现总体稳定。',
      recommendation: '继续按固定周期追踪，并结合更多业务维度完善判断。',
    })
  }
  return warnings
}

export function analyzeSheet(sheet: DataSheet, mapping: FieldMapping, options: AnalysisOptions): AnalysisResult {
  const includedColumns = sheet.columns.filter((column) => mapping[column] !== 'ignore')
  const revenue = fieldFor(mapping, 'revenue')
  const firstMetric = Object.keys(mapping).find((column) => mapping[column] === 'metric')
  const fallbackNumeric = includedColumns.find((column) => looksNumeric(sheet.rows, column))
  const primaryColumn = revenue ?? firstMetric ?? fallbackNumeric
  if (!primaryColumn) throw new Error('至少需要映射一个数值指标后才能分析。')
  const primaryRole: FieldRole = revenue ? 'revenue' : 'metric'
  const primaryLabel = revenue ? '成交额' : primaryColumn
  const trend = buildTrend(sheet.rows, mapping, primaryRole, primaryColumn)
  const quality = buildQuality(sheet.rows, includedColumns)
  const metrics = buildMetrics(sheet.rows, mapping, trend)
  const { dimension, rankings } = buildRankings(sheet.rows, mapping, primaryRole, primaryColumn)
  const warnings = buildWarnings(sheet.rows, mapping, trend, quality, options)
  const primaryFormat = revenue ? 'currency' : 'decimal'

  return {
    title: `${sheet.name} 智能诊断`,
    primaryMetricLabel: primaryLabel,
    primaryMetricFormat: primaryFormat,
    metrics,
    trend,
    rankings,
    rankingDimension: dimension,
    warnings,
    quality,
    analyzedRows: sheet.rows.length,
    summaryForAi: {
      context: '商务经营数据分析，如存在成交额、访客数、转化率等字段，优先从流量、转化和客单价解释。',
      rows: sheet.rows.length,
      fields: Object.entries(mapping).filter(([, role]) => role !== 'ignore').map(([field, role]) => ({ field, role })),
      metrics: metrics.map((metric) => ({ label: metric.label, value: metric.value, deltaPercent: metric.delta })),
      trend: trend.slice(-20),
      rankingDimension: dimension,
      topRanking: rankings.slice(0, 8),
      warnings: warnings.map(({ level, title, detail }) => ({ level, title, detail })),
      dataQuality: quality,
      note: '原始文件未上传，本摘要由浏览器端确定性计算生成。',
    },
  }
}
