import { useCallback, useState, type FormEvent } from 'react'
import { AlertCircle, ArrowUp, Bot, CheckCircle2, LoaderCircle, MessageSquareText, Sparkles } from 'lucide-react'
import type { AiAnalysis, AnalysisResult, ChatMessage } from '../types'
import { askAiQuestion, requestAiAnalysis } from '../lib/ai'
import { TurnstileWidget } from './TurnstileWidget'

interface AiAdvisorProps {
  result: AnalysisResult
}

export function AiAdvisor({ result }: AiAdvisorProps) {
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [token, setToken] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const handleToken = useCallback((nextToken: string | null) => setToken(nextToken), [])
  const turnstileEnabled = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY)

  const generate = async () => {
    if (turnstileEnabled && !token) return setError('请先完成人机验证。')
    setLoading(true)
    setError(null)
    try {
      setAnalysis(await requestAiAnalysis(result.summaryForAi, token ?? undefined))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'AI 诊断失败。')
    } finally {
      setLoading(false)
      if (turnstileEnabled) setResetKey((value) => value + 1)
    }
  }

  const submitQuestion = async (event: FormEvent) => {
    event.preventDefault()
    const content = question.trim()
    if (!content || loading) return
    if (turnstileEnabled && !token) return setError('请先完成人机验证。')
    const nextHistory: ChatMessage[] = [...history, { role: 'user', content }]
    setQuestion('')
    setHistory(nextHistory)
    setLoading(true)
    setError(null)
    try {
      const answer = await askAiQuestion(result.summaryForAi, content, history, token ?? undefined)
      setHistory([...nextHistory, { role: 'assistant', content: answer }])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'AI 回答失败。')
    } finally {
      setLoading(false)
      if (turnstileEnabled) setResetKey((value) => value + 1)
    }
  }

  return (
    <div className="advisor-layout">
      <section className="advisor-main">
        <div className="advisor-heading">
          <span className="ai-icon"><Sparkles size={22} /></span>
          <div><span className="step-kicker">DEEPSEEK 智能分析</span><h2>AI 经营顾问</h2><p>基于页面中已计算的汇总指标生成结论，不会上传原始文件。</p></div>
        </div>

        {!analysis ? (
          <div className="advisor-empty">
            <Bot size={42} strokeWidth={1.4} />
            <h3>让 AI 解读这份数据</h3>
            <p>DeepSeek 将结合指标趋势、分类贡献和预警结果，输出核心发现与优先行动。</p>
            <TurnstileWidget onToken={handleToken} resetKey={resetKey} />
            <button className="button primary" type="button" disabled={loading} onClick={generate}>
              {loading ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}
              {loading ? '正在思考…' : '生成 AI 诊断'}
            </button>
          </div>
        ) : (
          <div className="ai-report">
            <div className="health-summary"><div><span>经营健康度</span><strong>{Math.round(analysis.healthScore)}</strong><em>/100</em></div><p>{analysis.overview}</p></div>
            <div className="ai-section"><h3>核心发现</h3><div className="finding-list">{analysis.findings.map((finding, index) => <article key={`${finding.title}-${index}`} className={`finding ${finding.level}`}><AlertCircle size={17} /><div><strong>{finding.title}</strong><p>{finding.evidence}</p></div></article>)}</div></div>
            <div className="ai-section"><h3>优先行动</h3><div className="action-list">{analysis.actions.map((action, index) => <article key={`${action.title}-${index}`}><span>{action.priority}</span><div><strong>{action.title}</strong><p>{action.detail}</p></div></article>)}</div></div>
            {analysis.caveats.length > 0 && <div className="caveat"><CheckCircle2 size={16} /><p>{analysis.caveats.join('；')}</p></div>}
          </div>
        )}
        {error && <div className="inline-error" role="alert">{error}</div>}
      </section>

      <aside className="chat-panel">
        <div className="chat-heading"><MessageSquareText size={18} /><div><strong>继续追问</strong><span>当前数据上下文</span></div></div>
        <div className="chat-stream" aria-live="polite">
          {history.length === 0 ? <div className="chat-placeholder"><p>你可以问：</p><button type="button" onClick={() => setQuestion('哪个问题最值得优先处理？')}>哪个问题最值得优先处理？</button><button type="button" onClick={() => setQuestion('请给出一个两周改善计划。')}>请给出两周改善计划</button></div>
            : history.map((message, index) => <div key={index} className={`chat-message ${message.role}`}><span>{message.role === 'user' ? '你' : 'AI'}</span><p>{message.content}</p></div>)}
          {loading && history.length > 0 && <div className="chat-message assistant"><span>AI</span><p className="typing"><i /><i /><i /></p></div>}
        </div>
        {analysis && <TurnstileWidget onToken={handleToken} resetKey={resetKey} />}
        <form className="chat-form" onSubmit={submitQuestion}>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={600} rows={3} placeholder="输入关于当前数据的问题…" />
          <button type="submit" aria-label="发送问题" disabled={!question.trim() || loading}><ArrowUp size={17} /></button>
        </form>
        <small>AI 结论仅作为经营决策辅助，请结合业务实际验证。</small>
      </aside>
    </div>
  )
}
