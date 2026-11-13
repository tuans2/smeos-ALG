"use client"

import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useRef, useState } from "react"
import { ImagePlus } from "@/components/ui/icon-set/image-plus"
import { Button } from "@/components/ui/button"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import { uploadCoordinatorPhoto } from "@/components/coordinator/coordinator-api"
import {
  FLOWER_CHOICE_LABEL, FLOWER_NAME_MAX, FLOWER_REASON_MAX, FLOWER_REASON_MIN,
  type FlowerLine, type FlowerSubstitutePayload,
} from "@/modules/greeting-card/domain/flower-substitute"

interface OptionsResponse {
  data: { productName: string; lines: FlowerLine[]; lockedReason: string | null; latest: (FlowerSubstitutePayload & { id: string }) | null }
}

/**
 * Thiếu một loại hoa phụ (checklist ALG 5.14): chọn dòng hoa trong công thức của đơn, chụp ảnh hoa
 * thay thế, ghi lý do. Khách đồng ý thì công thức cắm của đơn đổi đúng dòng đó; tổng tiền giữ nguyên.
 */
export function FlowerSubstituteForm({ orderId, onClose, onDone }: { orderId: string; onClose: () => void; onDone: () => void }) {
  const { data, isLoading, error: loadError } = useApi<OptionsResponse>(`/api/v1/greeting-card/orders/${orderId}/flower-substitute`)
  const fileRef = useRef<HTMLInputElement>(null)
  const [lineIndex, setLineIndex] = useState<number | null>(null)
  const [name, setName] = useState("")
  const [color, setColor] = useState("")
  const [reason, setReason] = useState("")
  const [photo, setPhoto] = useState<{ assetId: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const info = data?.data
  const pending = info?.latest?.status === "PENDING"
  const blocked = busy || pending || !!info?.lockedReason

  const invalid = lineIndex === null ? "Chọn thành phần cần đổi"
    : name.trim().length < 2 ? "Nhập tên hoa thay thế"
    : !photo ? "Chụp ảnh hoa thay thế"
    : reason.trim().length < FLOWER_REASON_MIN ? "Ghi lý do cho khách hiểu (ít nhất 5 ký tự)" : null

  async function pickPhoto(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      // Chỉ giữ mã ảnh đã lưu trong kho; không dựng ảnh xem trước từ tệp cục bộ
      const uploaded = await uploadCoordinatorPhoto(file)
      URL.revokeObjectURL(uploaded.previewUrl)
      setPhoto({ assetId: uploaded.assetId })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa tải được ảnh")
    } finally {
      setBusy(false)
    }
  }

  async function submit() {
    if (lineIndex === null || !photo) return
    setBusy(true)
    setError(null)
    try {
      await apiSend(`/api/v1/greeting-card/orders/${orderId}/flower-substitute`, "POST", {
        line_index: lineIndex, replacement_name: name.trim(), ...(color.trim() ? { replacement_color: color.trim() } : {}),
        photo_asset_id: photo.assetId, reason: reason.trim(),
      }, "Chưa gửi được đề xuất")
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa gửi được đề xuất")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {isLoading && <SkeletonBlock lines={3} label="Đang tải công thức của đơn" />}
      {loadError && <p role="alert" className="text-danger text-caption">{loadError.message}</p>}
      {info && (
        <>
          <p className="text-body-sm text-text-muted">
            Mẫu <strong className="text-text">{info.productName}</strong>. Chọn thành phần phụ cần đổi; thành phần chủ đạo không đổi ở đây. <strong>Tổng tiền giữ nguyên</strong>.
          </p>
          {info.latest && (
            <p className="rounded-xl bg-surface-alt p-3 text-caption text-text">
              {pending ? "Đang chờ khách trả lời đề xuất trước." : `Lần trước: ${info.latest.choice ? FLOWER_CHOICE_LABEL[info.latest.choice] : "đã trả lời"}.`}
            </p>
          )}
          {info.lockedReason && <p role="alert" className="text-warning-text text-caption">{info.lockedReason}</p>}
          {info.lines.length === 0 ? (
            <p className="text-body-sm text-text-muted">Công thức của đơn chưa có hoa phụ nào. Hãy đề xuất đổi cả mẫu hoặc liên hệ khách.</p>
          ) : (
            <div className="flex flex-col gap-1.5" role="group" aria-label="Thành phần cần đổi">
              {info.lines.map((l) => (
                <Button key={l.index} type="button" variant="outline" aria-pressed={lineIndex === l.index} disabled={blocked} onClick={() => setLineIndex(l.index)}
                  className={`h-auto min-h-10 justify-between rounded-xl px-3 py-2 text-body-sm font-normal ${lineIndex === l.index ? "border-primary bg-primary/5 hover:bg-primary/5" : ""}`}>
                  <span>{l.flowerName}{l.color ? ` · ${l.color}` : ""}</span>
                  <span className="text-caption text-text-muted">{l.quantity}{l.unit ? ` ${l.unit}` : ""}{l.role ? ` · ${l.role}` : ""}</span>
                </Button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-caption font-bold text-text">Hoa thay thế
              <Input value={name} maxLength={FLOWER_NAME_MAX} onChange={(e) => setName(e.target.value)} disabled={blocked} placeholder="Vd: Cẩm chướng" />
            </label>
            <label className="flex flex-col gap-1 text-caption font-bold text-text">Màu (không bắt buộc)
              <Input value={color} maxLength={40} onChange={(e) => setColor(e.target.value)} disabled={blocked} placeholder="Vd: Hồng nhạt" />
            </label>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
          <div className="flex items-center gap-3">
            {photo && <span role="status" className="text-caption font-semibold text-success">Đã lưu ảnh hoa thay thế</span>}
            <Button type="button" variant="outline" size="sm" disabled={blocked} onClick={() => fileRef.current?.click()} className="gap-1.5">
              <ImagePlus size={14} aria-hidden="true" /> {photo ? "Chụp lại ảnh" : "Chụp ảnh hoa thay thế"}
            </Button>
          </div>
          <label className="text-body-sm font-bold text-text" htmlFor="flower-substitute-reason">Lý do (khách sẽ đọc)</label>
          <Textarea id="flower-substitute-reason" rows={2} maxLength={FLOWER_REASON_MAX} value={reason} onChange={(e) => setReason(e.target.value)} disabled={blocked}
            placeholder="Vd: Hoa baby trắng hôm nay hết, tiệm xin thay bằng cẩm chướng hồng nhạt cùng tông"
            className="w-full rounded-xl border border-border bg-surface-alt p-3 text-body-sm text-text resize-none focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </>
      )}
      {error && <p role="alert" className="text-danger text-caption">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-9 text-caption">Đóng</Button>
        <Button type="button" size="sm" disabled={!info || !!invalid || blocked} title={invalid ?? undefined} onClick={() => void submit()} className="h-9 text-caption">
          {busy ? "Đang gửi..." : "Gửi đề xuất cho khách"}
        </Button>
      </div>
    </div>
  )
}
