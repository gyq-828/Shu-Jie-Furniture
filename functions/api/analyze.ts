interface Env {
  DEEPSEEK_API_KEY: string
  DEEPSEEK_MODEL?: string
  TURNSTILE_SECRET_KEY?: string
  RATE_LIMIT?: KVNamespace
}

interface DeepSeekResponse {
  choices?: Array<{ message?: { content?: string } }>
  error?: { message?: string }
}

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...jsonHeaders, ...extraHeaders } })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

async function verifyTurnstile(token: string, secret: string, ip: string): Promise<boolean> {
  const form = new FormData()
  form.set('secret', secret)
  form.set('response', token)
  if (ip !== 'unknown') form.set('remoteip', ip)
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form })
  const result = await response.json() as { success?: boolean }
  return result.success === true
}

async function readQuota(env: Env, ip: string, mode: 'analyze' | 'chat') {
  const limit = mode === 'analyze' ? 3 : 15
  if (!env.RATE_LIMIT) return { allowed: true, remaining: limit, used: 0, key: '' }
  const date = new Date().toISOString().slice(0, 10)
  const key = `quota:${date}:${mode}:${ip}`
  const used = Number(await env.RATE_LIMIT.get(key) ?? 0)
  return { allowed: used < limit, remaining: Math.max(0, limit - used), used, key }
}

async function consumeQuota(env: Env, key: string, used: number) {
  if (!env.RATE_LIMIT || !key) return
  await env.RATE_LIMIT.put(key, String(used + 1), { expirationTtl: 86_400 })
}

function parseJsonContent(content: string): Record<string, unknown> {
  const normalized = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const parsed = JSON.parse(normalized) as unknown
  if (!isRecord(parsed)) throw new Error('DeepSeek returned a non-object response')
  return parsed
}

function normalizeAnalysis(value: Record<string, unknown>) {
  const findings = Array.isArray(value.findings) ? value.findings.slice(0, 6).filter(isRecord).map((item) => ({
    title: cleanText(item.title, 80),
    evidence: cleanText(item.evidence, 240),
    level: ['critical', 'warning', 'notice'].includes(String(item.level)) ? item.level : 'notice',
  })) : []
  const actions = Array.isArray(value.actions) ? value.actions.slice(0, 6).filter(isRecord).map((item) => ({
    priority: ['P0', 'P1', 'P2'].includes(String(item.priority)) ? item.priority : 'P2',
    title: cleanText(item.title, 80),
    detail: cleanText(item.detail, 260),
  })) : []
  const caveats = Array.isArray(value.caveats) ? value.caveats.slice(0, 4).map((item) => cleanText(item, 180)).filter(Boolean) : []
  return {
    overview: cleanText(value.overview, 500),
    healthScore: Math.max(0, Math.min(100, Number(value.healthScore) || 0)),
    findings,
    actions,
    caveats,
  }
}

async function callDeepSeek(env: Env, messages: Array<{ role: string; content: string }>, jsonMode: boolean) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.DEEPSEEK_MODEL || 'deepseek-chat',
      messages,
      temperature: 0.2,
      max_tokens: jsonMode ? 1800 : 900,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  })
  const data = await response.json() as DeepSeekResponse
  if (!response.ok) throw new Error(data.error?.message || `DeepSeek API error ${response.status}`)
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('DeepSeek did not return content')
  return content
}

const analysisSystemPrompt = `你是资深商务数据分析师。你只能使用用户提供的统计摘要，不得编造原始数据、因果关系或行业事实。
明确区分“数据显示”和“可能原因”，建议必须具体、可执行、可验证。如果缺乏必要字段，必须在 caveats 说明。
请仅返回一个 JSON 对象，不要包含 Markdown，格式为：
{"overview":"120字内概览","healthScore":0到100数字,"findings":[{"title":"发现","evidence":"对应数据证据","level":"critical|warning|notice"}],"actions":[{"priority":"P0|P1|P2","title":"行动","detail":"执行方式和验证指标"}],"caveats":["数据局限"]}。`

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const contentLength = Number(context.request.headers.get('content-length') || 0)
  if (contentLength > 120_000) return json({ error: '请求数据过大。' }, 413)
  if (!context.env.DEEPSEEK_API_KEY) return json({ error: '站点尚未配置 DeepSeek API Key。' }, 503)

  let body: Record<string, unknown>
  try {
    const parsed = await context.request.json()
    if (!isRecord(parsed)) throw new Error('invalid body')
    body = parsed
  } catch {
    return json({ error: '请求格式无效。' }, 400)
  }

  const mode = body.mode === 'chat' ? 'chat' : body.mode === 'analyze' ? 'analyze' : null
  if (!mode || !isRecord(body.summary)) return json({ error: '缺少有效的分析摘要。' }, 400)
  const summaryText = JSON.stringify(body.summary)
  if (summaryText.length > 80_000) return json({ error: '分析摘要过大。' }, 413)

  const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown'
  if (context.env.TURNSTILE_SECRET_KEY) {
    const token = cleanText(body.turnstileToken, 2048)
    if (!token || !(await verifyTurnstile(token, context.env.TURNSTILE_SECRET_KEY, ip))) {
      return json({ error: '人机验证失败，请刷新后重试。' }, 403)
    }
  }

  const quota = await readQuota(context.env, ip, mode)
  if (!quota.allowed) return json({ error: mode === 'analyze' ? '今日 AI 分析次数已用完。' : '今日 AI 追问次数已用完。' }, 429)

  try {
    if (mode === 'analyze') {
      const content = await callDeepSeek(context.env, [
        { role: 'system', content: analysisSystemPrompt },
        { role: 'user', content: `请分析以下统计摘要：\n${summaryText}` },
      ], true)
      const result = normalizeAnalysis(parseJsonContent(content))
      await consumeQuota(context.env, quota.key, quota.used)
      return json({ result }, 200, { 'X-RateLimit-Remaining': String(Math.max(0, quota.remaining - 1)) })
    }

    const question = cleanText(body.question, 600)
    if (!question) return json({ error: '请输入要追问的问题。' }, 400)
    const history = Array.isArray(body.history) ? body.history.slice(-8).filter(isRecord).map((item) => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: cleanText(item.content, 1200),
    })).filter((item) => item.content) : []
    const answer = await callDeepSeek(context.env, [
      { role: 'system', content: '你是商务数据分析顾问。仅根据给定的统计摘要答复，明确区分事实与推测，回答简洁、可执行，不得编造数据。' },
      { role: 'system', content: `当前数据摘要：${summaryText}` },
      ...history,
      { role: 'user', content: question },
    ], false)
    await consumeQuota(context.env, quota.key, quota.used)
    return json({ answer }, 200, { 'X-RateLimit-Remaining': String(Math.max(0, quota.remaining - 1)) })
  } catch (error) {
    console.error('AI analysis failed', error instanceof Error ? error.message : error)
    return json({ error: 'AI 服务暂时不可用，请稍后重试。' }, 502)
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'POST') return onRequestPost(context)
  return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' })
}
