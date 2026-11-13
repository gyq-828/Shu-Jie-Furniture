import type { AnalysisResult } from '../types'
import { formatMetric } from './format'

export interface LeadFinding {
  title: string
  body: string
  changePercent: number | null
  evidenceLabel: string
  evidenceValue: string
}

export function buildLeadFinding(result: AnalysisResult): LeadFinding {
  const first = result.trend[0]
  const last = result.trend.at(-1)
  const changePercent = first && last && first.value !== 0
    ? ((last.value - first.value) / Math.abs(first.value)) * 100
    : null

  if (first && last && result.trend.length > 1 && changePercent !== null) {
    const direction = changePercent <= -1 ? '下降' : changePercent >= 1 ? '上升' : '基本持平'
    const title = `${result.primaryMetricLabel}${direction}${Math.abs(changePercent).toFixed(1)}%`
    const body = direction === '基本持平'
      ? `观测区间从 ${formatMetric(first.value, result.primaryMetricFormat)} 变为 ${formatMetric(last.value, result.primaryMetricFormat)}，首末期变化不足 1%。当前数据不显示明显趋势性波动。`
      : `观测区间从 ${formatMetric(first.value, result.primaryMetricFormat)} 变为 ${formatMetric(last.value, result.primaryMetricFormat)}，首末期变化 ${changePercent.toFixed(1)}%。这是对趋势的描述，单凭这组数据不能判定下降原因。`

    return {
      title,
      body,
      changePercent,
      evidenceLabel: `${first.label} → ${last.label}`,
      evidenceValue: `${formatMetric(first.value, result.primaryMetricFormat)} → ${formatMetric(last.value, result.primaryMetricFormat)}`,
    }
  }

  const leader = result.rankings[0]
  if (leader) {
    return {
      title: `${leader.name} 是最高贡献项`,
      body: `按 ${result.rankingDimension ?? '分类维度'} 汇总，${leader.name} 的 ${result.primaryMetricLabel} 为 ${formatMetric(leader.value, result.primaryMetricFormat)}，占当前所列项合计的 ${leader.share.toFixed(1)}%。`,
      changePercent: null,
      evidenceLabel: result.rankingDimension ?? '分类维度',
      evidenceValue: formatMetric(leader.value, result.primaryMetricFormat),
    }
  }

  return {
    title: `已完成 ${result.analyzedRows.toLocaleString('zh-CN')} 行记录的统计`,
    body: `当前字段映射下，${result.primaryMetricLabel} 合计为 ${formatMetric(result.metrics[0]?.value ?? 0, result.metrics[0]?.format ?? result.primaryMetricFormat)}。缺少可用的时间或分类分组，暂时不能判断趋势。`,
    changePercent: null,
    evidenceLabel: '记录数',
    evidenceValue: result.analyzedRows.toLocaleString('zh-CN'),
  }
}
