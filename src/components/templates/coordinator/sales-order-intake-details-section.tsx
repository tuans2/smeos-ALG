"use client"

import { NativeSelect } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { MessageSquare } from "@/components/ui/icon-set/message-square"
import { ShieldAlert } from "@/components/ui/icon-set/shield-alert"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { CustomFieldsSection } from "@/components/coordinator/custom-fields-section"
import type { SalesOrderIntakeForm } from "./use-sales-order-intake-form"

/** Phần 2.5–4: phân loại & ưu tiên, lời nhắn, trường tự tạo, kiểm tra đầu vào. */
export function SalesOrderIntakeDetailsSection({ form }: { form: SalesOrderIntakeForm }) {
  const {
    customerName, recipientName, recipientPhone, addressStreet, addressWard, addressDistrict,
    addressCity, deliveryDate, deliveryTime, productTitle, unitPriceVnd, channel,
    setChannel, orderType, setOrderType, serviceLevel, setServiceLevel, deliveryType,
    setDeliveryType, deliveryLocationType, setDeliveryLocationType, priority, setPriority, catalogs,
    catalogsError, cardMessage, setCardMessage, cardRequired, setCardRequired, internalNote,
    setInternalNote, sampleImageUrl, customFields, setCustomFields, flowers,
  } = form
  return (
    <>
    {/* Section 2.5: Phân loại & Ưu tiên (ĐP-4a.1, 26/09/2026) */}
    <div className="flex flex-col gap-3">
      <span className="font-extrabold text-text text-body-sm flex items-center gap-1.5 border-b border-border pb-1">
        <ShieldAlert size={15} className="text-danger-text" />
        2.5. Phân Loại & Ưu Tiên Điều Phối
      </span>
      {catalogsError && (
        <p role="alert" className="text-danger-text font-semibold">
          Không tải được danh mục: {catalogsError}
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="font-bold text-text block mb-1">Kênh tiếp nhận</label>
          <NativeSelect
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl border border-border bg-surface text-text"
          >
            <option value="">— Chọn —</option>
            {(catalogs.channel ?? []).map((v) => (
              <option key={v.code} value={v.code}>{v.label}</option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <label className="font-bold text-text block mb-1">Loại đơn</label>
          <NativeSelect
            value={orderType}
            onChange={(e) => setOrderType(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl border border-border bg-surface text-text"
          >
            <option value="">— Chọn —</option>
            {(catalogs.orderType ?? []).map((v) => (
              <option key={v.code} value={v.code}>{v.label}</option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <label className="font-bold text-text block mb-1">Cam kết thời gian giao</label>
          <NativeSelect
            value={serviceLevel}
            onChange={(e) => setServiceLevel(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl border border-border bg-surface text-text"
          >
            <option value="">— Chọn —</option>
            {(catalogs.serviceLevel ?? []).map((v) => (
              <option key={v.code} value={v.code}>{v.label}</option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <label className="font-bold text-text block mb-1">Hình thức giao</label>
          <NativeSelect
            value={deliveryType}
            onChange={(e) => setDeliveryType(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl border border-border bg-surface text-text"
          >
            <option value="">— Chọn —</option>
            {(catalogs.deliveryType ?? []).map((v) => (
              <option key={v.code} value={v.code}>{v.label}</option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <label className="font-bold text-text block mb-1">Loại địa điểm giao</label>
          <NativeSelect
            value={deliveryLocationType}
            onChange={(e) => setDeliveryLocationType(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl border border-border bg-surface text-text"
          >
            <option value="">— Chọn —</option>
            {(catalogs.deliveryLocationType ?? []).map((v) => (
              <option key={v.code} value={v.code}>{v.label}</option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <label className="font-bold text-text block mb-1">Mức ưu tiên</label>
          <NativeSelect
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl border border-border bg-surface text-text"
          >
            <option value="">— Để máy tự gợi ý —</option>
            {(catalogs.priority ?? []).map((v) => (
              <option key={v.code} value={v.code}>{v.label}</option>
            ))}
          </NativeSelect>
        </div>
      </div>
    </div>

    {/* Section 3: Card Message & Notes */}
    <div className="flex flex-col gap-3">
      <span className="font-extrabold text-text text-body-sm flex items-center gap-1.5 border-b border-border pb-1">
        <MessageSquare size={15} className="text-danger-text" />
        3. Thiệp Chúc Mừng & Lưu Ý Điều Phối
      </span>

      <div>
        <label className="flex items-center gap-2 font-bold text-text mb-1.5">
          <Checkbox
            checked={cardRequired}
            onCheckedChange={(checked) => setCardRequired((checked === true))}
            className="h-3.5 w-3.5"
          />
          Đơn có thiệp/băng rôn
        </label>
        <label className="font-bold text-text block mb-1">
          Lời nhắn thiệp chúc mừng (In nguyên văn){cardRequired ? " — bắt buộc:" : ":"}
        </label>
        <Textarea
          rows={2}
          placeholder="Ví dụ: Chúc mừng sinh nhật em yêu, luôn vui vẻ và hạnh phúc nhé!"
          value={cardMessage}
          onChange={(e) => setCardMessage(e.target.value)}
          className={`w-full px-3 py-2 rounded-xl border bg-surface text-text focus:outline-none focus:border-danger ${
            cardRequired && !cardMessage.trim() ? "border-warning" : "border-border"
          }`}
        />
        {cardRequired && !cardMessage.trim() && (
          <p className="text-caption text-warning-text font-semibold mt-1">Đã chọn “có thiệp” — cần nhập lời nhắn trước khi lưu.</p>
        )}
      </div>

      <div>
        <label className="font-bold text-text block mb-1">Ghi chú nội bộ cho thợ gia công:</label>
        <Input
          type="text"
          placeholder="Ví dụ: Gói cẩn thận chống trầy xước, thắt nơ tinh tế, kiểm tra kỹ thành phẩm..."
          value={internalNote}
          onChange={(e) => setInternalNote(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-danger"
        />
      </div>
    </div>

    {/* Section 3.5: Trường tự tạo (ĐP-3.16, 26/09/2026) — chỉ hiện nếu
        tổ chức đã tạo trường tự tạo nào cho ORDER ở Console Vận hành. */}
    <CustomFieldsSection
      entity="ORDER"
      currentStage="INTAKE"
      values={customFields}
      onChange={setCustomFields}
    />

    {/* Section 4: Checklist Tiêu Chuẩn Đầu Vào P1 (Sổ Tay Điều Phối) */}
    <div className="p-3.5 rounded-xl border border-danger-border bg-danger-bg/50 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-extrabold text-danger-text text-caption flex items-center gap-1.5">
          <CheckCircle2 size={14} className="text-danger-text" />
          Kiểm tra đủ thông tin đầu vào (Điều 4 Quy chế & Sổ tay điều phối):
        </span>
        <span className="text-caption font-bold text-danger-text bg-danger-bg px-2 py-0.5 rounded-full">
          Mục tiêu: đủ thông tin trước khi lập kế hoạch sản xuất
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-caption">
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-semibold ${
          customerName && recipientName && recipientPhone
            ? "bg-success-bg text-success-text border-success-border"
            : "bg-surface text-text-muted border-border"
        }`}>
          <span>{customerName && recipientName && recipientPhone ? "✓" : "○"}</span>
          <span className="truncate">1. Người nhận & SĐT</span>
        </div>

        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-semibold ${
          addressStreet && addressWard && addressDistrict && addressCity
            ? "bg-success-bg text-success-text border-success-border"
            : "bg-surface text-text-muted border-border"
        }`}>
          <span>{addressStreet && addressWard && addressDistrict && addressCity ? "✓" : "○"}</span>
          <span className="truncate">2. Địa chỉ 5 tầng</span>
        </div>

        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-semibold ${
          deliveryDate && deliveryTime
            ? "bg-success-bg text-success-text border-success-border"
            : "bg-surface text-text-muted border-border"
        }`}>
          <span>{deliveryDate && deliveryTime ? "✓" : "○"}</span>
          <span className="truncate">3. Giờ hẹn giao</span>
        </div>

        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-semibold ${
          sampleImageUrl
            ? "bg-success-bg text-success-text border-success-border"
            : "bg-warning-bg text-warning-text border-warning-border"
        }`}>
          <span>{sampleImageUrl ? "✓" : "!"}</span>
          <span className="truncate">4. Ảnh mẫu đối chiếu</span>
        </div>

        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-semibold ${
          productTitle && unitPriceVnd > 0
            ? "bg-success-bg text-success-text border-success-border"
            : "bg-surface text-text-muted border-border"
        }`}>
          <span>{productTitle && unitPriceVnd > 0 ? "✓" : "○"}</span>
          <span className="truncate">5. Mẫu SP & Giá bán</span>
        </div>

        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-semibold ${
          flowers.length > 0
            ? "bg-success-bg text-success-text border-success-border"
            : "bg-warning-bg text-warning-text border-warning-border"
        }`}>
          <span>{flowers.length > 0 ? "✓" : "!"}</span>
          <span className="truncate">6. Định mức nguyên liệu</span>
        </div>

        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-semibold ${
          cardMessage
            ? "bg-success-bg text-success-text border-success-border"
            : cardRequired
              ? "bg-warning-bg text-warning-text border-warning-border"
              : "bg-surface text-text-muted border-border"
        }`}>
          <span>{cardMessage ? "✓" : cardRequired ? "!" : "○"}</span>
          <span className="truncate">7. Lời nhắn thiệp</span>
        </div>

      </div>
    </div>

    </>
  )
}
