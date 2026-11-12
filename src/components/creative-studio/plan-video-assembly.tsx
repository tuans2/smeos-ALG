"use client"

/**
 * Đợt 4 (24/09/2026) — "Dựng video từ bộ tài sản" ở Khu vực E.
 *
 * Video lắp từ ĐÚNG các tài sản của kịch bản sản xuất tổng (Chặng 05): ảnh
 * Khu vực D của từng cảnh, nguyên bản phối Khu vực C, phụ đề / chuyển cảnh /
 * khuôn / khung của kịch bản. Thiếu gì thì chặn và chỉ đúng khu vực phải làm
 * (quyết định PO). Kiểm tra lại tự động mỗi khi mở trang.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Clapperboard } from "@/components/ui/icon-set/clapperboard"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { resolveApprovedMaster } from "./package-client"
import type { LoadedScenePlan } from "./scene-plan-client"

type Problem = { kind: string; sceneIndex?: number; message: string }

interface AssemblyResponse {
  ready: boolean
  problems: Problem[]
  warnings: string[]
  format: string
  aspect_ratio: string
  total_duration_seconds: number
  scenes: Array<{ sceneIndex: number; durationSeconds: number; imageAssetId: string; textOverlay: string }>
  audio_job_id: string | null
  video_job_id: string | null
}

async function readError(res: Response): Promise<string> {
  const b = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
  return b.error?.message || `HTTP ${res.status}`
}

export function PlanVideoAssembly({
  loaded,
  assetId,
  audioJobId,
  title,
  onGoArea,
  onCreated,
}: {
  loaded: LoadedScenePlan
  assetId: string | undefined
  audioJobId: string | null
  title: string
  onGoArea: (area: "c" | "d", focusScene?: number, focusRatio?: string) => void
  onCreated: (videoJobId: string) => void
}) {
  // PO 24/09/2026: mỗi khung trong phạm vi một video riêng (ảnh D của đúng khung).
  const pub = loaded.plan.publishing
  const ratios: readonly string[] = pub.ratios?.length ? pub.ratios : [pub.aspectRatio]
  const [pickedRatio, setRatio] = useState<string>(ratios[0] ?? pub.aspectRatio)
  const ratio = ratios.includes(pickedRatio) ? pickedRatio : (ratios[0] ?? pub.aspectRatio)
  const variantOf = (r: string) => pub.videoVariants?.find((x) => x.ratio === r)
  const [report, setReport] = useState<AssemblyResponse | null>(null)
  const [busy, setBusy] = useState<null | "check" | "build">(null)
  const [error, setError] = useState<string | null>(null)
  // Tiêu đề chỉ dùng khi tạo job — không kiểm tra lại mỗi lần gõ.
  const titleRef = useRef(title)
  useEffect(() => {
    titleRef.current = title
  }, [title])

  const call = useCallback(
    async (dryRun: boolean): Promise<AssemblyResponse | null> => {
      const masterId = await resolveApprovedMaster(assetId).catch(() => null)
      if (!masterId) {
        setError("Chưa có Master Image đã duyệt — mở Khu vực D để chốt ảnh gốc làm Master và sinh ảnh từng cảnh.")
        return null
      }
      const res = await fetch("/api/v1/creative-production/video-assembly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene_plan_id: loaded.ref,
          ...(loaded.jobId ? {} : { plan: loaded.plan }),
          master_asset_id: masterId,
          ...(audioJobId ? { audio_job_id: audioJobId } : {}),
          title: titleRef.current,
          dry_run: dryRun,
          ratio,
        }),
      })
      if (!res.ok) throw new Error(await readError(res))
      return (await res.json()) as AssemblyResponse
    },
    [assetId, audioJobId, loaded, ratio]
  )

  const check = useCallback(async () => {
    setBusy("check")
    setError(null)
    try {
      setReport(await call(true))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không kiểm tra được")
    } finally {
      setBusy(null)
    }
  }, [call])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kiểm tra sẵn sàng khi mở / đổi kịch bản
    void check()
  }, [check])

  const build = async () => {
    setBusy("build")
    setError(null)
    try {
      const r = await call(false)
      setReport(r)
      if (r?.video_job_id) onCreated(r.video_job_id)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không dựng được video")
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className="p-5 border-primary/30">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-body-sm font-bold text-text">
          <Clapperboard size={14} /> Dựng video từ bộ tài sản của kịch bản
        </h3>
        <Badge tone="neutral" className="text-caption">
          Kịch bản phiên bản {loaded.plan.revision} · {ratios.length} khung
        </Badge>
      </div>
      {ratios.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Khung video">
          {ratios.map((r) => {
            const v = variantOf(r)
            return (
              <Button
                key={r}
                type="button"
                role="tab"
                size="xs"
                variant={r === ratio ? "primary" : "outline"}
                aria-selected={r === ratio}
                onClick={() => setRatio(r)}
                className="font-bold"
              >
                Video {r}
                {v ? ` · ~${v.targetSeconds}s` : ""}
              </Button>
            )
          })}
        </div>
      )}
      <p className="mb-3 text-meta text-text-muted">
        Ảnh từng cảnh lấy từ Biến thể marketing, âm thanh dùng <b>nguyên bản phối Âm thanh</b> (không đọc lại), phụ đề, chuyển cảnh,
        thời lượng và khuôn theo kịch bản Chặng 05. Thiếu tài sản nào thì chưa dựng được.
      </p>

      {report && (
        <div className="mb-3 flex flex-col gap-1.5 text-meta">
          {report.ready ? (
            <p className="flex items-center gap-1.5 font-semibold text-success">
              <CheckCircle2 size={14} /> Đủ tài sản: {report.scenes.length} cảnh · ~{Math.round(report.total_duration_seconds)}s ·{" "}
              {report.aspect_ratio} · khuôn {report.format}
            </p>
          ) : (
            report.problems.map((p, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-1.5 text-danger">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle size={13} /> {p.message}
                </span>
                {p.kind === "missing_image" ? (
                  <Button type="button" variant="ghost" size="xs" onClick={() => onGoArea("d", p.sceneIndex, ratio)} className="font-bold underline text-danger">
                    Sinh cảnh {p.sceneIndex} khung {ratio} →
                  </Button>
                ) : p.kind !== "duration" && p.kind !== "ratio_out_of_scope" ? (
                  <Button type="button" variant="ghost" size="xs" onClick={() => onGoArea("c")} className="font-bold underline text-danger">
                    Mở Âm thanh →
                  </Button>
                ) : null}
              </div>
            ))
          )}
          {report.warnings.map((w, i) => (
            <p key={i} className="text-warning-text">⚠ {w}</p>
          ))}
        </div>
      )}
      {error && <p className="mb-2 text-meta text-danger">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" disabled={busy !== null} onClick={() => void check()}>
          {busy === "check" ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> : <RefreshCw size={13} />} Kiểm tra lại
        </Button>
        <Button size="sm" className="gap-1.5" disabled={busy !== null || !report?.ready} onClick={() => void build()}>
          {busy === "build" ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> : <Clapperboard size={13} />} Dựng video {ratio}
        </Button>
        <span className="text-caption text-text-muted">Tạo bản nháp miễn phí → duyệt kịch bản (bước 3) → dựng 5 credit → duyệt video (bước 4).</span>
      </div>
    </Card>
  )
}
