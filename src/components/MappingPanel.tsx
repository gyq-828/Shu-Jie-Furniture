import { ArrowLeft, ArrowRight, CheckCircle2, FileSpreadsheet, SlidersHorizontal } from 'lucide-react'
import type { AnalysisOptions, DataSheet, FieldMapping, FieldRole, ParsedWorkbook } from '../types'
import { formatFileSize } from '../lib/format'

interface MappingPanelProps {
  workbook: ParsedWorkbook
  sheetIndex: number
  sheet: DataSheet
  mapping: FieldMapping
  options: AnalysisOptions
  error?: string | null
  onSheetChange: (index: number) => void
  onMappingChange: (mapping: FieldMapping) => void
  onOptionsChange: (options: AnalysisOptions) => void
  onAnalyze: () => void
  onBack: () => void
}

const roleOptions: Array<{ value: FieldRole; label: string }> = [
  { value: 'date', label: '日期 / 时间' },
  { value: 'revenue', label: '成交额' },
  { value: 'visitors', label: '访客数' },
  { value: 'orders', label: '订单数' },
  { value: 'conversion', label: '转化率' },
  { value: 'avgOrderValue', label: '客单价' },
  { value: 'dimension', label: '分类维度' },
  { value: 'metric', label: '其他数值指标' },
  { value: 'ignore', label: '不参与分析' },
]

const uniqueRoles: FieldRole[] = ['date', 'revenue', 'visitors', 'orders', 'conversion', 'avgOrderValue']

export function MappingPanel(props: MappingPanelProps) {
  const { workbook, sheetIndex, sheet, mapping, options } = props

  const updateRole = (column: string, role: FieldRole) => {
    const next = { ...mapping }
    if (uniqueRoles.includes(role)) {
      Object.keys(next).forEach((field) => {
        if (field !== column && next[field] === role) next[field] = next[field] === 'date' ? 'dimension' : 'metric'
      })
    }
    next[column] = role
    props.onMappingChange(next)
  }

  const hasMetric = Object.values(mapping).some((role) => ['revenue', 'visitors', 'orders', 'conversion', 'avgOrderValue', 'metric'].includes(role))

  return (
    <main className="workspace-page">
      <div className="workspace-title-row">
        <div>
          <button className="back-link" type="button" onClick={props.onBack}><ArrowLeft size={16} /> 重新上传</button>
          <h1>确认数据与字段含义</h1>
          <p>系统已自动识别字段。请检查映射，准确的字段含义是可靠分析的前提。</p>
        </div>
        <button className="button primary" type="button" onClick={props.onAnalyze} disabled={!hasMetric}>
          生成分析 <ArrowRight size={17} />
        </button>
      </div>

      <section className="file-summary-bar">
        <span className="file-summary-icon"><FileSpreadsheet size={20} /></span>
        <div><strong>{workbook.fileName}</strong><small>{formatFileSize(workbook.fileSize)} · {sheet.totalRows.toLocaleString('zh-CN')} 行 · {sheet.columns.length} 列</small></div>
        <span className="privacy-chip"><CheckCircle2 size={15} /> 本地解析完成</span>
      </section>

      {props.error && <div className="inline-error mapping-error" role="alert">{props.error}</div>}

      <div className="mapping-layout">
        <section className="main-panel">
          <div className="panel-heading">
            <div><span className="step-kicker">02 / 字段映射</span><h2>告诉系统每列代表什么</h2></div>
            {workbook.sheets.length > 1 && (
              <label className="compact-field">工作表
                <select value={sheetIndex} onChange={(event) => props.onSheetChange(Number(event.target.value))}>
                  {workbook.sheets.map((item, index) => <option key={item.name} value={index}>{item.name}</option>)}
                </select>
              </label>
            )}
          </div>
          <div className="mapping-table-wrap">
            <table className="mapping-table">
              <thead><tr><th>原始字段</th><th>样例值</th><th>分析含义</th></tr></thead>
              <tbody>
                {sheet.columns.map((column) => (
                  <tr key={column}>
                    <td><strong>{column}</strong></td>
                    <td className="sample-value">{String(sheet.rows.find((row) => row[column] !== null)?.[column] ?? '--')}</td>
                    <td>
                      <select aria-label={`${column} 的字段含义`} value={mapping[column] ?? 'ignore'} onChange={(event) => updateRole(column, event.target.value as FieldRole)}>
                        {roleOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="settings-panel">
          <div className="panel-heading compact"><div><SlidersHorizontal size={18} /><h2>预警参数</h2></div></div>
          <p className="settings-note">用于规则预警，不会修改原始数据。</p>
          <label className="form-field"><span>指标下降预警</span><div><input type="number" min="1" max="100" value={options.declineThreshold} onChange={(event) => props.onOptionsChange({ ...options, declineThreshold: Number(event.target.value) })} /><em>%</em></div></label>
          <label className="form-field"><span>转化率参考线</span><div><input type="number" min="0" step="0.1" value={options.conversionBenchmark} onChange={(event) => props.onOptionsChange({ ...options, conversionBenchmark: Number(event.target.value) })} /><em>%</em></div></label>
          <label className="form-field"><span>客单价参考线</span><div><input type="number" min="0" step="10" value={options.avgOrderValueBenchmark} onChange={(event) => props.onOptionsChange({ ...options, avgOrderValueBenchmark: Number(event.target.value) })} /><em>元</em></div></label>
          <div className="settings-tip">家具经营模板默认参考线源于比赛业务背景，可根据实际业务调整。</div>
        </aside>
      </div>
    </main>
  )
}
