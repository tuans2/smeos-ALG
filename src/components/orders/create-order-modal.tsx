"use client"

import React, { useState, useEffect, useRef } from "react"
import { Plus } from "@/components/ui/icon-set/plus"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Flower2 } from "@/components/ui/icon-set/flower2"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect } from "@/components/ui/select"
import { requestKey, type HeldKey } from "@/components/content-studio/request-key"
import { errorText } from "@/lib/error-text"
import { vnTodayIso } from "@/lib/vn-date"
import { newOrderDeliveryErrors } from "@/modules/orders/domain/order-input-rules"
import type { ProductMasterIndex } from "@/modules/products/domain/product-master-index"

export interface CreateOrderInitialData {
  recipientName?: string
  phone?: string
  street?: string
  deliveryDate?: string
  timeSlot?: string
  cardMessage?: string
  internalNote?: string
  items?: ItemRow[]
}

interface CreateOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialData?: CreateOrderInitialData | null
}

interface FlowerBomItemLite {
  flowerName: string
  quantity: number
  unit: string
  color: string
}

interface ItemRow {
  /** Sản phẩm trong danh mục — gửi kèm để máy chủ kiểm giá sàn và quyền sở hữu (audit BL-07, BL-13). */
  productId?: string | undefined
  description: string
  quantity: number
  unitPriceVnd: number
  sampleImageUrl?: string | undefined
  bomSummary?: string | undefined
  /** BOM có cấu trúc thật lấy từ Master Index — để phiếu chế tác (florist ticket) đọc được
   * đúng từng nguyên liệu/số lượng/màu thay vì phải bịa lại từ mô tả chữ tự do. */
  bomFlowers?: FlowerBomItemLite[] | undefined
  wrapStyle?: string | undefined
  ribbon?: string | undefined
}

