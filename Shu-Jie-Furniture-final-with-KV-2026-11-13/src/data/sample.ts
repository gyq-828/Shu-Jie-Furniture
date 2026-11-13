import type { DataRow, ParsedWorkbook } from '../types'

const channels = [
  { name: '手淘搜索', visitors: 1020, rate: 0.014, price: 1199 },
  { name: '直通车', visitors: 760, rate: 0.009, price: 1099 },
  { name: '手淘推荐', visitors: 630, rate: 0.008, price: 999 },
  { name: '淘宝客', visitors: 310, rate: 0.006, price: 1049 },
  { name: '短视频', visitors: 240, rate: 0.011, price: 1299 },
  { name: '店铺其他', visitors: 190, rate: 0.004, price: 899 },
]

const products = ['S9 Pro 人体工学椅', 'E7 高背办公椅', 'M5 护腰电脑椅']
const weeks = [
  { label: '第32周', date: '2026-08-03', factor: 1 },
  { label: '第33周', date: '2026-08-10', factor: 0.97 },
  { label: '第34周', date: '2026-08-17', factor: 0.91 },
  { label: '第35周', date: '2026-08-24', factor: 0.79 },
  { label: '第36周', date: '2026-08-31', factor: 0.68 },
]

const rows: DataRow[] = []

weeks.forEach((week, weekIndex) => {
  channels.forEach((channel, channelIndex) => {
    const searchPenalty = channelIndex === 0 && weekIndex >= 3 ? 0.84 : 1
    const visitors = Math.round(channel.visitors * week.factor * searchPenalty)
    const rate = channel.rate * (1 - weekIndex * 0.035)
    const orders = Math.max(1, Math.round(visitors * rate))
    const price = channel.price + ((weekIndex + channelIndex) % 3 - 1) * 20
    rows.push({
      '周次': week.label,
      '日期': week.date,
      '流量渠道': channel.name,
      '商品名称': products[channelIndex % products.length],
      '访客数': visitors,
      '支付订单数': orders,
      '成交额': orders * price,
      '支付转化率': Number(((orders / visitors) * 100).toFixed(2)),
      '客单价': price,
    })
  })
})

export function createSampleWorkbook(): ParsedWorkbook {
  return {
    fileName: '枢界家具_经营演示数据.xlsx',
    fileSize: 0,
    sheets: [
      {
        name: '经营数据',
        rows,
        columns: Object.keys(rows[0]),
        totalRows: rows.length,
        truncated: false,
      },
    ],
  }
}
