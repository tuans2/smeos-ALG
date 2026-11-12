"use client"

import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import React, { useEffect, useRef, useState } from "react"
import { Upload, X, CheckCircle2, AlertCircle, Play, ImagePlus } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { LocalImagePreview } from "@/components/upload/local-image-preview"
import { createPickedMediaUrls } from "./picked-media-urls"
import { readApiError } from "@/components/greeting-card/api-error"
import { MEDIA_LIMITS, mediaKindOf, mediaSelectionError } from "@/modules/greeting-card/domain/media-limits"

interface CoordinatorImageUploadProps {
  orderId: string
  endpoint: "product-photo" | "recipient-photo"
  label: string
  /** `false` khi tiệm bắt buộc ảnh (gói Nghiêm ngặt) — không hiện "Bỏ qua ảnh" */
  allowSkip?: boolean | undefined
  onSuccess: () => void
  onCancel: () => void
}

type UploadState = "idle" | "uploading" | "success" | "error"
/** `url` chỉ có với video (thẻ `<video>` cần URL); ảnh xem trước vẽ lên canvas, không qua URL. */
type Picked = { id: number; file: File; url: string | null; kind: "image" | "video"; duration: number | null }

/** Thời lượng video (giây) đo bằng trình duyệt — máy chủ không đọc được. */
function videoDuration(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video")
    v.preload = "metadata"
    v.onloadedmetadata = () => resolve(Number.isFinite(v.duration) ? v.duration : null)
    v.onerror = () => resolve(null)
    v.src = url
  })
}

async function uploadOne(file: File): Promise<string> {
  const urlRes = await fetch("/api/v1/assets/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mime_type: file.type }),
  })
  if (!urlRes.ok) throw new Error(await readApiError(urlRes, "Lỗi lấy địa chỉ tải tệp"))
  const { asset_id, storage_key, upload_url } = (await urlRes.json()) as { asset_id: string; storage_key: string; upload_url: string }
  const putRes = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": file.type }, body: file })
  if (!putRes.ok) throw new Error("Lỗi tải tệp lên kho lưu trữ")
  const registerRes = await fetch("/api/v1/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asset_id, storage_key, kind: "ORIGINAL", mime_type: file.type, file_size: file.size }),
  })
  if (!registerRes.ok) throw new Error("Lỗi đăng ký tệp trong hệ thống")
  return asset_id
}

/**
 * Tải ảnh/video cho một lần chụp (thành phẩm hoặc người nhận): 1–5 ảnh, 0–2 video ≤ 15 giây.
 * Lưới xem trước, xoá từng tệp trước khi lưu; cả bộ gắn vào đơn trong một lần.
 */
