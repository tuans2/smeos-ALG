"use client"

/**
 * Tab "Tải ảnh mới" trong Chức năng 04 — UI cho luồng upload ảnh trực tiếp.
 * Nhận `state` và handlers từ `useImageUploadFlow` hook (tách SRP).
 */

import React, { useRef, useCallback } from "react"
import { Upload } from "@/components/ui/icon-set/upload"
import { ImageIcon } from "@/components/ui/icon-set/image-icon"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { UploadFlowState } from "./use-image-upload-flow"

const STEP_LABELS: Record<string, string> = {
  idle: "Chọn ảnh để bắt đầu",
  uploading: "Đang tải ảnh lên lưu trữ...",
  registering: "Đang đăng ký ảnh vào hệ thống...",
  analyzing: "AI đang phân tích thị giác sản phẩm...",
  generating: "Đang soạn bài cho các kênh đã chọn...",
  succeeded: "Hoàn tất — kéo xuống xem kết quả!",
  error: "Đã có lỗi xảy ra",
}

const STEP_FLOW = ["uploading", "registering", "analyzing", "generating", "succeeded"] as const

interface ImageUploadTabProps {
  state: UploadFlowState
  selectedChannels: string[]
  onFileSelected: (file: File | null) => void
  onRunFlow: (file: File, channels: string[]) => void
  onReset: () => void
}

export function ImageUploadTab({
  state,
  selectedChannels,
  onFileSelected,
  onRunFlow,
  onReset,
}: ImageUploadTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null
      setSelectedFile(file)
      onFileSelected(file)
    },
    [onFileSelected]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault()
      const file = e.dataTransfer.files?.[0] ?? null
      if (file && file.type.startsWith("image/")) {
        setSelectedFile(file)
        onFileSelected(file)
      }
    },
    [onFileSelected]
  )

  const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => e.preventDefault()

  const handleStart = useCallback(() => {
    if (!selectedFile || selectedChannels.length === 0) return
    onRunFlow(selectedFile, selectedChannels)
  }, [selectedFile, selectedChannels, onRunFlow])

  const handleReset = () => {
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    onReset()
  }

  const isRunning = ["uploading", "registering", "analyzing", "generating"].includes(state.step)
  const isDone = state.step === "succeeded"
  const isError = state.step === "error"
  const currentStepIndex = STEP_FLOW.indexOf(state.step as (typeof STEP_FLOW)[number])

  return (
    <div className="flex flex-col gap-4">
      {/* ─── Drag & Drop Zone ─── */}
      <Card className="border border-dashed border-primary/40 bg-surface p-5 shadow-sm">
        <Button
          variant="ghost"
          type="button"
          aria-label="Khu vực kéo thả ảnh sản phẩm"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => !isRunning && fileInputRef.current?.click()}
          className="flex h-auto w-full flex-col items-center justify-center gap-3 min-h-[180px] cursor-pointer rounded-xl bg-surface/50 hover:bg-primary/5 font-normal transition-colors select-none"
        >
          {state.previewUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.previewUrl}
                alt="Ảnh sản phẩm đã chọn"
                className="h-36 max-w-full rounded-xl object-contain border border-border shadow-sm"
              />
              {!isRunning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-xl">
                  <span className="text-white text-caption font-bold">Đổi ảnh khác</span>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <ImageIcon size={32} className="text-primary" />
              </div>
              <div className="text-center">
                <div className="text-body-sm font-bold text-text">Kéo thả ảnh sản phẩm vào đây</div>
                <div className="text-caption text-text-muted mt-0.5">
                  hoặc nhấp để chọn từ thiết bị · JPG, PNG, WEBP · Tối đa 10MB
                </div>
              </div>
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-caption font-semibold text-text" aria-hidden="true">
                <Upload size={13} />
                Chọn ảnh từ máy
              </span>
            </>
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
          id="content-engine-upload-input"
        />
        {state.fileName && (
          <div className="mt-2 text-center text-caption text-text-muted">
            📎 {state.fileName}
          </div>
        )}
      </Card>

      {/* ─── Thanh tiến trình luồng 5 bước ─── */}
      {isRunning && (
        <Card className="border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Loader2 size={15} className="text-primary animate-spin motion-reduce:animate-none" />
            <span className="text-caption font-bold text-primary animate-pulse motion-reduce:animate-none">
              {STEP_LABELS[state.step]}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${state.uploadProgress}%` }}
            />
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-between mt-3">
            {STEP_FLOW.filter((s) => s !== "succeeded").map((s, idx) => {
              const isActive = idx === currentStepIndex
              const isPast = idx < currentStepIndex
              return (
                <div key={s} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-2 h-2 rounded-full transition-colors ${
                      isPast
                        ? "bg-success"
                        : isActive
                        ? "bg-primary animate-pulse motion-reduce:animate-none"
                        : "bg-border"
                    }`}
                  />
                  <span className="text-caption text-text-muted text-center leading-tight hidden sm:block">
                    {s === "uploading"
                      ? "Tải lên"
                      : s === "registering"
                      ? "Đăng ký"
                      : s === "analyzing"
                      ? "Phân tích AI"
                      : "Sinh bài"}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ─── Trạng thái Xong / Lỗi ─── */}
      {isDone && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/30 text-caption font-semibold text-success">
          <CheckCircle2 size={15} />
          AI đã hoàn tất phân tích ảnh và sinh bài viết đa kênh. Kéo xuống để xem kết quả!
        </div>
      )}
      {isError && (
        <div className="flex flex-col gap-2 p-3 rounded-xl bg-danger/10 border border-danger/30 text-caption text-danger">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle size={15} />
            {state.errorMessage || "Đã có lỗi trong quá trình xử lý."}
          </div>
          <Button variant="outline" size="sm" className="text-caption gap-1.5 self-start" onClick={handleReset}>
            <RefreshCw size={12} />
            Thử lại
          </Button>
        </div>
      )}

      {/* ─── CTA: Kích hoạt luồng ─── */}
      {!isRunning && !isDone && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-surface shadow-sm">
          <div className="text-caption text-text-muted">
            {!selectedFile ? (
              <span className="text-warning-text font-semibold">Hãy chọn ảnh sản phẩm ở trên.</span>
            ) : selectedChannels.length === 0 ? (
              <span className="text-warning-text font-semibold">⚠️ Vui lòng chọn ít nhất 1 kênh ở Bước 2.</span>
            ) : (
              <span>
                AI sẽ phân tích ảnh → khởi tạo thông số sản phẩm → sinh bài cho{" "}
                <strong>{selectedChannels.length} kênh</strong>.
              </span>
            )}
          </div>
          <Button
            size="default"
            onClick={handleStart}
            disabled={!selectedFile || selectedChannels.length === 0}
            className="w-auto gap-2 font-bold px-6 shadow-md whitespace-nowrap"
          >
            <Upload size={15} />
            Phân tích & Sinh bài
          </Button>
        </div>
      )}

      {/* Nút bắt đầu lại sau khi xong */}
      {isDone && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="text-caption gap-1.5 self-start"
        >
          <RefreshCw size={12} />
          Tải ảnh mới
        </Button>
      )}
    </div>
  )
}
