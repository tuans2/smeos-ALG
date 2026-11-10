"use client"

import React from "react"
import { Trash2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { LocalImagePreview } from "@/components/upload/local-image-preview"

export interface SubcontractPodPreviewProps {
  file: File
  submitting: boolean
  onCancel: () => void
}

export function SubcontractPodPreview({
  file,
  submitting,
  onCancel,
}: SubcontractPodPreviewProps) {
  return (
    <div className="flex flex-col gap-3 p-3 rounded-xl bg-surface-muted border border-border">
      <div className="relative w-full h-56 rounded-lg overflow-hidden bg-black/5 flex items-center justify-center">
        <LocalImagePreview file={file} label="Xem trước ảnh giao hàng" fit="contain" width={640} height={448} className="w-full h-full" />
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={onCancel}
          className="flex-1 h-10 text-caption font-bold"
        >
          <Trash2 size={15} className="mr-1 text-danger" /> Chọn ảnh khác
        </Button>
      </div>
    </div>
  )
}
