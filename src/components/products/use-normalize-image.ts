"use client"

import { useState, useRef, useCallback } from "react"
import type { IndustryPluginContract } from "@/modules/organization/domain/industry-plugin-contract"

export type NormalizeStatus = "idle" | "uploading" | "processing" | "succeeded" | "error"

export interface NormalizeResult {
  jobId: string
  resultUrl: string | null
}

interface UseNormalizeImageOptions {
  /** File ảnh gốc (từ form tạo mới) — dùng khi chưa có assetId */
  imageFile?: File | null | undefined
  /** Asset đã upload (từ trang chi tiết sản phẩm) — dùng thay upload lại */
  existingAssetId?: string | null | undefined
  /** URL ảnh đã có (trang chi tiết) — hook sẽ fetch về Blob rồi upload */
  imageUrl?: string | null | undefined
  industry: IndustryPluginContract
}

const POLL_INTERVAL_MS = 3000
const MAX_POLL_ATTEMPTS = 40 // ~2 phút

function buildStudioPrompt(industry: IndustryPluginContract): string {
  const styles = industry.aiConfig.studioBackgroundStyles
  const focus = industry.aiConfig.visionFocus
  const style = styles[0] ?? "nền trắng studio sạch sẽ chuyên nghiệp"
  return (
    `Transform the background into a professional marketing studio photo. ` +
    `Background style: ${style}. ` +
    `Subject focus: ${focus}. ` +
    `Keep the product exactly as-is — same shape, colors, details, quantity. ` +
    `Apply professional studio lighting, soft shadows, and commercial photography aesthetics. ` +
    `The result must look like a high-end product catalog photo.`
  )
}

/**
 * Hook chuẩn hóa ảnh sản phẩm thành ảnh marketing studio.
 *
 * Luồng:
 *   1. Nếu có `imageFile`: upload → lấy asset_id → gọi POST /media/optimizations
 *   2. Nếu có `existingAssetId`: gọi thẳng POST /media/optimizations
 *   3. Poll GET /media/optimizations/:id cho đến khi `status = COMPLETED`
 *   4. Trả `resultUrl` để preview
 */
