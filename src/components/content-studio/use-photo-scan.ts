"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { errorText } from "@/lib/error-text"
import { mergePhotos, planScan, pollDecision, POLL_INTERVAL_MS, type PhotoBatchMode } from "@/modules/content-studio/domain/photo-batch"
import { requestScan, scanResults, scanStatus, uploadPhoto, type ScanResult } from "./content-api"

export interface PickedPhoto {
  readonly id: string
  readonly file: File
  readonly previewUrl: string
  readonly name: string
  readonly type: string
  readonly size: number
}

export type ScanPhase = "pick" | "uploading" | "scanning" | "review" | "failed"

export interface PhotoScanState {
  mode: PhotoBatchMode
  photos: readonly PickedPhoto[]
  phase: ScanPhase
  progress: string | null
  results: readonly ScanResult[]
  /** Ảnh góc khác (một sản phẩm nhiều góc) — gắn vào sản phẩm khi Thẻ sản phẩm được duyệt */
  extraPhotos: readonly PickedPhoto[]
  errors: readonly string[]
  setMode: (m: PhotoBatchMode) => void
  addFiles: (files: FileList | readonly File[]) => void
  removePhoto: (id: string) => void
  start: () => Promise<void>
  reloadResults: () => Promise<void>
  attachExtras: (productId: string) => Promise<string | null>
  reset: () => void
}

const toPicked = (file: File): PickedPhoto => ({
  id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file), name: file.name, type: file.type, size: file.size,
})

/**
 * Bước 1 — tải ảnh và quét: chọn kiểu (một sản phẩm nhiều góc / nhiều sản phẩm), tải ảnh lên kho, gửi một lượt
 * quét, chờ có trần (`pollDecision`), rồi đọc các Thẻ sản phẩm chờ duyệt. Khoá chống trùng giữ nguyên khi thử lại.
 */
export function usePhotoScan(): PhotoScanState {
  const [mode, setMode] = useState<PhotoBatchMode>("ONE_PRODUCT")
  const [photos, setPhotos] = useState<PickedPhoto[]>([])
  const [phase, setPhase] = useState<ScanPhase>("pick")
  const [progress, setProgress] = useState<string | null>(null)
  const [results, setResults] = useState<ScanResult[]>([])
  const [extraPhotos, setExtraPhotos] = useState<PickedPhoto[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const jobRef = useRef<string | null>(null)
  const keyRef = useRef<string | null>(null)
  const alive = useRef(true)

  useEffect(() => () => { alive.current = false }, [])

  const addFiles = useCallback((files: FileList | readonly File[]) => {
    const incoming = Array.from(files).map(toPicked)
    setPhotos((cur) => {
      const merged = mergePhotos(cur, incoming)
      setErrors(merged.errors)
      const kept = new Set(merged.photos.map((p) => p.id))
      incoming.filter((p) => !kept.has(p.id)).forEach((p) => URL.revokeObjectURL(p.previewUrl))
      return merged.photos
    })
  }, [])

  const removePhoto = useCallback((id: string) => {
    setPhotos((cur) => {
      const gone = cur.find((p) => p.id === id)
      if (gone) URL.revokeObjectURL(gone.previewUrl)
      return cur.filter((p) => p.id !== id)
    })
  }, [])

  const reloadResults = useCallback(async () => {
    if (!jobRef.current) return
    const rows = await scanResults(jobRef.current)
    if (alive.current) setResults(rows)
  }, [])

  const waitForScan = useCallback(async (jobId: string) => {
    for (let attempt = 1; ; attempt++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      if (!alive.current) return
      const s = await scanStatus(jobId).catch(() => null)
      const decision = pollDecision(s?.status ?? null, attempt)
      if (decision === "WAIT") {
        setProgress(s?.status === "PROCESSING" ? "Đang đọc ảnh và lập Thẻ sản phẩm…" : "Đang xếp hàng chờ quét…")
        continue
      }
      if (decision === "DONE") {
        await reloadResults()
        setPhase("review")
        setProgress(null)
      } else {
        setErrors([decision === "TIMED_OUT" ? "Quét lâu hơn dự kiến — bấm “Thử lại” để xem tiếp kết quả" : (s?.error || "Lượt quét không thành công — thử lại")])
        setPhase("failed")
      }
      return
    }
  }, [reloadResults])

  const start = useCallback(async () => {
    if (photos.length === 0) return
    setErrors([])
    try {
      // Đã có lượt quét (thử lại sau khi chờ quá lâu) → chỉ chờ tiếp, không gửi lại
      if (!jobRef.current) {
        setPhase("uploading")
        const toScan = mode === "ONE_PRODUCT" ? photos.slice(0, 1) : photos
        const ids: string[] = []
        for (const [i, p] of toScan.entries()) {
          setProgress(`Đang tải ảnh ${i + 1}/${toScan.length} lên kho…`)
          ids.push(await uploadPhoto(p.file, null))
        }
        const plan = planScan(mode, ids)
        keyRef.current ??= `content-scan-${crypto.randomUUID()}`
        setProgress("Đang gửi ảnh đi quét…")
        jobRef.current = await requestScan(plan.scanAssetIds, keyRef.current)
        setExtraPhotos(mode === "ONE_PRODUCT" ? photos.slice(1) : [])
      }
      setPhase("scanning")
      setProgress("Đang xếp hàng chờ quét…")
      await waitForScan(jobRef.current)
    } catch (e) {
      if (!alive.current) return
      setErrors([errorText(e) || "Chưa quét được ảnh — thử lại"])
      setPhase("failed")
    }
  }, [mode, photos, waitForScan])

  /** Gắn các góc chụp khác vào sản phẩm vừa tạo; trả câu lỗi (nếu có) để hiện, không chặn luồng chính. */
  const attachExtras = useCallback(async (productId: string): Promise<string | null> => {
    const pending = extraPhotos
    if (pending.length === 0) return null
    const failed: string[] = []
    for (const p of pending) {
      try { await uploadPhoto(p.file, productId) } catch { failed.push(p.name) }
    }
    setExtraPhotos([])
    return failed.length ? `Chưa gắn được ${failed.length} ảnh góc khác vào sản phẩm: ${failed.join(", ")}` : null
  }, [extraPhotos])

  const reset = useCallback(() => {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    jobRef.current = null
    keyRef.current = null
    setPhotos([]); setResults([]); setExtraPhotos([]); setErrors([]); setProgress(null); setPhase("pick")
  }, [photos])

  return { mode, photos, phase, progress, results, extraPhotos, errors, setMode, addFiles, removePhoto, start, reloadResults, attachExtras, reset }
}
