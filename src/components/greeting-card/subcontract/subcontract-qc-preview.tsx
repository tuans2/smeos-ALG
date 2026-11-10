"use client"

import React from "react"
import { Trash2, Loader2, UploadCloud } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { LocalImagePreview } from "@/components/upload/local-image-preview"

export interface SubcontractQcPreviewProps {
  selectedFile: File
  uploadingQc: boolean
  onCancel: () => void
  onUpload: () => void
}

export function SubcontractQcPreview({
  selectedFile,
  uploadingQc,
  onCancel,
  onUpload,
}: SubcontractQcPreviewProps) {
  return (
    <div className="flex flex-col gap-3 p-3 rounded-xl bg-surface-muted border border-border">
      <div className="relative w-full h-56 rounded-lg overflow-hidden bg-black/5 flex items-center justify-center">
        <LocalImagePreview file={selectedFile} label="Xem trước ảnh chụp" fit="contain" width={640} height={448} className="w-full h-full" />
      </div>
      <div className="flex items-center justify-between text-caption text-text-muted">
        <span className="truncate max-w-[200px]">{selectedFile.name}</span>
        <span>{`${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`}</span>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          disabled={uploadingQc}
          onClick={onCancel}
          className="flex-1 h-11 text-caption font-bold"
        >
          <Trash2 size={15} className="mr-1 text-danger" /> Chọn ảnh khác
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={uploadingQc}
          onClick={onUpload}
          className="flex-1 h-11 text-caption font-extrabold shadow-md"
        >
          {uploadingQc ? (
            <>
              <Loader2 size={16} className="animate-spin motion-reduce:animate-none mr-1.5" /> Đang tải lên...
            </>
          ) : (
            <>
              <UploadCloud size={16} className="mr-1.5" /> GỬI DUYỆT ẢNH QC
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