export function useNormalizeImage({
  imageFile,
  existingAssetId,
  imageUrl,
  industry,
}: UseNormalizeImageOptions) {
  const [status, setStatus] = useState<NormalizeStatus>("idle")
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollCount = useRef(0)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const pollJob = useCallback(
    async (id: string) => {
      pollCount.current += 1
      if (pollCount.current > MAX_POLL_ATTEMPTS) {
        stopPolling()
        setStatus("error")
        setErrorMsg("Quá thời gian xử lý. Vui lòng thử lại.")
        return
      }

      try {
        const res = await fetch(`/api/v1/media/optimizations/${id}`)
        if (!res.ok) throw new Error(`Poll thất bại (${res.status})`)
        const data = (await res.json()) as {
          status?: string
          result?: string | null
          error?: string | null
          outputs?: {
            master_url?: string | null
            variant_urls?: Record<string, string>
          }
          result_url?: string
        }

        if (data.status === "COMPLETED") {
          stopPolling()
          const url =
            data.outputs?.master_url ??
            data.outputs?.variant_urls?.studio ??
            data.outputs?.variant_urls?.Studio ??
            data.result_url ??
            null
          setResultUrl(url)
          setStatus("succeeded")
          return
        }

        if (data.status === "FAILED" || data.error) {
          stopPolling()
          setStatus("error")
          setErrorMsg(data.error ?? "Xử lý ảnh thất bại. Vui lòng thử lại.")
          return
        }

        // Tiếp tục poll
        pollRef.current = setTimeout(() => {
          void pollJob(id)
        }, POLL_INTERVAL_MS)
      } catch {
        stopPolling()
        setStatus("error")
        setErrorMsg("Không thể kiểm tra trạng thái xử lý.")
      }
    },
    [stopPolling]
  )

  const normalize = useCallback(async () => {
    if (status === "uploading" || status === "processing") return
    if (!imageFile && !existingAssetId && !imageUrl) {
      setErrorMsg("Chưa có ảnh sản phẩm để chuẩn hóa.")
      return
    }

    setStatus("uploading")
    setErrorMsg(null)
    setResultUrl(null)
    pollCount.current = 0

    try {
      let assetId = existingAssetId ?? null

      // Bước 1: upload ảnh nếu chưa có assetId
      // Ưu tiên: existingAssetId > imageFile > imageUrl (fetch → Blob)
      let fileToUpload: File | null = imageFile ?? null

      if (!assetId && !fileToUpload && imageUrl) {
        // Fetch URL về Blob để upload
        const fetchRes = await fetch(imageUrl)
        if (!fetchRes.ok) throw new Error("Không tải được ảnh gốc để xử lý")
        const blob = await fetchRes.blob()
        const ext = blob.type.includes("png") ? "png" : "jpg"
        fileToUpload = new File([blob], `product-image.${ext}`, { type: blob.type || "image/jpeg" })
      }

      if (!assetId && fileToUpload) {
        const urlRes = await fetch("/api/v1/assets/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: null, mime_type: fileToUpload.type }),
        })
        if (!urlRes.ok) throw new Error("Không lấy được upload URL")
        const { asset_id, storage_key, upload_url } = (await urlRes.json()) as {
          asset_id: string
          storage_key: string
          upload_url: string
        }

        const uploadRes = await fetch(upload_url, {
          method: "PUT",
          headers: { "Content-Type": fileToUpload.type },
          body: fileToUpload,
        })
        if (!uploadRes.ok) throw new Error("Upload ảnh thất bại")

        // Đăng ký asset ORIGINAL vào cơ sở dữ liệu (Chặng 01 BRING)
        const regRes = await fetch("/api/v1/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            asset_id,
            storage_key,
            kind: "ORIGINAL",
            mime_type: fileToUpload.type,
            file_size: fileToUpload.size,
          }),
        })
        if (!regRes.ok) throw new Error("Đăng ký ảnh vào hệ thống thất bại")

        assetId = asset_id
      }

      if (!assetId) throw new Error("Không xác định được asset cần xử lý")

      setStatus("processing")

      // Bước 2: Tạo optimization job (background)
      const idempotencyKey = `normalize-${assetId}-${Date.now()}`
      const prompt = buildStudioPrompt(industry)

      const jobRes = await fetch("/api/v1/media/optimizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          asset_id: assetId,
          config: {
            engine: "cloud_provider",
            enhancer_provider: "openai",
            mode: "auto",
            prompt,
          },
        }),
      })

      if (!jobRes.ok) {
        const err = (await jobRes.json().catch(() => ({}))) as { message?: string }
        throw new Error(err.message ?? `Không thể tạo job xử lý (${jobRes.status})`)
      }

      const jobData = (await jobRes.json()) as { job_id: string; status: string }
      setJobId(jobData.job_id)

      // Bước 3: Bắt đầu poll
      pollRef.current = setTimeout(() => {
        void pollJob(jobData.job_id)
      }, POLL_INTERVAL_MS)
    } catch (e) {
      setStatus("error")
      setErrorMsg(e instanceof Error ? e.message : "Có lỗi xảy ra. Vui lòng thử lại.")
    }
  }, [status, imageFile, existingAssetId, imageUrl, industry, pollJob])

  const reset = useCallback(() => {
    stopPolling()
    setStatus("idle")
    setResultUrl(null)
    setJobId(null)
    setErrorMsg(null)
    pollCount.current = 0
  }, [stopPolling])

  return {
    normalize,
    reset,
    status,
    resultUrl,
    jobId,
    errorMsg,
    isLoading: status === "uploading" || status === "processing",
  }
}
