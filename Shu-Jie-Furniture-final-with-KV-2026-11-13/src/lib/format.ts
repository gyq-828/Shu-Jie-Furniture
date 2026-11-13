import type { MetricFormat } from '../types'

export function formatMetric(value: number, format: MetricFormat): string {
  if (!Number.isFinite(value)) return '--'
  if (format === 'currency') {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(value)
  }
  if (format === 'percent') return `${value.toFixed(2)}%`
  if (format === 'integer') return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(value)
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value)
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return '内置示例'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
