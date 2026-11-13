import { ArrowRight, BarChart3, CircleAlert, CircleCheck, Info, ListChecks } from 'lucide-react'
import type { AnalysisResult, WarningLevel } from '../types'
import { buildLeadFinding } from '../lib/narrative'
import { formatMetric } from '../lib/format'

interface InsightsViewProps {
  result: AnalysisResult
  onDashboard: () => void
  onAdvisor: () => void
}

const levelLabel: Record<WarningLevel, string> = {
  critical: '高风险',
  warning: '需关注',
  notice: '提示',
}

const levelIcon = {
  critical: CircleAlert,
  warning: CircleAlert,
  notice: CircleCheck,
}

export function InsightsView({ result, onDashboard, onAdvisor }: InsightsViewProps) {
  const lead = buildLeadFinding(result)
  const supportingMetrics = result.metrics.filter((metric) => metric.id !== 'revenue').slice(0, 3)

  return (
    <div className="insights-view">
      <section className="lead-finding" aria-labelledby="lead-title">
        <div className="lead-kicker"><span className="status-mark" /> 首要发现 <span className="source-label">规则分析</span></div>
        <h2 id="lead-title">{lead.title}</h2>
        <p className="lead-body">{lead.body}</p>
        <div className="lead-evidence">
          <span>{lead.evidenceLabel}</span>
          <strong>{lead.evidenceValue}</strong>
          {lead.changePercent !== null && (
            <span className={`evidence-delta ${lead.changePercent < 0 ? 'negative' : lead.changePercent > 0 ? 'positive' : ''}`}>
              {lead.changePercent > 0 ? '+' : ''}{lead.changePercent.toFixed(1)}%
            </span>
          )}
        </div>
        <div className="lead-actions">
          <button className="button primary" type="button" onClick={onDashboard}><BarChart3 size={16} /> 查看数据仪表板 <ArrowRight size={16} /></button>
          <button className="button secondary" type="button" onClick={onAdvisor}>请 AI 补充解读</button>
        </div>
      </section>

      <section className="supporting-findings" aria-labelledby="supporting-title">
        <div className="section-heading-line">
          <div><span className="section-index">01</span><h2 id="supporting-title">数据证据</h2></div>
          <span className="section-caption">{result.analyzedRows.toLocaleString('zh-CN')} 条记录</span>
        </div>
        {supportingMetrics.length > 0 && (
          <div className="evidence-metrics">
            {supportingMetrics.map((metric) => (
              <div className="evidence-metric" key={metric.id}>
                <span>{metric.label}</span>
                <strong>{formatMetric(metric.value, metric.format)}</strong>
                {metric.delta !== null && <small className={metric.delta < 0 ? 'negative' : 'positive'}>{metric.delta > 0 ? '+' : ''}{metric.delta.toFixed(1)}%</small>}
              </div>
            ))}
          </div>
        )}
        <div className="quality-note">
          <Info size={16} />
          <span>{result.quality.missingRate.toFixed(1)}% 缺失单元格 · {result.quality.duplicateRows} 行完全重复 · {result.quality.validRows.toLocaleString('zh-CN')} 行非重复记录</span>
        </div>
      </section>

      <section className="warning-findings" aria-labelledby="warnings-title">
        <div className="section-heading-line">
          <div><span className="section-index">02</span><h2 id="warnings-title">需核实的信号</h2></div>
          <span className="section-caption">基于当前阈值</span>
        </div>
        <div className="text-finding-list">
          {result.warnings.slice(0, 4).map((warning, index) => {
            const Icon = levelIcon[warning.level]
            return (
              <article className={`text-finding ${warning.level}`} key={warning.id}>
                <span className="finding-number">{String(index + 1).padStart(2, '0')}</span>
                <Icon size={17} aria-hidden="true" />
                <div className="text-finding-copy">
                  <div><span className={`signal-label ${warning.level}`}>{levelLabel[warning.level]}</span><strong>{warning.title}</strong></div>
                  <p>{warning.detail}</p>
                </div>
                <div className="finding-recommendation"><span><ListChecks size={14} /> 可检查动作</span><p>{warning.recommendation}</p></div>
              </article>
            )
          })}
        </div>
      </section>

      <p className="method-note">本页结论来自浏览器内的指标计算与规则。它描述数据现象，不单独构成因果判断。</p>
    </div>
  )
}
