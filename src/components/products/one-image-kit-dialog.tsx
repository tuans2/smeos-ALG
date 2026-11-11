"use client"

import { useEffect, useRef, useState } from "react"
import type { Route } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { InlineError } from "@/components/ui/inline-error"
import { ImagePlus } from "@/components/ui/icon-set/image-plus"
import { formatCurrency } from "@/lib/i18n/formatters"
import { uploadImageFile } from "./ai-product-helpers"
import { KIT_STEP_LABEL, kitOutputCount, type KitResult } from "@/modules/journey/domain/one-image-kit"

const API = "/api/v1/products/one-image-kit"
const POLL_MS = 3000
/** Chờ nhận diện tối đa 4 phút rồi dừng hỏi (người dùng mở lại từ màn Duyệt) */
const POLL_LIMIT = 80

type Analysis = { id: string; approvalState: string; imageUrl: string | null; category: string | null; flowers: Array<{ name: string; quantity: number; unit: string | null; role: string | null }> }
type Phase = "pick" | "analyzing" | "review" | "running" | "result"

async function send<T>(url: string, body: unknown, key?: string): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) }, body: JSON.stringify(body) })
  const json = (await res.json().catch(() => null)) as { data?: T; error?: { message?: string } } | null
  if (!res.ok || !json?.data) throw new Error(json?.error?.message ?? "Chưa thực hiện được, vui lòng thử lại")
  return json.data
}

/**
 * Luồng "Từ 1 ảnh" (checklist ALG 7.2): tải một ảnh → hệ thống nhận diện → người dùng kiểm tra → duyệt
 * → thẻ sản phẩm nháp, nội dung bán hàng, giá vốn đề xuất, bài đăng Facebook/Zalo, thẻ A6.
 */
export function OneImageKitDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>("pick")
  const [job, setJob] = useState<{ jobId: string; assetId: string } | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [result, setResult] = useState<KitResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (phase !== "analyzing" || !job) return
    let tries = 0
    const timer = window.setInterval(async () => {
      tries += 1
      const res = await fetch(`${API}?job_id=${job.jobId}&asset_id=${job.assetId}`).catch(() => null)
      const json = res?.ok ? ((await res.json()) as { data: { jobStatus: string; analysis: Analysis | null } }) : null
      if (json?.data.analysis) {
        setAnalysis(json.data.analysis)
        setPhase("review")
      } else if (json?.data.jobStatus === "FAILED" || tries >= POLL_LIMIT) {
        setError(json?.data.jobStatus === "FAILED" ? "Chưa nhận diện được ảnh này (credit đã hoàn). Hãy thử ảnh rõ hơn." : "Nhận diện lâu hơn dự kiến — kết quả sẽ có ở màn Duyệt.")
        setPhase("pick")
      }
      if (json?.data.analysis || json?.data.jobStatus === "FAILED" || tries >= POLL_LIMIT) window.clearInterval(timer)
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [phase, job])

  async function pick(file: File | undefined) {
    if (!file) return
    setError(null)
    setPhase("analyzing")
    try {
      const uploaded = await uploadImageFile(file)
      const started = await send<{ jobId: string }>(API, { asset_id: uploaded.assetId }, crypto.randomUUID())
      setJob({ jobId: started.jobId, assetId: uploaded.assetId })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa tải được ảnh")
      setPhase("pick")
    }
  }

  async function run() {
    if (!analysis) return
    setError(null)
    setPhase("running")
    try {
      const kit = await send<KitResult>(`${API}/run`, { analysis_id: analysis.id }, crypto.randomUUID())
      setResult(kit)
      setPhase("result")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa tạo được bộ nội dung")
      setPhase("review")
    }
  }

  const out = result?.outputs
  return (
    <Dialog open={open} onOpenChange={(o) => phase !== "running" && onOpenChange(o)} size="md" title="Bộ nội dung từ 1 ảnh"
      description="Một ảnh sản phẩm → thẻ sản phẩm, nội dung bán hàng, giá vốn đề xuất, bài đăng Facebook/Zalo và thẻ A6. Mỗi bước AI trừ credit riêng, bước lỗi được hoàn.">
      <div className="flex flex-col gap-3 text-body-sm">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
        {phase === "pick" && (
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
            <ImagePlus size={16} aria-hidden="true" /> Chọn ảnh sản phẩm
          </Button>
        )}
        {phase === "analyzing" && <p role="status" className="text-text-muted">Đang nhận diện ảnh…</p>}
        {(phase === "review" || phase === "running") && analysis && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {analysis.imageUrl && <img src={analysis.imageUrl} alt="Ảnh sản phẩm" className="h-24 w-24 rounded-lg object-cover" />}
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-text">{analysis.category ?? "Sản phẩm chưa đặt tên"}</p>
                <ul className="text-caption text-text-muted">
                  {analysis.flowers.map((f, i) => <li key={i}>{f.name} · {f.quantity}{f.unit ? ` ${f.unit}` : ""}{f.role ? ` · ${f.role}` : ""}</li>)}
                </ul>
              </div>
            </div>
            <p className="text-caption text-text-muted">
              Kiểm tra kết quả nhận diện. Cần sửa thành phần? Mở <Link href={"/duyet" as Route} className="underline">màn Duyệt</Link> rồi quay lại.
            </p>
            <Button type="button" disabled={phase === "running"} onClick={() => void run()}>
              {phase === "running" ? "Đang tạo bộ nội dung…" : "Duyệt và tạo bộ nội dung"}
            </Button>
          </div>
        )}
        {phase === "result" && result && out && (
          <div className="flex flex-col gap-2">
            <p role="status" className={result.status === "READY" ? "font-semibold text-success" : "font-semibold text-warning-text"}>
              {result.status === "READY" ? "Đã tạo đủ 5 đầu ra" : `Đã tạo ${kitOutputCount(out)}/5 — dừng ở bước ${KIT_STEP_LABEL[result.failedStep]}`}
            </p>
            {result.error && <p className="text-caption text-text-muted">{result.error}</p>}
            <ul className="flex flex-col gap-1.5">
              {out.productId && <li><Link className="underline" href={`/san-pham/${out.productId}` as Route}>Thẻ sản phẩm nháp và nội dung bán hàng</Link></li>}
              {out.cost && (
                <li>Giá vốn đề xuất: {formatCurrency(out.cost.totalVnd)}{out.cost.complete ? "" : " (chưa đủ đơn giá nguyên liệu)"}</li>
              )}
              {out.posts.map((p) => (
                <li key={p.channel} className="rounded-lg bg-surface-alt p-2">
                  <span className="text-caption font-semibold capitalize">{p.channel}</span>
                  <p className="whitespace-pre-line">{p.text}</p>
                </li>
              ))}
              {out.printRenditionId && <li><Link className="underline" href={"/in-an" as Route}>Thẻ A6 trong mục In ấn</Link></li>}
            </ul>
            {result.status === "FAILED" && <Button type="button" variant="outline" onClick={() => void run()}>Chạy lại bước còn thiếu</Button>}
          </div>
        )}
        {error && <InlineError message={error} />}
      </div>
    </Dialog>
  )
}
