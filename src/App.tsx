import { lazy, Suspense, useMemo, useState } from 'react'
import { Bot, Download, FileSpreadsheet, LayoutDashboard, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react'
import './App.css'
import { Brand } from './components/Brand'
import { UploadPanel } from './components/UploadPanel'
import { MappingPanel } from './components/MappingPanel'
import { createSampleWorkbook } from './data/sample'
import { analyzeSheet, defaultOptions, inferFieldMapping } from './lib/analyze'
import { parseWorkbookFile } from './lib/parseWorkbook'
import { formatFileSize } from './lib/format'
import type { AnalysisOptions, AnalysisResult, FieldMapping, ParsedWorkbook } from './types'

type Stage = 'upload' | 'mapping' | 'results'
type ResultView = 'overview' | 'advisor'

const Overview = lazy(() => import('./components/Overview').then((module) => ({ default: module.Overview })))
const AiAdvisor = lazy(() => import('./components/AiAdvisor').then((module) => ({ default: module.AiAdvisor })))

function App() {
  const [stage, setStage] = useState<Stage>('upload')
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null)
  const [sheetIndex, setSheetIndex] = useState(0)
  const [mapping, setMapping] = useState<FieldMapping>({})
  const [options, setOptions] = useState<AnalysisOptions>(defaultOptions)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [resultView, setResultView] = useState<ResultView>('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sheet = workbook?.sheets[sheetIndex] ?? null
  const riskCount = result?.warnings.filter((warning) => warning.level !== 'notice').length ?? 0

  const acceptWorkbook = (nextWorkbook: ParsedWorkbook) => {
    setWorkbook(nextWorkbook)
    setSheetIndex(0)
    setMapping(inferFieldMapping(nextWorkbook.sheets[0]))
    setResult(null)
    setError(null)
    setStage('mapping')
  }

  const handleFile = async (file: File) => {
    setLoading(true)
    setError(null)
    try {
      acceptWorkbook(await parseWorkbookFile(file))
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : '文件解析失败。')
    } finally {
      setLoading(false)
    }
  }

  const changeSheet = (index: number) => {
    if (!workbook) return
    setSheetIndex(index)
    setMapping(inferFieldMapping(workbook.sheets[index]))
  }

  const runAnalysis = () => {
    if (!sheet) return
    try {
      setResult(analyzeSheet(sheet, mapping, options))
      setResultView('overview')
      setError(null)
      setStage('results')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : '生成分析失败。')
    }
  }

  const reset = () => {
    setStage('upload')
    setWorkbook(null)
    setResult(null)
    setError(null)
  }

  const headerStatus = useMemo(() => {
    if (stage === 'upload') return '安全本地解析'
    if (stage === 'mapping') return '字段识别完成'
    return '分析报告已生成'
  }, [stage])

  return (
    <div className={`app-shell stage-${stage}`}>
      <header className="topbar">
        <Brand />
        <div className="topbar-status"><ShieldCheck size={16} /><span>{headerStatus}</span></div>
      </header>

      {stage === 'upload' && (
        <UploadPanel isLoading={loading} error={error} onFile={handleFile} onLoadSample={() => acceptWorkbook(createSampleWorkbook())} />
      )}

      {stage === 'mapping' && workbook && sheet && (
        <MappingPanel
          workbook={workbook}
          sheetIndex={sheetIndex}
          sheet={sheet}
          mapping={mapping}
          options={options}
          error={error}
          onSheetChange={changeSheet}
          onMappingChange={setMapping}
          onOptionsChange={setOptions}
          onAnalyze={runAnalysis}
          onBack={reset}
        />
      )}

      {stage === 'results' && workbook && sheet && result && (
        <div className="results-shell">
          <aside className="sidebar">
            <nav aria-label="分析报告导航">
              <button className={resultView === 'overview' ? 'active' : ''} type="button" onClick={() => setResultView('overview')}>
                <LayoutDashboard size={18} /> 分析概览 {riskCount > 0 && <em>{riskCount}</em>}
              </button>
              <button className={resultView === 'advisor' ? 'active' : ''} type="button" onClick={() => setResultView('advisor')}>
                <Bot size={18} /> AI 经营顾问
              </button>
            </nav>
            <div className="sidebar-file">
              <span><FileSpreadsheet size={17} /></span>
              <div><strong>{workbook.fileName}</strong><small>{formatFileSize(workbook.fileSize)} · {sheet.rows.length} 行</small></div>
            </div>
            <div className="sidebar-privacy"><LockKeyhole size={16} /><p><strong>数据不落库</strong><span>原始文件仅在当前浏览器中解析。</span></p></div>
            <button className="new-analysis" type="button" onClick={reset}><RefreshCw size={16} /> 新建分析</button>
          </aside>

          <main className="results-main">
            <div className="report-header">
              <div><span className="report-context">{workbook.fileName} / {sheet.name}</span><h1>{resultView === 'overview' ? '经营诊断概览' : 'AI 经营顾问'}</h1><p>{resultView === 'overview' ? '基于当前字段映射和预警参数生成' : '使用 DeepSeek 对确定性分析结果进行解读'}</p></div>
              <div className="report-actions">
                <button className="button secondary" type="button" onClick={() => setStage('mapping')}><RefreshCw size={16} /> 调整字段</button>
                <button className="button secondary" type="button" onClick={() => window.print()}><Download size={16} /> 导出 PDF</button>
              </div>
            </div>
            <Suspense fallback={<div className="view-loading">正在加载分析视图…</div>}>
              {resultView === 'overview' ? <Overview result={result} /> : <AiAdvisor result={result} />}
            </Suspense>
          </main>
        </div>
      )}

      {stage === 'upload' && <footer className="site-footer"><span>枢界家具 · 数据驱动每一次经营决策</span><span>AI 分析由 DeepSeek 提供支持</span></footer>}
    </div>
  )
}

export default App
