"use client"

import { formatDateTime } from "@/lib/i18n/formatters"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Package } from "@/components/ui/icon-set/package"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function PackageCreateCard({
  producedScenes,
  multiRatio,
  planRatios,
  suggestedVideos,
  urlAudioJobId,
  bDraft,
  goRework,
  handleCreate,
  busy,
  error,
}: {
  producedScenes: Array<{
    id: string
    url?: string | null
    approval_state: string
    metadata?: Record<string, unknown> | null
  }>
  multiRatio: boolean
  planRatios: string[]
  suggestedVideos: Array<{
    id: string
    aspect_ratio: string
    stage: string
    video_approval: string
  }>
  urlAudioJobId: string | null
  bDraft: {
    updated_at: string
    posts: Array<{ channel: string; text: string; hashtags?: string[] }>
  } | null
  goRework: (area: "b" | "c" | "d" | "e", extra?: Record<string, string>) => void
  handleCreate: () => void
  busy: string | null
  error: string | null
}) {
  return (
    <Card className="w-full max-w-3xl mx-auto p-6 space-y-3">
      <div className="flex items-center gap-2.5">
        <Package size={18} className="text-primary" />
        <h3 className="text-title-sm font-bold text-text">Chặng 07 — Tạo gói chiến dịch</h3>
      </div>
      <p className="text-body-sm text-text-muted">
        Chưa có gói nào cho Master Image này. Dưới đây là những gì đã sản xuất ở Nội dung–E — bấm tạo gói để đưa
        sẵn vào, sau đó chỉnh, chạy QA và duyệt.
      </p>

      <div className="rounded-xl border border-border bg-surface-alt p-3.5 space-y-3">
        <div className="text-meta font-bold text-text">
          Ảnh biến thể theo kịch bản: {producedScenes.length} ảnh
          {multiRatio ? ` · ${planRatios.length} khung (${planRatios.join(", ")})` : ""}
        </div>
        {producedScenes.length > 0 ? (
          <div className="grid grid-cols-5 gap-2">
            {producedScenes.map((a) => (
              <div key={a.id} className="relative aspect-square overflow-hidden rounded-lg border border-border bg-white">
                {a.url && <img src={a.url} alt="" className="h-full w-full object-cover" />}
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-caption font-bold text-white">
                  Cảnh {String(a.metadata?.scene_index ?? "")}
                  {multiRatio && typeof a.metadata?.ratio === "string" ? ` · ${a.metadata.ratio}` : ""}
                </span>
                {a.approval_state !== "APPROVED" && (
                  <span className="absolute bottom-1 left-1 rounded bg-warning-bg px-1 text-caption text-warning-text">chưa duyệt</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-meta text-text-muted">Chưa có ảnh — sinh ảnh ở Biến thể marketing.</p>
        )}
        <div className="text-meta text-text">
          <span className="font-bold">Video:</span>{" "}
          {suggestedVideos.length > 0
            ? suggestedVideos
                .map((v) => `${multiRatio ? `${v.aspect_ratio} · ` : ""}tác vụ ${v.id.slice(0, 8)} · ${v.video_approval === "APPROVED" ? "đã duyệt video" : v.stage === "RENDER_COMPLETED" ? "đã dựng xong, chưa duyệt video" : v.stage}`)
                .join(" | ")
            : "chưa có video đã dựng"}
          {multiRatio && suggestedVideos.length < planRatios.length && (
            <span className="ml-1 text-warning-text">
              — thiếu video khung {planRatios.filter((r) => !suggestedVideos.some((v) => v.aspect_ratio === r)).join(", ")}
            </span>
          )}
        </div>
        <div className="text-meta text-text">
          <span className="font-bold">Âm thanh:</span>{" "}
          {urlAudioJobId ? `tác vụ ${urlAudioJobId.slice(0, 8)}` : "chưa có"}
        </div>
        <div className="text-meta text-text">
          <span className="font-bold">Bài đăng (Nội dung):</span>{" "}
          {bDraft && bDraft.posts.length > 0
            ? `${bDraft.posts.length} kênh (${bDraft.posts.map((p) => p.channel).join(", ")}) · tự lưu lúc ${formatDateTime(bDraft.updated_at)}`
            : "chưa có — viết ở Khu vực B (tự lưu) hoặc soạn trực tiếp sau khi tạo gói"}
          {!(bDraft && bDraft.posts.length > 0) && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="ml-2 font-bold text-primary hover:underline p-0 h-auto"
              onClick={() => goRework("b")}
            >
              Mở Nội dung →
            </Button>
          )}
        </div>
      </div>

      <Button onClick={handleCreate} disabled={busy !== null} className="gap-2">
        {busy === "create" ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <Package size={14} />}
        Tạo gói chiến dịch với các tài sản trên
      </Button>
      {error && <p className="text-meta text-danger">{error}</p>}
    </Card>
  )
}
