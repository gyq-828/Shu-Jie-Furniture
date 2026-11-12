import { ChartNoAxesCombined } from 'lucide-react'

export function Brand() {
  return (
    <div className="brand" aria-label="枢界家具智能经营诊断与预警平台">
      <span className="brand-mark"><ChartNoAxesCombined size={21} strokeWidth={2.2} /></span>
      <span className="brand-copy">
        <strong>枢界家具</strong>
        <small>智能经营诊断与预警平台</small>
      </span>
    </div>
  )
}
