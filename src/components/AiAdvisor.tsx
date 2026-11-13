import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AlertCircle, ArrowUp, CheckCircle2, LoaderCircle, MessageSquareText, RefreshCw } from 'lucide-react'
import type { AiAnalysis, AnalysisResult, ChatMessage } from '../types'
import { askAiQuestion, checkAiAvailability, requestAiAnalysis, type AiAvailability } from '../lib/ai'
import { TurnstileWidget } from './TurnstileWidget'

interface AiAdvisorProps {
  result: AnalysisResult
}

export function AiAdvisor({ result }: AiAdvisorProps) {
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null)
  const [aiStatus, setAiStatus] = useState<AiAvailability | 'checking'>('checking')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [token, setToken] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const handleToken = useCallback((nextToken: string | null) => setToken(nextToken), [])
  const turnstileEnabled = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY)

  const refreshAvailability = useCallback(async () => {
    setAiStatus('checking')
    setAiStatus(await checkAiAvailability(true))
  }, [])

  useEffect(() => {
    let active = true
    void checkAiAvailability().then((status) => {
      if (active) setAiStatus(status)
    })
    return () => { active = false }
  }, [])

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
          <div><span className="step-kicker">补充解读</span><h2>经营顾问</h2><p>只发送当前分析的汇总指标、趋势、排名与预警，不发送原始文件。</p></div>
        </div>

        {!analysis ? (
          <div className="advisor-empty">
            <h3>在规则结论基础上补充解读</h3>
            <p>先看已生成的首要发现和证据；DeepSeek 可进一步整理可能解释、待验证假设与后续动作。</p>
            <div className={`ai-connection-status ${aiStatus === 'available' ? 'connected' : aiStatus === 'unavailable' ? 'disconnected' : aiStatus === 'unreachable' ? 'delayed' : ''}`} role="status">
              <span className="status-mark" />
              <span>{aiStatus === 'checking' ? '正在快速检查 AI 服务（最多 4 秒）…' : aiStatus === 'available' ? 'DeepSeek 服务已配置' : aiStatus === 'unavailable' ? 'DeepSeek API Key 尚未配置' : '连接检查超时，可直接尝试生成'}</span>
              {(aiStatus === 'unavailable' || aiStatus === 'unreachable') && (
                <button className="ai-status-retry" type="button" onClick={() => void refreshAvailability()}><RefreshCw size={14} /> 重新检查</button>
              )}
            </div>
            <TurnstileWidget onToken={handleToken} resetKey={resetKey} />
            <button className="button primary" type="button" disabled={loading || aiStatus === 'unavailable'} onClick={generate}>
              {loading ? <LoaderCircle className="spin" size={17} /> : <MessageSquareText size={17} />}
              {loading ? '正在生成解读…' : '生成补充解读'}
            </button>
          </div>
        ) : (
          <div className="ai-report">
            {analysis.meta && (
              <div className="ai-call-proof" aria-label="AI 接口调用凭证">
                <strong>DeepSeek API 已响应</strong>
                <span>模型 {analysis.meta.model}</span>
                {analysis.meta.totalTokens !== null && <span>本次 {analysis.meta.totalTokens.toLocaleString('zh-CN')} Tokens</span>}
                <span>{new Date(analysis.meta.completedAt).toLocaleString('zh-CN')}</span>
              </div>
            )}
            <p className="ai-overview">{analysis.overview}</p>
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
