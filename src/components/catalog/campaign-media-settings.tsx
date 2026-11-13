"use client"

import React, { useState, useRef } from "react"
import { Image as ImageIcon, Video, UploadCloud, Trash2, CheckCircle2, Film } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { CatalogProduct } from "./catalog-management-tab"

interface CampaignMediaSettingsProps {
  customHeroImageUrl: string
  onCustomHeroImageChange: (url: string) => void
  videoUrl: string
  onVideoUrlChange: (url: string) => void
  selectedProducts: CatalogProduct[]
}

export function CampaignMediaSettings({
  customHeroImageUrl,
  onCustomHeroImageChange,
  videoUrl,
  onVideoUrlChange,
  selectedProducts,
}: CampaignMediaSettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isVideoUploading, setIsVideoUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [videoMode, setVideoMode] = useState<"file" | "link">("file")

  const handleVideoUpload = async (file: File) => {
    setIsVideoUploading(true)
    try {
      const urlRes = await fetch("/api/v1/assets/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mime_type: file.type || "video/mp4" }),
      })
      if (!urlRes.ok) {
        onVideoUrlChange(URL.createObjectURL(file))
        return
      }
      const { asset_id, storage_key, upload_url } = await urlRes.json()
      const putRes = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "video/mp4" },
        body: file,
      })
      if (!putRes.ok) throw new Error("Lỗi tải video lên storage")
      await fetch("/api/v1/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_id,
          product_id: null,
          kind: "ORIGINAL",
          storage_key,
          mime_type: file.type || "video/mp4",
          file_size: file.size,
        }),
      })
      const viewRes = await fetch(`/api/v1/assets/${asset_id}/view-url`)
      if (viewRes.ok) {
        const viewData = await viewRes.json()
        onVideoUrlChange(viewData.url)
      } else {
        onVideoUrlChange(URL.createObjectURL(file))
      }
    } catch {
      onVideoUrlChange(URL.createObjectURL(file))
    } finally {
      setIsVideoUploading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setUploadError(null)

    try {
      // 1. Lấy upload-url từ backend
      const urlRes = await fetch("/api/v1/assets/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mime_type: file.type }),
      })

      if (!urlRes.ok) {
        // Fallback: Sử dụng data URL hoặc object URL nếu môi trường dev không nối storage
        const localUrl = URL.createObjectURL(file)
        onCustomHeroImageChange(localUrl)
        return
      }

      const { asset_id, storage_key, upload_url } = await urlRes.json()

      // 2. Tải file lên storage
      const putRes = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })

      if (!putRes.ok) {
        throw new Error("Không thể tải ảnh lên kho lưu trữ.")
      }

      // 3. Đăng ký asset
      await fetch("/api/v1/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_id,
          product_id: null,
          kind: "ORIGINAL",
          storage_key,
          mime_type: file.type,
          file_size: file.size,
        }),
      })

      // 4. Lấy URL ký sẵn (HMAC) để hiển thị trực tiếp trên trình duyệt
      const viewRes = await fetch(`/api/v1/assets/${asset_id}/view-url`)
      if (viewRes.ok) {
        const viewData = await viewRes.json()
        onCustomHeroImageChange(viewData.url)
      } else {
        const localUrl = URL.createObjectURL(file)
        onCustomHeroImageChange(localUrl)
      }
    } catch {
      // Graceful fallback cho preview trực tiếp
      const localUrl = URL.createObjectURL(file)
      onCustomHeroImageChange(localUrl)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-surface-alt border border-border space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <ImageIcon size={15} />
          </div>
          <div>
            <h4 className="text-caption font-bold text-text">Tùy biến Ảnh Banner & Video Chiến Dịch</h4>
            <p className="text-caption text-text-muted">Tải ảnh banner đại diện riêng hoặc chèn video TikTok / YouTube giới thiệu hoa</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cột 1: Ảnh Banner Hero */}
        <div className="space-y-3">
          <label className="block text-caption font-bold text-text flex items-center gap-1.5">
            <ImageIcon size={13} className="text-primary" />
            <span>Ảnh đầu trang</span>
          </label>

          {customHeroImageUrl ? (
            <div className="relative aspect-16/9 rounded-xl overflow-hidden border border-border shadow-xs group">
              <img
                src={customHeroImageUrl}
                alt="Banner chiến dịch"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 text-caption bg-white text-text border-white"
                >
                  Đổi ảnh khác
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCustomHeroImageChange("")}
                  className="h-8 text-caption bg-danger-bg text-danger border-danger/30"
                >
                  <Trash2 size={13} />
                  <span>Mặc định</span>
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-auto text-[length:inherit] font-[inherit] w-full relative aspect-16/9 rounded-xl border-2 border-dashed border-border hover:border-primary/60 bg-surface flex flex-col items-center justify-center gap-2 cursor-pointer p-4 text-center transition-colors hover:bg-surface"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <UploadCloud size={20} />
              </div>
              <div className="text-caption font-bold text-text">
                {isUploading ? "Đang tải ảnh..." : "Bấm để tải ảnh Banner Hero"}
              </div>
              <div className="text-caption text-text-muted">Hỗ trợ JPG, PNG, WEBP tỷ lệ 16:9</div>
            </Button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file)
            }}
          />

          {/* Chọn nhanh từ các sản phẩm tâm điểm */}
          {selectedProducts.length > 0 && (
            <div>
              <span className="text-caption text-text-muted font-medium block mb-1.5">
                Hoặc chọn nhanh từ ảnh sản phẩm đã chọn:
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {selectedProducts.map((p, idx) => (
                  <Button variant="outline"
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (p.imageUrl) onCustomHeroImageChange(p.imageUrl)
                    }}
                    className={`px-0 py-0 text-[length:inherit] font-[inherit] gap-0 w-11 h-11 rounded-lg overflow-hidden border shrink-0 relative transition-all ${
                      customHeroImageUrl === p.imageUrl ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                    }`}
                    title={p.name}
                  >
                    <img
                      src={p.imageUrl || `/images/flowers/g00${(idx % 2) + 1}.jpeg`}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                    {customHeroImageUrl === p.imageUrl && (
                      <div className="absolute inset-0 bg-primary/40 flex items-center justify-center text-white">
                        <CheckCircle2 size={14} />
                      </div>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cột 2: Video Chiến Dịch (Tải file hoặc Dán Link) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-caption font-bold text-text flex items-center gap-1.5">
              <Film size={13} className="text-primary" />
              <span>Video Giới Thiệu (Tải Tệp hoặc Link)</span>
            </label>
            <div className="flex items-center bg-surface p-0.5 rounded-lg border border-border text-caption">
              <Button variant="ghost"
                type="button"
                onClick={() => setVideoMode("file")}
                className={`h-auto text-[length:inherit] gap-0 px-2 py-0.5 rounded-md font-bold transition-colors ${
                  videoMode === "file" ? "bg-primary text-white shadow-xs hover:bg-primary" : "text-text-muted hover:text-text"
                }`}
              >
                Tải tệp MP4
              </Button>
              <Button variant="ghost"
                type="button"
                onClick={() => setVideoMode("link")}
                className={`h-auto text-[length:inherit] gap-0 px-2 py-0.5 rounded-md font-bold transition-colors ${
                  videoMode === "link" ? "bg-primary text-white shadow-xs hover:bg-primary" : "text-text-muted hover:text-text"
                }`}
              >
                Dán link TikTok/YT
              </Button>
            </div>
          </div>

          {videoMode === "file" ? (
            <div>
              <Button variant="ghost"
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="h-auto text-[length:inherit] font-[inherit] w-full relative aspect-16/9 rounded-xl border-2 border-dashed border-border hover:border-primary/60 bg-surface flex flex-col items-center justify-center gap-2 cursor-pointer p-4 text-center transition-colors hover:bg-surface"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Video size={20} />
                </div>
                <div className="text-caption font-bold text-text">
                  {isVideoUploading ? "Đang tải video lên..." : "Bấm để tải tệp video từ máy"}
                </div>
                <div className="text-caption text-text-muted">Hỗ trợ tệp MP4, MOV, WEBM (Tối đa 100MB)</div>
              </Button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleVideoUpload(file)
                }}
              />
            </div>
          ) : (
            <div>
              <Input
                value={videoUrl}
                onChange={(e) => onVideoUrlChange(e.target.value)}
                placeholder="Dán link YouTube hoặc TikTok (VD: https://youtube.com/watch?v=...)"
                className="h-9 text-caption"
              />
              <span className="text-caption text-text-muted mt-1 block">
                Video từ TikTok hoặc YouTube sẽ được nhúng phát trực tiếp.
              </span>
            </div>
          )}

          {videoUrl.trim() && (
            <div className="p-2.5 rounded-xl bg-surface border border-border flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <Video size={15} className="text-primary shrink-0" />
                <span className="text-caption font-bold text-text truncate">{videoUrl}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onVideoUrlChange("")}
                className="h-6 text-caption text-danger hover:bg-danger-bg px-2"
              >
                Xóa video
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
