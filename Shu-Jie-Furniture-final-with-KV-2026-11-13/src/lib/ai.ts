import type { AiAnalysis, AiCallMeta, ChatMessage } from '../types'

export async function checkAiAvailability(): Promise<boolean> {
  try {
    const response = await fetch('/api/analyze', { headers: { Accept: 'application/json' } })
    const data = await response.json() as { available?: unknown }
    return response.ok && data.available === true
  } catch {
    return false
  }
}

async function apiRequest(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'AI 服务暂时不可用。')
  return data
}

export async function requestAiAnalysis(summary: Record<string, unknown>, turnstileToken?: string): Promise<AiAnalysis> {
  const data = await apiRequest({ mode: 'analyze', summary, turnstileToken })
  return { ...(data.result as AiAnalysis), meta: data.meta as AiCallMeta | undefined }
}

export async function askAiQuestion(
  summary: Record<string, unknown>, question: string, history: ChatMessage[], turnstileToken?: string,
): Promise<string> {
  const data = await apiRequest({ mode: 'chat', summary, question, history: history.slice(-8), turnstileToken })
  if (typeof data.answer !== 'string') throw new Error('AI 返回内容格式异常。')
  return data.answer
}
