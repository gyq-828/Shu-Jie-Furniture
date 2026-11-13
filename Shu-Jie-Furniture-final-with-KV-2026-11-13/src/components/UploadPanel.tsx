import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { ArrowRight, BarChart3, Bot, CheckCircle2, FileSpreadsheet, FileText, LockKeyhole, UploadCloud } from 'lucide-react'

interface UploadPanelProps {
  isLoading: boolean
  error: string | null
  onFile: (file: File) => void
  onLoadSample: () => void
}

export function UploadPanel({ isLoading, error, onFile, onLoadSample }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onFile(file)
    event.target.value = ''
  }

  const dropFile = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  return (
    <main className="upload-page">
      <aside className="home-rail" aria-label="分析流程">
        <div className="rail-label">分析流程</div>
        <ol className="workflow-steps">
          <li className="active"><span>1</span><div><strong>导入数据</strong><small>CSV、Excel 文件</small></div></li>
          <li><span>2</span><div><strong>确认字段</strong><small>自动识别业务含义</small></div></li>
          <li><span>3</span><div><strong>查看诊断</strong><small>结论、图表与预警</small></div></li>
        </ol>
        <div className="rail-privacy">
          <LockKeyhole size={16} />
          <div><strong>本地解析</strong><p>原始表格不上传，仅分析摘要用于 AI 解读。</p></div>
        </div>
      </aside>

      <div className="upload-content">
        <header className="upload-titlebar">
          <div>
            <span className="breadcrumb">数据工作区 / 新建分析</span>
            <h1>新建经营分析</h1>
            <p>导入业务数据，系统将先输出可核验的经营结论，再生成仪表板与 AI 建议。</p>
          </div>
          <span className="local-status"><CheckCircle2 size={15} /> 数据在浏览器内处理</span>
        </header>

        <div className="analysis-start-grid">
          <section className="import-panel" aria-labelledby="upload-title">
            <div className="section-heading">
              <div>
                <span className="step-kicker">数据源</span>
                <h2 id="upload-title">导入经营数据</h2>
              </div>
              <span className="format-badge">CSV · XLS · XLSX</span>
            </div>

            <div
              className={`drop-zone ${dragging ? 'is-dragging' : ''}`}
              onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={dropFile}
            >
              <input ref={inputRef} type="file" accept=".csv,.xls,.xlsx" onChange={selectFile} hidden />
              <span className="drop-icon"><UploadCloud size={25} /></span>
              <strong>{isLoading ? '正在解析数据…' : '拖放文件到此处，或从电脑中选择'}</strong>
              <p>单个文件不超过 10 MB，最多分析 100,000 行</p>
              <button className="button primary" type="button" disabled={isLoading} onClick={() => inputRef.current?.click()}>
                <FileSpreadsheet size={17} /> 选择数据文件
              </button>
            </div>

            {error && <div className="inline-error" role="alert">{error}</div>}

            <div className="sample-row">
              <div><strong>没有可用文件？</strong><p>使用内置的枢界家具近 5 周经营数据。</p></div>
              <button className="button text-button" type="button" onClick={onLoadSample}>打开示例 <ArrowRight size={16} /></button>
            </div>
          </section>

          <aside className="output-panel" aria-labelledby="output-title">
            <div className="panel-caption">分析输出</div>
            <h2 id="output-title">一份数据，三个视角</h2>
            <div className="output-list">
              <article><span><FileText size={17} /></span><div><strong>经营诊断</strong><p>先给出主要变化、证据和需核实信号。</p></div></article>
              <article><span><BarChart3 size={17} /></span><div><strong>数据仪表板</strong><p>按时间、渠道与商品展开指标细节。</p></div></article>
              <article><span><Bot size={17} /></span><div><strong>AI 经营顾问</strong><p>基于数据摘要补充解读和行动建议。</p></div></article>
            </div>
            <div className="output-note"><CheckCircle2 size={15} /><span>系统会在下一步请你确认字段含义，避免错误分析。</span></div>
          </aside>
        </div>

        <section className="result-preview" aria-labelledby="preview-title">
          <div className="preview-heading">
            <div><span className="preview-label">结果示例</span><h2 id="preview-title">分析先给结论，再展开证据</h2></div>
            <button className="preview-link" type="button" onClick={onLoadSample}>使用示例数据体验 <ArrowRight size={15} /></button>
          </div>
          <div className="preview-grid">
            <article className="preview-finding">
              <div className="preview-kicker"><span /> 首要发现 <em>规则分析</em></div>
              <h3>核心流量渠道连续走弱，正在放大成交下滑</h3>
              <p>手淘搜索访客连续两周下降，建议先核查关键词排名和投放调整，再判断是否扩大预算。</p>
              <div className="preview-evidence"><span>近两周访客变化</span><strong>-32.8%</strong><small>需关注</small></div>
            </article>
            <div className="preview-metrics" aria-label="示例指标">
              <div><span>成交额</span><strong>¥13.6万</strong><small className="negative">-18.4%</small></div>
              <div><span>访客数</span><strong>12,782</strong><small className="negative">-21.7%</small></div>
              <div><span>支付转化率</span><strong>0.86%</strong><small className="positive">+0.04%</small></div>
            </div>
            <div className="preview-breakdown">
              <div className="breakdown-head"><strong>渠道访客贡献</strong><span>最近 5 周</span></div>
              <div className="breakdown-row"><span>手淘搜索</span><i><b style={{ width: '78%' }} /></i><em>43%</em></div>
              <div className="breakdown-row"><span>直通车</span><i><b style={{ width: '52%' }} /></i><em>28%</em></div>
              <div className="breakdown-row"><span>手淘推荐</span><i><b style={{ width: '35%' }} /></i><em>19%</em></div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