export function CoordinatorImageUpload({ orderId, endpoint, label, allowSkip = true, onSuccess, onCancel }: CoordinatorImageUploadProps) {
  const [confirm, confirmDialog] = useConfirmDialog()
  const inputRef = useRef<HTMLInputElement>(null)
  const [picked, setPicked] = useState<Picked[]>([])
  const [state, setState] = useState<UploadState>("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const nextId = useRef(0)

  // URL video: bỏ tệp nào thu hồi đúng tệp đó, đóng màn thu hồi phần còn lại (picked-media-urls.ts)
  const mediaUrls = useRef(createPickedMediaUrls())
  useEffect(() => {
    const urls = mediaUrls.current
    return () => urls.releaseAll()
  }, [])
  const removePicked = (target: Picked) => {
    mediaUrls.current.release(target.url)
    setPicked((list) => list.filter((x) => x !== target))
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    const added: Picked[] = []
    for (const file of files) {
      const kind = mediaKindOf(file.type)
      if (!kind) {
        setErrorMsg("Chỉ nhận ảnh JPG, PNG, WEBP và video MP4, MOV, WEBM")
        continue
      }
      const url = kind === "video" ? mediaUrls.current.create(file) : null
      added.push({ id: nextId.current++, file, url, kind, duration: url ? await videoDuration(url) : null })
    }
    const next = [...picked, ...added]
    const error = mediaSelectionError(next.map((p) => ({ mimeType: p.file.type, sizeBytes: p.file.size, durationSeconds: p.duration })))
    // Thiếu ảnh chỉ báo khi lưu; các lỗi khác báo ngay và không nhận tệp vừa chọn
    if (error && error !== "Cần ít nhất 1 ảnh") {
      added.forEach((p) => mediaUrls.current.release(p.url))
      setErrorMsg(error)
      return
    }
    setErrorMsg("")
    setPicked(next)
  }

  async function handleUpload() {
    const error = mediaSelectionError(picked.map((p) => ({ mimeType: p.file.type, sizeBytes: p.file.size, durationSeconds: p.duration })))
    if (error) {
      setErrorMsg(error)
      return
    }
    setState("uploading")
    setErrorMsg("")
    try {
      const assetIds: string[] = []
      for (const p of picked) assetIds.push(await uploadOne(p.file))
      const attachRes = await fetch(`/api/v1/greeting-card/orders/${orderId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_ids: assetIds }),
      })
      if (!attachRes.ok) throw new Error(await readApiError(attachRes, "Lỗi gắn ảnh vào đơn hàng"))
      setState("success")
      setTimeout(onSuccess, 1200)
    } catch (err) {
      setState("error")
      setErrorMsg(err instanceof Error ? err.message : "Lỗi không xác định")
    }
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 size={40} className="text-success" aria-hidden="true" />
        <p className="text-body font-bold text-success">{label} đã được cập nhật!</p>
        <p className="text-body-sm text-text-muted">Khách hàng sẽ thấy trên trang theo dõi đơn.</p>
      </div>
    )
  }

  const images = picked.filter((p) => p.kind === "image").length
  const videos = picked.length - images
  const full = images >= MEDIA_LIMITS.imagesMax && videos >= MEDIA_LIMITS.videosMax

  return (
    <div className="flex flex-col gap-4">
      {confirmDialog}
      <p className="text-body-sm text-text-muted">
        {label}: {MEDIA_LIMITS.imagesMin}–{MEDIA_LIMITS.imagesMax} ảnh, tối đa {MEDIA_LIMITS.videosMax} video (mỗi video ≤ {MEDIA_LIMITS.videoMaxSeconds} giây).
      </p>

      <ul className="grid grid-cols-3 gap-2" aria-label="Tệp đã chọn">
        {picked.map((p, i) => (
          <li key={p.id} className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-alt">
            {p.url ? (
              <>
                <video src={p.url} muted preload="metadata" className="h-full w-full object-cover" />
                <span className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded bg-text/70 px-1 text-caption text-surface">
                  <Play size={10} aria-hidden="true" />
                  {p.duration ? `${Math.round(p.duration)}s` : "video"}
                </span>
              </>
            ) : (
              <LocalImagePreview file={p.file} label={`Ảnh ${i + 1}`} width={256} height={256} className="h-full w-full" />
            )}
            <Button variant="ghost"
              type="button"
              aria-label={`Bỏ tệp ${i + 1}`}
              onClick={() => removePicked(p)}
              disabled={state === "uploading"}
              className="text-[length:inherit] h-auto font-[inherit] gap-0 absolute right-1 top-1 rounded-full bg-text/70 p-1 text-surface hover:bg-text/70"
            >
              <X size={12} aria-hidden="true" />
            </Button>
          </li>
        ))}
        {!full && (
          <li>
            <Button variant="ghost"
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={state === "uploading"}
              className="text-[length:inherit] h-auto p-0 font-[inherit] flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-text-muted hover:border-primary/50 hover:bg-primary/5"
            >
              {picked.length === 0 ? <Upload size={22} aria-hidden="true" /> : <ImagePlus size={22} aria-hidden="true" />}
              <span className="text-caption font-medium">{picked.length === 0 ? "Chọn ảnh/video" : "Thêm"}</span>
            </Button>
          </li>
        )}
      </ul>
      <p className="text-caption text-text-muted">
        Đã chọn {images}/{MEDIA_LIMITS.imagesMax} ảnh · {videos}/{MEDIA_LIMITS.videosMax} video
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={(e) => void handleFiles(e)}
      />

      {errorMsg && (
        <div role="alert" className="flex items-center gap-2 text-danger text-body-sm p-3 bg-danger-bg rounded-xl border border-danger/30">
          <AlertCircle size={16} className="shrink-0" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tác vụ Bỏ qua ảnh nếu giao gấp (Spec #13) */}
      <div className="pt-2 border-t border-border flex items-center justify-between">
        {allowSkip ? (
        <Button variant="ghost"
          type="button"
          disabled={state === "uploading"}
          onClick={async () => {
            if (!(await confirm({ title: `Bỏ qua ${label} để giao gấp?`, consequence: "Hệ thống ghi nhận bước này là đã bỏ qua.", confirmLabel: "Bỏ qua và giao gấp" }))) return
            setState("uploading")
            setErrorMsg("")
            try {
              const res = await fetch(`/api/v1/greeting-card/orders/${orderId}/${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ skip_photo: true, skip_reason: "Giao gấp theo yêu cầu" }),
              })
              if (!res.ok) throw new Error(await readApiError(res, "Lỗi khi bỏ qua ảnh"))
              setState("success")
              setTimeout(onSuccess, 1000)
            } catch (err) {
              setState("error")
              setErrorMsg(err instanceof Error ? err.message : "Lỗi không xác định")
            }
          }}
          className="h-auto p-0 gap-0 text-caption font-semibold text-text-muted hover:text-danger underline transition-colors"
        >
          Giao gấp — Bỏ qua {label.toLowerCase()}
        </Button>
        ) : (
          <p className="text-caption text-text-muted">Tiệm bắt buộc {label.toLowerCase()} trước khi làm bước tiếp theo</p>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} className="h-9 text-caption">
            <X size={14} className="mr-1" aria-hidden="true" />
            Huỷ
          </Button>
          <Button type="button" size="sm" disabled={images === 0 || state === "uploading"} onClick={() => void handleUpload()} className="h-9 text-caption">
            {state === "uploading" ? "Đang tải lên..." : `Lưu ${picked.length} tệp`}
          </Button>
        </div>
      </div>
    </div>
  )
}
