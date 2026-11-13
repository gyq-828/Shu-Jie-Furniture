import type { AiAnalysis, AiCallMeta, ChatMessage } from '../types'

export type AiAvailability = 'available' | 'unavailable' | 'unreachable'

const AI_STATUS_CACHE_KEY = 'shujie-ai-status'
const AI_STATUS_CACHE_TTL = 10 * 60 * 1000

function readCachedAvailability(): AiAvailability | null {
  try {
    const cached = sessionStorage.getItem(AI_STATUS_CACHE_KEY)
    if (!cached) return null
    const value = JSON.parse(cached) as { status?: unknown; expiresAt?: unknown }
    if (value.status === 'available' && typeof value.expiresAt === 'number' && value.expiresAt > Date.now()) return 'available'
    sessionStorage.removeItem(AI_STATUS_CACHE_KEY)
  } catch {
    // Storage can be unavailable in strict privacy modes; skip caching in that case.
  }
  return null
}

export async function checkAiAvailability(force = false): Promise<AiAvailability> {
  if (!force) {
    const cached = readCachedAvailability()
    if (cached) return cached
  }

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 4_000)
  try {
    const response = await fetch('/api/analyze', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    })
    const data = await response.json() as { available?: unknown }
    if (!response.ok) return 'unreachable'
    if (data.available !== true) return 'unavailable'
    sessionStorage.setItem(AI_STATUS_CACHE_KEY, JSON.stringify({ status: 'available', expiresAt: Date.now() + AI_STATUS_CACHE_TTL }))
    return 'available'
  } catch {
    return 'unreachable'
  } finally {
    window.clearTimeout(timeout)
  }
}

async function apiRequest(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 45_000)
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const data = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'AI 服务暂时不可用。')
    return data
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('AI 请求等待超过 45 秒，请稍后重试。')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
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
