"use client"

import { Button } from "@/components/ui/button"
import React, { useState } from "react"
import { ImageIcon, Trash2 } from "@/components/ui/icons"

interface SubcontractQcGalleryProps {
  photos: string[]
  onDeletePhoto: (photoUrl: string) => void
}

export function SubcontractQcGallery({ photos, onDeletePhoto }: SubcontractQcGalleryProps) {
  const [brokenPhotos, setBrokenPhotos] = useState<Record<string, boolean>>({})

  if (photos.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5 pt-2 border-t border-border">
      <span className="text-caption font-bold text-text-muted flex items-center gap-1">
        <ImageIcon size={13} /> Các ảnh thành phẩm đã tải lên:
      </span>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((url, idx) => {
          let imgSrc =
            url.startsWith("http") || url.startsWith("data:") || url.startsWith("/api/v1/storage/")
              ? url
              : url.startsWith("org/")
              ? `/api/v1/storage/${url}`
              : url

          if (
            typeof window !== "undefined" &&
            (imgSrc.includes("localhost:") || imgSrc.includes("127.0.0.1:"))
          ) {
            try {
              const parsed = new URL(imgSrc)
              imgSrc = `${window.location.origin}${parsed.pathname}${parsed.search}`
            } catch {
              // ignore
            }
          }

          const isBroken = Boolean(brokenPhotos[url])

          return (
            <div
              key={idx}
              className="relative h-24 rounded-lg overflow-hidden border border-border bg-surface-alt shadow-xs group"
            >
              {!isBroken ? (
                <img
                  src={imgSrc}
                  alt={`Ảnh QC #${idx + 1}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                  onError={() => setBrokenPhotos((prev) => ({ ...prev, [url]: true }))}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-surface-alt text-text-muted p-1 text-center">
                  <ImageIcon size={18} className="opacity-40 mb-1" />
                  <span className="text-caption leading-tight font-medium">Ảnh QC #{idx + 1}</span>
                  <span className="text-caption text-danger/80">Không tải được</span>
                </div>
              )}
              <Button variant="ghost"
                type="button"
                onClick={() => onDeletePhoto(url)}
                title="Xóa ảnh này"
                className="text-[length:inherit] h-auto font-[inherit] gap-0 absolute top-1 right-1 p-1 rounded-md bg-black/60 hover:bg-danger text-white transition-colors opacity-80 hover:opacity-100 z-10 cursor-pointer"
              >
                <Trash2 size={13} />
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
