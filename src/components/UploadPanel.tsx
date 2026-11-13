import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { ArrowRight, Database, FileSpreadsheet, LockKeyhole, UploadCloud } from 'lucide-react'

interface UploadPanelProps {
  isLoading: boolean
  error: string | null
  onFile: (file: File) => void
  onLoadSample: () => void
}

export function UploadPanel({ isLoading, error, onFile, onLoadSample }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onFile(file)
    event.target.value = ''
  }

  const dropFile = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  return (
    <main className="upload-page">
      <section className="upload-intro">
        <div className="eyebrow">经营数据分析</div>
        <h1>
          <span className="headline-line">从数据表中，</span>
          <span className="headline-line headline-line-action">找到下一个经营动作。</span>
        </h1>
        <p>上传一份业务数据表，先查看关键发现和证据；需要时再进入图表明细或请求 AI 补充解读。</p>
        <div className="trust-row" aria-label="产品特点">
          <span><LockKeyhole size={16} /> 原始文件仅在本机解析</span>
          <span><Database size={16} /> 无需注册或登录</span>
        </div>
      </section>

      <section className="upload-workspace" aria-labelledby="upload-title">
        <div className="section-heading">
          <div>
            <span className="step-kicker">01 / 导入数据</span>
            <h2 id="upload-title">开始一次新分析</h2>
          </div>
          <span className="format-badge">CSV · XLS · XLSX</span>
        </div>

        <div
          className={`drop-zone ${dragging ? 'is-dragging' : ''}`}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={dropFile}
        >
          <input ref={inputRef} type="file" accept=".csv,.xls,.xlsx" onChange={selectFile} hidden />
          <span className="drop-icon"><UploadCloud size={28} /></span>
          <strong>{isLoading ? '正在解析数据…' : '将数据文件拖到这里'}</strong>
          <p>单个文件不超过 10 MB，最多分析 100,000 行</p>
          <button className="button primary" type="button" disabled={isLoading} onClick={() => inputRef.current?.click()}>
            <FileSpreadsheet size={17} /> 选择文件
          </button>
        </div>

        {error && <div className="inline-error" role="alert">{error}</div>}

        <div className="sample-row">
          <div>
            <strong>暂时没有数据？</strong>
            <p>使用枢界家具近 5 周演示数据体验完整流程。</p>
          </div>
          <button className="button text-button" type="button" onClick={onLoadSample}>加载示例数据 <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </main>
  )
}
