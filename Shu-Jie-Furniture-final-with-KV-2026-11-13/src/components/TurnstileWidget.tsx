import { useEffect, useRef } from 'react'

interface TurnstileWidgetProps {
  onToken: (token: string | null) => void
  resetKey: number
}

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

export function TurnstileWidget({ onToken, resetKey }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<string | null>(null)

  useEffect(() => {
    if (!siteKey) {
      onToken('development-disabled')
      return
    }

    const render = () => {
      if (!containerRef.current || !window.turnstile || widgetRef.current) return
      widgetRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'light',
        size: 'flexible',
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(null),
        'error-callback': () => onToken(null),
      })
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-shujie-turnstile]')
    if (existing) {
      if (window.turnstile) render()
      else existing.addEventListener('load', render, { once: true })
    } else {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.dataset.shujieTurnstile = 'true'
      script.addEventListener('load', render, { once: true })
      document.head.appendChild(script)
    }

    return () => {
      if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current)
      widgetRef.current = null
    }
  }, [onToken])

  useEffect(() => {
    if (resetKey > 0 && widgetRef.current && window.turnstile) {
      window.turnstile.reset(widgetRef.current)
      onToken(null)
    }
  }, [resetKey, onToken])

  if (!siteKey) return null
  return <div className="turnstile-wrap" ref={containerRef} aria-label="人机验证" />
}
