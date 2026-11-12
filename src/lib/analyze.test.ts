import { describe, expect, it } from 'vitest'
import { createSampleWorkbook } from '../data/sample'
import { analyzeSheet, defaultOptions, inferFieldMapping } from './analyze'

describe('business analysis engine', () => {
  it('infers standard commerce fields from the sample dataset', () => {
    const sheet = createSampleWorkbook().sheets[0]
    const mapping = inferFieldMapping(sheet)

    expect(mapping['日期']).toBe('date')
    expect(mapping['成交额']).toBe('revenue')
    expect(mapping['访客数']).toBe('visitors')
    expect(mapping['支付转化率']).toBe('conversion')
  })

  it('creates a deterministic report with trend, rankings and warnings', () => {
    const sheet = createSampleWorkbook().sheets[0]
    const mapping = inferFieldMapping(sheet)
    const result = analyzeSheet(sheet, mapping, defaultOptions)

    expect(result.metrics.length).toBeGreaterThanOrEqual(4)
    expect(result.trend).toHaveLength(5)
    expect(result.rankings.length).toBeGreaterThan(0)
    expect(result.warnings.some((warning) => warning.id === 'primary-decline')).toBe(true)
    expect(result.summaryForAi).toHaveProperty('note')
  })
})
