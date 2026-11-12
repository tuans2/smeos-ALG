"use client"

import React, { useState } from "react"
import { Sliders } from "@/components/ui/icon-set/sliders"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Camera } from "@/components/ui/icon-set/camera"
import { Upload } from "@/components/ui/icon-set/upload"
import { Eye } from "@/components/ui/icon-set/eye"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { Button } from "@/components/ui/button"
import { safeImageSrc } from "@/lib/safe-image-src"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { errorMessage, uploadCoordinatorPhoto } from "@/components/coordinator/coordinator-api"

export interface ProductionUpdateModalProps {
  isOpen: boolean
  orderCode: string
  recipeTitle: string
  currentProgressPercent: number
  sampleImageUrl?: string | undefined
  onClose: () => void
  /** Gọi máy chủ; lỗi ném ra để modal hiện, không đóng. */
  onSubmitUpdate: (params: {
    progressPercent: number
    action: "UPDATE_PROGRESS" | "REPORT_MATERIAL_ISSUE" | "MARK_READY"
    finishedAssetIds?: string[] | undefined
    issueNote?: string | undefined
  }) => Promise<void>
}

export function ProductionUpdateModal({
  isOpen,
  orderCode,
  recipeTitle,
  currentProgressPercent,
  onClose,
  onSubmitUpdate,
}: ProductionUpdateModalProps) {
  const [progress, setProgress] = useState<number>(currentProgressPercent)
  const [isReportingIssue, setIsReportingIssue] = useState(false)
  const [issueNote, setIssueNote] = useState("")
  // Ảnh thành phẩm PHẢI là ảnh thợ chụp — bản trước mặc định lấy chính ảnh
  // mẫu, nên QC so ảnh mẫu với chính nó và luôn "đạt".
  const [finishedImageUrl, setFinishedImageUrl] = useState<string>("")
  const [finishedAssetId, setFinishedAssetId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const { assetId, previewUrl } = await uploadCoordinatorPhoto(file)
      setFinishedAssetId(assetId)
      setFinishedImageUrl(previewUrl)
      setProgress(100)
    } catch (err) {
      setError(`Không tải được ảnh thành phẩm: ${errorMessage(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const handleSave = async () => {
    const action = isReportingIssue ? "REPORT_MATERIAL_ISSUE" : progress === 100 ? "MARK_READY" : "UPDATE_PROGRESS"
    if (action === "MARK_READY" && !finishedAssetId) {
      setError("Báo hoàn thành phải tải lên ít nhất một ảnh thành phẩm thật để QC.")
      return
    }
    setError(null)
    setBusy(true)
    try {
      await onSubmitUpdate({
        progressPercent: progress,
        action,
        finishedAssetIds: action === "MARK_READY" && finishedAssetId ? [finishedAssetId] : undefined,
        issueNote: isReportingIssue ? issueNote : undefined,
      })
      setFinishedAssetId(null)
      setFinishedImageUrl("")
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      size="md"
      className="max-w-lg"
      title={
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-danger-bg text-danger-text flex items-center justify-center">
            <Sliders size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-surface-alt text-text text-caption font-black uppercase border border-border">
                BƯỚC 4 • GIA CÔNG
              </span>
              <h3 className="text-body font-extrabold text-text">
                Tiến Độ & Ảnh Thành Phẩm
              </h3>
            </div>
          </div>
        </div>
      }
      description={`Đơn #${orderCode}: ${recipeTitle}`}
      footer={
        <div className="flex items-center justify-between gap-2.5 w-full">
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>

          {progress === 100 ? (
            <Button
              size="sm"
              disabled={busy}
              onClick={handleSave}
              className="bg-success hover:bg-success-text text-white font-bold gap-1.5 shadow-sm"
            >
              <CheckCircle2 size={14} />
              <span>Gia Công Xong ➔ Gửi Kiểm Định QC (Bước 5)</span>
              <ArrowRight size={14} />
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={busy}
              onClick={handleSave}
              className="bg-danger hover:bg-danger-text text-white font-bold gap-1.5 shadow-sm"
            >
              <CheckCircle2 size={14} />
              <span>Lưu Cập Nhật Tiến Trình</span>
            </Button>
          )}
        </div>
      }
    >
      <div className="p-1 flex flex-col gap-4 text-caption">
        {/* Thanh trượt tiến độ */}
        <div className="p-4 rounded-xl border border-border bg-surface-alt flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-text">Tiến độ hoàn thiện sản phẩm:</label>
            <span className="font-extrabold text-danger-text text-body">{progress}%</span>
          </div>
          <Input
            type="range"
            min="0"
            max="100"
            step="10"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full accent-red-600 cursor-pointer h-2 bg-surface rounded-lg p-0 border-0"
          />
          <div className="flex justify-between text-caption font-semibold text-text-muted mt-1">
            <Button variant="ghost"
              type="button"
              onClick={() => setProgress(25)}
              className="text-[length:inherit] h-auto p-0 font-[inherit] gap-0 hover:text-text cursor-pointer"
            >
              25% Lên cốt
            </Button>
            <Button variant="ghost"
              type="button"
              onClick={() => setProgress(50)}
              className="text-[length:inherit] h-auto p-0 font-[inherit] gap-0 hover:text-text cursor-pointer"
            >
              50% Cắm hoa chính
            </Button>
            <Button variant="ghost"
              type="button"
              onClick={() => setProgress(75)}
              className="text-[length:inherit] h-auto p-0 font-[inherit] gap-0 hover:text-text cursor-pointer"
            >
              75% Điểm lá & nơ
            </Button>
            <Button variant="ghost"
              type="button"
              onClick={() => setProgress(100)}
              className="text-[length:inherit] h-auto p-0 gap-0 text-danger-text font-bold hover:underline cursor-pointer"
            >
              100% Cắm xong ➔
            </Button>
          </div>
        </div>

        {/* Khối tải ảnh thành phẩm cắm xong thực tế khi progress >= 80% */}
        {progress >= 80 && (
          <div className="p-4 rounded-xl border-2 border-success-border bg-success-bg/40 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-success-text text-caption flex items-center gap-1.5">
                <Camera size={14} className="text-success-text" />
                Ảnh Hoa Thành Phẩm Thực Tế (Bắt buộc cho Bước 5 Kiểm định QC):
              </span>
              <span className="text-caption font-bold text-success-text bg-success-bg px-2 py-0.5 rounded-full">
                Thợ cắm gửi về
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-24 h-24 rounded-xl border border-success-border bg-surface overflow-hidden shrink-0 shadow-xs group">
                {finishedImageUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={safeImageSrc(finishedImageUrl)}
                      alt="Ảnh thành phẩm"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <Button variant="ghost"
                        type="button"
                        aria-label="Hiển thị thông tin"
                        onClick={() => window.open(finishedImageUrl, "_blank")}
                        className="h-auto font-[inherit] gap-0 p-1 rounded bg-surface text-text hover:bg-white text-caption shadow cursor-pointer"
                      >
                        <Eye size={12} />
                      </Button>
                      <Button variant="ghost"
                        type="button"
                        aria-label="Xóa ảnh"
                        onClick={() => {
                          setFinishedImageUrl("")
                          setFinishedAssetId(null)
                        }}
                        className="h-auto font-[inherit] gap-0 p-1 rounded bg-danger text-white hover:bg-danger-text text-caption shadow cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-caption font-bold text-center py-0.5">
                      Thành phẩm
                    </span>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-text-muted p-1">
                    <Camera size={20} className="text-success-text mb-0.5" />
                    <span className="text-caption">Chưa có ảnh</span>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-2">
                <Input
                  type="text"
                  placeholder="Tải ảnh thợ chụp lên (nút bên dưới)"
                  value={finishedAssetId ? "(ảnh đã tải lên kho của tiệm)" : ""}
                  readOnly
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text text-caption focus:outline-none focus:border-success"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-caption h-7 gap-1 border-success-border text-success-text bg-success-bg hover:bg-success-border font-bold"
                  >
                    <Upload size={12} />
                    <span>Tải ảnh thành phẩm thợ gửi</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Báo cáo sự cố nguyên liệu nếu có */}
        <div className="p-3 rounded-xl border border-border bg-surface-alt flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-text flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-warning-text" />
              Báo cáo sự cố hoa / nguyên liệu (Sự cố):
            </span>
            <Checkbox
              checked={isReportingIssue}
              onCheckedChange={(checked) => setIsReportingIssue(Boolean(checked))}
              aria-label="Báo cáo sự cố hoa / nguyên liệu"
            />
          </div>

          {isReportingIssue && (
            <Textarea
              rows={2}
              placeholder="Mô tả sự cố (ví dụ: Thiếu 3 cành Hồng Ohara kem, xin đổi sang Hồng Juliet cùng tone màu...)"
              value={issueNote}
              onChange={(e) => setIssueNote(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-warning-border bg-surface text-text text-caption focus:outline-none focus:border-danger mt-1"
            />
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="mx-5 mb-3 p-3 rounded-xl border border-danger-border bg-danger-bg text-danger-text text-caption font-semibold">
          {error}
        </div>
      )}
    </Dialog>
  )
}