export function CreateOrderModal({ isOpen, onClose, onSuccess, initialData }: CreateOrderModalProps) {
  const [loading, setLoading] = useState(false)
  // Khoá giữ qua lần thử lại CÙNG nội dung (lỗi mạng/hết giờ không tạo đơn thứ hai); sửa đơn → khoá mới (audit API-11)
  const idempotencyKey = useRef<HeldKey | null>(null)
  const [masterProducts, setMasterProducts] = useState<ProductMasterIndex[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [recipientName, setRecipientName] = useState("")
  const [phone, setPhone] = useState("")
  const [street, setStreet] = useState("")
  // Hôm nay theo giờ Việt Nam — `toISOString()` là UTC, 00:00–07:00 sáng sẽ ra ngày hôm qua (audit BL-10)
  const [deliveryDate, setDeliveryDate] = useState(() => vnTodayIso())
  const [timeSlot, setTimeSlot] = useState("08:00 - 10:00")
  const [cardMessage, setCardMessage] = useState("")
  const [internalNote, setInternalNote] = useState("")
  // Dòng trống: không điền sẵn mẫu/giá của một ngành cụ thể (audit BL-13)
  const [items, setItems] = useState<ItemRow[]>([{ description: "", quantity: 1, unitPriceVnd: 0 }])
  const [error, setError] = useState<string | null>(null)

  // Khởi tạo từ initialData khi modal mở hoặc dữ liệu thay đổi
  useEffect(() => {
    if (!isOpen) return
    if (initialData) {
      if (initialData.recipientName !== undefined) setRecipientName(initialData.recipientName)
      if (initialData.phone !== undefined) setPhone(initialData.phone)
      if (initialData.street !== undefined) setStreet(initialData.street)
      if (initialData.deliveryDate !== undefined) setDeliveryDate(initialData.deliveryDate)
      if (initialData.timeSlot !== undefined) setTimeSlot(initialData.timeSlot)
      if (initialData.cardMessage !== undefined) setCardMessage(initialData.cardMessage)
      if (initialData.internalNote !== undefined) setInternalNote(initialData.internalNote)
      if (initialData.items && initialData.items.length > 0) setItems(initialData.items)
    }
  }, [isOpen, initialData])

  // Tải danh sách Master Index từ M01/Catalog
  useEffect(() => {
    if (!isOpen) return
    fetch("/api/v1/products/master-index?limit=30")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((res: { items?: ProductMasterIndex[] }) => {
        if (res.items) setMasterProducts(res.items)
      })
      .catch(() => { /* lỗi im lặng — API chưa sẵn */ })
  }, [isOpen])

  function handleSelectMasterProduct(productId: string) {
    setSelectedProductId(productId)
    const product = masterProducts.find((p) => p.id === productId)
    if (!product) return

    const flowerSummary = product.bom.flowers
      .map((f) => `${f.flowerName} (${f.quantity} ${f.unit})`)
      .join(", ")

    // Giá 0 nghĩa là Master Index chưa có giá bán lẻ thật — không bịa mặc định,
    // bắt buộc sales tự nhập (form chặn submit khi đơn giá <= 0).
    setItems([{
      productId: product.id,
      description: `${product.name} [${product.code}]`,
      quantity: 1,
      unitPriceVnd: product.pricing.quotePriceVnd ?? 0,
      sampleImageUrl: product.masterImageUrl,
      bomSummary: flowerSummary,
      bomFlowers: product.bom.flowers,
      wrapStyle: product.bom.wrapStyle,
      ribbon: product.bom.ribbon,
    }])
    setInternalNote(
      `Kiểu gói: ${product.bom.wrapStyle}. Nơ: ${product.bom.ribbon}. Công thức: ${flowerSummary}`
    )
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unitPriceVnd: 0 }])
  }

  function removeItem(index: number) {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof ItemRow, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  const totalVnd = items.reduce((sum, it) => sum + it.quantity * it.unitPriceVnd, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!recipientName.trim() || !phone.trim() || !street.trim()) {
      setError("Chưa đủ thông tin giao hàng. Vui lòng nhập họ tên, số điện thoại và địa chỉ người nhận.")
      return
    }
    // Cùng luật với máy chủ (PO 07/11/2026, Q11–Q12) — báo sớm trước khi gửi
    const deliveryErrors = newOrderDeliveryErrors({ deliveryDate, recipientPhone: phone })
    const firstDeliveryError = deliveryErrors.deliveryDate ?? deliveryErrors.recipientPhone
    if (firstDeliveryError) {
      setError(firstDeliveryError)
      return
    }
    // Cùng luật máy chủ: đơn giá nguyên, không âm; 0 ₫ = nháp chờ báo giá (audit BL-31 — trước đây form chặn 0 còn API nhận)
    if (items.some((it) => !it.description.trim() || !Number.isInteger(it.unitPriceVnd) || it.unitPriceVnd < 0)) {
      setError("Mỗi mục cần tên sản phẩm và đơn giá không âm (để 0 ₫ nếu chờ báo giá).")
      return
    }
    setLoading(true)
    try {
      const body = JSON.stringify({
        deliveryAddress: { recipientName, phone, street },
        deliveryWindow: { date: deliveryDate, timeSlot },
        cardMessage,
        internalNote,
        items: items.map((it) => ({
          productId: it.productId,
          description: it.description,
          quantity: Number(it.quantity),
          unitPriceVnd: Number(it.unitPriceVnd),
          metadata:
            it.sampleImageUrl || it.bomFlowers?.length
              ? { sampleImageUrl: it.sampleImageUrl, bomSummary: it.bomSummary, flowers: it.bomFlowers, wrapStyle: it.wrapStyle, ribbon: it.ribbon }
              : undefined,
        })),
      })
      idempotencyKey.current = requestKey(idempotencyKey.current, body, () => crypto.randomUUID())
      const res = await fetch("/api/v1/orders", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey.current.key }, body })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: { message?: string } }
        throw new Error(data.error?.message ?? "Chưa tạo được đơn hàng do lỗi hệ thống. Vui lòng thử lại sau ít phút hoặc liên hệ hỗ trợ.")
      }
      idempotencyKey.current = null
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(errorText(err) || "Đã xảy ra lỗi khi tạo đơn hàng.")
    } finally {
      setLoading(false)
    }
  }

  const dialogTitle = (
    <span className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-subtle text-primary">
        <Sparkles className="h-3.5 w-3.5" />
      </span>
      Tạo đơn hàng mới
    </span>
  )

  const dialogFooter = (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-body-sm font-semibold text-text-muted">Tạm tính:</span>
        <span className="text-title font-bold text-primary">
          {totalVnd.toLocaleString("vi-VN")} đ
        </span>
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Hủy</Button>
        <Button form="create-order-form" type="submit" disabled={loading} className="font-semibold">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />}
          Tạo đơn hàng
        </Button>
      </div>
    </div>
  )

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose() }}
      title={dialogTitle}
      description="Chọn mẫu có sẵn từ kho sản phẩm hoặc nhập trực tiếp."
      size="lg"
      footer={dialogFooter}
    >
      <form id="create-order-form" onSubmit={handleSubmit} className="space-y-4 text-body-sm">
        {error && (
          <div className="rounded-lg bg-danger-bg p-3 text-caption font-medium text-danger border border-danger/30">
            {error}
          </div>
        )}

        {masterProducts.length > 0 && (
          <div className="rounded-xl border border-dashed border-guidance-border bg-guidance-bg/60 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-caption font-bold text-guidance-text">
                <Flower2 className="h-4 w-4 text-guidance" />
                Chọn nhanh từ kho sản phẩm
              </span>
              <span className="text-caption font-medium text-guidance">{masterProducts.length} mẫu sẵn sàng</span>
            </div>
            <NativeSelect
              className="w-full rounded-md border border-guidance-border bg-surface px-3 py-2 text-caption font-medium text-text focus:outline-none focus:ring-1 focus:ring-guidance"
              value={selectedProductId}
              onChange={(e) => handleSelectMasterProduct(e.target.value)}
            >
              <option value="">-- Chọn sản phẩm có sẵn trong kho --</option>
              {masterProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} [{p.code}] — {p.pricing?.quotePriceVnd ? `${Number(p.pricing.quotePriceVnd).toLocaleString("vi-VN")} đ` : "Chưa có giá"} ({p.category})
                </option>
              ))}
            </NativeSelect>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block font-semibold text-text">Người nhận *</label>
            <Input type="text" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Họ và tên người nhận" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-text">Số điện thoại người nhận *</label>
            <Input type="text" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Ví dụ: 0909xxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="mb-1 block font-semibold text-text">Địa chỉ giao hàng *</label>
          <Input type="text" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Số nhà, tên đường, phường/xã, tỉnh/thành phố" value={street} onChange={(e) => setStreet(e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block font-semibold text-text">Ngày hẹn giao</label>
            <Input type="date" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm focus:outline-none focus:ring-1 focus:ring-primary" min={vnTodayIso()} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-text">Khung giờ giao</label>
            <NativeSelect className="w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm focus:outline-none focus:ring-1 focus:ring-primary" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
              <option value="07:30 - 09:30">Sáng sớm (07:30–09:30)</option>
              <option value="09:30 - 11:30">Sáng (09:30–11:30)</option>
              <option value="13:30 - 15:30">Chiều (13:30–15:30)</option>
              <option value="15:30 - 17:30">Chiều muộn (15:30–17:30)</option>
              <option value="18:00 - 20:00">Tối (18:00–20:00)</option>
              <option value="Giao gấp hỏa tốc">Giao gấp trong 60 phút</option>
            </NativeSelect>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="font-semibold text-text">Sản phẩm và phụ kiện *</label>
            <Button type="button" variant="ghost" size="sm" onClick={addItem} className="h-auto p-0 inline-flex items-center gap-1 text-caption font-semibold text-primary hover:underline">
              <Plus className="h-3.5 w-3.5" /> Thêm sản phẩm
            </Button>
          </div>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input type="text" className="flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-body-sm" placeholder="Tên sản phẩm hoặc mô tả yêu cầu" value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} required />
                <Input type="number" min="1" className="w-16 rounded-md border border-border bg-surface px-2 py-1.5 text-center text-body-sm" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))} />
                <Input type="number" step="10000" min="0" className="w-32 rounded-md border border-border bg-surface px-2 py-1.5 text-right text-body-sm" placeholder="Đơn giá (₫)" value={it.unitPriceVnd} onChange={(e) => updateItem(idx, "unitPriceVnd", parseInt(e.target.value) || 0)} />
                {items.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)} aria-label="Xóa dòng" className="flex h-9 w-9 p-0 items-center justify-center rounded-md text-text-muted hover:bg-surface-raised hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block font-semibold text-text">Lời nhắn trên thiệp</label>
          <Textarea rows={2} className="w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Nội dung in hoặc viết lên thiệp…" value={cardMessage} onChange={(e) => setCardMessage(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block font-semibold text-text">Ghi chú cho người làm hàng</label>
          <Input type="text" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Màu sắc, cách gói, yêu cầu riêng…" value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
        </div>
      </form>
    </Dialog>
  )
}
