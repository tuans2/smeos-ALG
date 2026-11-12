"use client"

import { Check, CheckCircle2, Copy, ExternalLink, Eye, Plus } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"

interface StepResultProps {
  shareUrl: string
  sendCode: string
  customerName: string
  copied: boolean
  copyError: string | null
  onCopy: () => void
  onPreview: () => void
  onCreateAnother: () => void
  onFinish?: (() => void) | undefined
}

export function StepResult(props: StepResultProps) {
  return (
    <section aria-labelledby="step-result-title" className="flex flex-col items-center gap-5 py-2 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success-bg text-success">
        <CheckCircle2 size={30} aria-hidden="true" />
      </span>
      <div>
        <h2 id="step-result-title" className="text-title font-bold text-text">
          Link đã sẵn sàng để gửi
        </h2>
        <p className="mt-1 text-body-sm text-text-muted">
          Dành cho <strong className="text-text">{props.customerName || "khách"}</strong> · mã gửi{" "}
          <span className="font-mono font-semibold text-text">{props.sendCode}</span>
        </p>
      </div>

      <div className="flex w-full max-w-xl flex-col gap-3 rounded-2xl border border-border bg-surface-alt p-4">
        <output className="block break-all rounded-xl border border-border bg-bg p-3 text-left font-mono text-body-sm text-text select-all">
          {props.shareUrl}
        </output>
        <p className="text-left text-caption text-text-muted">Dán link vào Zalo, Messenger hoặc tin nhắn để gửi khách.</p>
        <div className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_auto_auto]">
          <Button size="sm" onClick={props.onCopy} className="col-span-2 gap-1.5 sm:col-span-1">
            {props.copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            {props.copied ? "Đã sao chép" : "Sao chép link"}
          </Button>
          <Button variant="secondary" size="sm" onClick={props.onPreview} className="gap-1.5">
            <Eye size={16} aria-hidden="true" />
            Xem trước
          </Button>
          <a
            href={props.shareUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Mở link trong thẻ mới"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-3 text-text-muted hover:bg-surface hover:text-text"
          >
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        </div>
        {props.copyError && (
          <p role="alert" className="text-left text-caption text-danger">
            {props.copyError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
        <Button variant="outline" size="sm" onClick={props.onCreateAnother} className="gap-1.5">
          <Plus size={16} aria-hidden="true" />
          Gửi cho khách khác
        </Button>
        {props.onFinish && (
          <Button variant="secondary" size="sm" onClick={props.onFinish}>
            Xem danh sách đã gửi
          </Button>
        )}
      </div>
    </section>
  )
}
