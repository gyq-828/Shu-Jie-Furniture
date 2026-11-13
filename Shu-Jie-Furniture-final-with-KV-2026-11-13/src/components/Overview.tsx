import { AlertTriangle, ArrowDownRight, ArrowUpRight, CircleCheck, Database, Info, Rows3 } from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { AnalysisResult, WarningLevel } from '../types'
import { formatMetric } from '../lib/format'

interface OverviewProps {
  result: AnalysisResult
}

const levelMeta: Record<WarningLevel, { label: string; icon: typeof AlertTriangle }> = {
  critical: { label: '高风险', icon: AlertTriangle },
  warning: { label: '需关注', icon: Info },
  notice: { label: '提示', icon: CircleCheck },
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function Overview({ result }: OverviewProps) {
  return (
    <div className="dashboard-stack">
      <section className="metric-grid" aria-label="核心指标">
        {result.metrics.map((metric) => (
          <article className="metric-card" key={metric.id}>
            <div className="metric-label"><span>{metric.label}</span><Database size={16} /></div>
            <strong>{formatMetric(metric.value, metric.format)}</strong>
            <div className="metric-foot">
              {metric.delta !== null ? (
                <span className={metric.delta >= 0 ? 'delta positive' : 'delta negative'}>
                  {metric.delta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {Math.abs(metric.delta).toFixed(1)}% 首末期变化
                </span>
              ) : <span>{metric.description}</span>}
            </div>
          </article>
        ))}
      </section>

      <section className="chart-grid">
        <article className="chart-panel trend-panel">
          <div className="panel-heading">
            <div><span className="step-kicker">趋势诊断</span><h2>{result.primaryMetricLabel}变化</h2></div>
            <span className="data-count"><Rows3 size={15} /> {result.analyzedRows.toLocaleString('zh-CN')} 行</span>
          </div>
          <div className="chart-area" role="img" aria-label={`${result.primaryMetricLabel}趋势图`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.trend} margin={{ top: 12, right: 18, left: -12, bottom: 4 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} minTickGap={20} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={compactNumber} width={58} />
                <Tooltip formatter={(value) => [formatMetric(Number(value), result.primaryMetricFormat), result.primaryMetricLabel]} contentStyle={{ borderRadius: 3, border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }} />
                <Line isAnimationActive={false} type="monotone" dataKey="value" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 2.5, fill: '#ffffff', stroke: 'var(--series-1)', strokeWidth: 1.5 }} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="chart-panel ranking-panel">
          <div className="panel-heading">
            <div><span className="step-kicker">结构分析</span><h2>{result.rankingDimension ? `${result.rankingDimension} 贡献` : '分类贡献'}</h2></div>
          </div>
          {result.rankings.length ? (
            <div className="chart-area" role="img" aria-label={`${result.rankingDimension}排名图`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.rankings} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={compactNumber} />
                  <YAxis type="category" dataKey="name" width={82} tickLine={false} axisLine={false} tick={{ fill: 'var(--text)', fontSize: 11 }} tickFormatter={(value) => String(value).length > 7 ? `${String(value).slice(0, 7)}…` : String(value)} />
                  <Tooltip formatter={(value) => [formatMetric(Number(value), result.primaryMetricFormat), result.primaryMetricLabel]} contentStyle={{ borderRadius: 3, border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }} />
                  <Bar isAnimationActive={false} dataKey="value" radius={[0, 2, 2, 0]} barSize={13}>
                    {result.rankings.map((item, index) => <Cell key={item.name} fill={`var(--series-${(index % 10) + 1})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="empty-chart"><Info size={20} /><span>映射分类字段后可生成结构排名。</span></div>}
        </article>
      </section>

      <section className="warnings-section">
        <div className="section-title-row">
          <div><span className="step-kicker">规则引擎</span><h2>指标预警</h2></div>
          <span>{result.warnings.length} 项诊断结果</span>
        </div>
        <div className="warning-list">
          {result.warnings.map((warning) => {
            const Icon = levelMeta[warning.level].icon
            return (
              <article className={`warning-row ${warning.level}`} key={warning.id}>
                <span className="warning-icon"><Icon size={18} /></span>
                <div className="warning-main"><div><span className="level-label">{levelMeta[warning.level].label}</span><strong>{warning.title}</strong></div><p>{warning.detail}</p></div>
                <div className="warning-action"><span>建议动作</span><p>{warning.recommendation}</p></div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="quality-strip" aria-label="数据质量">
        <div><strong>{result.quality.missingRate.toFixed(1)}%</strong><span>缺失率</span></div>
        <div><strong>{result.quality.duplicateRows}</strong><span>重复记录</span></div>
        <div><strong>{result.quality.numericColumns}</strong><span>数值字段</span></div>
        <div><strong>{result.quality.validRows.toLocaleString('zh-CN')}</strong><span>有效记录</span></div>
      </section>
    </div>
  )
}
