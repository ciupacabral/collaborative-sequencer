import { useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface Props {
  url:   string
  onClose: () => void
}

export function ShareQRModal({ url, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-panel border border-border rounded-lg p-6 max-w-sm w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 text-zinc-500 hover:text-white text-xl leading-none"
        >×</button>

        <div className="flex flex-col items-center gap-3">
          <div className="bg-white p-3 rounded">
            <QRCodeSVG value={url} size={224} level="M" />
          </div>
          <div className="text-xs text-zinc-500 text-center">
            Scan with phone camera or copy the link
          </div>
          <div
            className="text-sm text-zinc-300 break-all text-center select-all cursor-text font-mono"
          >
            {url}
          </div>
        </div>
      </div>
    </div>
  )
}
