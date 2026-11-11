"use client"

import React from "react"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Truck } from "@/components/ui/icon-set/truck"
import { Users } from "@/components/ui/icon-set/users"
import { Clock } from "@/components/ui/icon-set/clock"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { Camera } from "@/components/ui/icon-set/camera"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  applyHolidayAutoPreset,
  type BrochurePaymentPolicy,
} from "@/modules/greeting-card/domain/brochure-payment-policy"
import { PolicyRow } from "./policy-row"

interface Props {
  policy: BrochurePaymentPolicy
  onChange: (patch: Partial<BrochurePaymentPolicy>) => void
  disabled?: boolean
}

export function PolicyMatrixTable({ policy, onChange, disabled }: Props) {
  const isHoliday = policy.holidayAutoMode === true
  const isPaidBeforeShip = policy.requireFullBeforeDispatch === true
  const isCoordinatorAllowed = policy.trackingTriggerPolicy !== "PAYMENT_ONLY"
  const isAutoApproveProof = policy.autoApprovePaymentWithProof === true
  const isAutoCancelUnpaid = (policy.paymentTimeoutMinutes ?? 0) > 0
  const isProofRequired = policy.requirePaymentProof !== false
  const isQCRequired = policy.requireProductPhotoQC !== false
  const isRecipientPhotoRequired = policy.requireRecipientPhoto !== false

  const handleToggleHoliday = (enable: boolean) => {
    onChange(applyHolidayAutoPreset(policy, enable))
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Banner chế độ cao điểm nếu đang bật */}
      {isHoliday && (
        <div className="p-3.5 rounded-2xl border border-primary/30 bg-primary/10 flex items-center justify-between gap-3 text-body-sm">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary shrink-0 animate-pulse motion-reduce:animate-none" />
            <div>
              <span className="font-extrabold text-text">ĐANG BẬT: CHẾ ĐỘ AUTO NGÀY LỄ / CAO ĐIỂM</span>
              <p className="text-caption text-text-muted mt-0.5">
                Các quy tắc kiểm duyệt đã tự động được nới lỏng và tối ưu để xưởng xuất hoa nhanh nhất, chống nghẽn luồng.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => handleToggleHoliday(false)}
            className="shrink-0"
          >
            Tắt chế độ cao điểm
          </Button>
        </div>
      )}

      {/* Bảng ma trận Chính sách & Cam kết */}
      <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-muted/60 text-caption font-extrabold text-text uppercase tracking-wider">
                <th scope="col" className="py-3 px-4">Hạng mục chính sách & Quy tắc vận hành</th>
                <th scope="col" className="py-3 px-3 text-center w-28">Bật</th>
                <th scope="col" className="py-3 px-3 text-center w-28">Tắt</th>
                <th scope="col" className="py-3 px-4 text-left w-52 sm:w-64">Cấu hình chi tiết / thời hạn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-body-sm">
              {/* 1. AUTO NGÀY LỄ */}
              <PolicyRow
                icon={<Sparkles size={17} className="text-primary" />}
                title="Chế độ AUTO Ngày Lễ / Cao điểm"
                badge="Tự động 1-chạm"
                description="Tự động kích hoạt toàn bộ cơ chế giải phóng đơn, ủy quyền cho Điều phối và bỏ chặn chụp ảnh khi cao điểm."
                isOn={isHoliday}
                onToggle={handleToggleHoliday}
                statusText={isHoliday ? "Đang áp dụng bộ quy tắc cao điểm" : "Đang áp dụng tiêu chuẩn ngày thường"}
                highlight={isHoliday}
                disabled={disabled}
              />

              {/* 2. THU ĐỦ 100% TIỀN TRƯỚC KHI GIAO */}
              <PolicyRow
                icon={<Truck size={17} className="text-text" />}
                title="Bắt buộc thu đủ 100% trước khi Giao Ship"
                description="Đơn đặt cọc bắt buộc phải thanh toán nốt phần còn lại (Lần 2) trước khi tài xế xuất giao hàng."
                isOn={isPaidBeforeShip}
                onToggle={(val) => onChange({ requireFullBeforeDispatch: val })}
                statusText={isPaidBeforeShip ? "Khóa nút Giao nếu còn nợ tiền" : "Cho phép giao cọc, thu sau"}
                disabled={disabled}
              />

              {/* 2b. SHIPPER THU TIỀN MẶT (mặc định TẮT — PO 14/10/2026) */}
              <PolicyRow
                icon={<Truck size={17} className="text-text" />}
                title="Cho phép shipper thu tiền mặt phần còn lại"
                description="Tắt (mặc định): khách luôn chuyển khoản phần còn lại; tiệm xác nhận tiền xong mới giao. Bật: được giao đơn đặt cọc, shipper thu tiền mặt khi giao và tiệm ghi nhận sau khi giao xong."
                isOn={policy.allowShipperCash === true}
                onToggle={(val) => onChange({ allowShipperCash: val })}
                statusText={policy.allowShipperCash ? "Shipper thu tiền mặt khi giao" : "Khách luôn chuyển khoản"}
                disabled={disabled}
              />

              {/* 3. ĐIỀU PHỐI ĐƯỢC DUYỆT BILL & XÁC NHẬN */}
              <PolicyRow
                icon={<Users size={17} className="text-text" />}
                title="Cho phép Điều phối duyệt bill & nhận đơn"
                description="Khi thấy ảnh bill khách gửi, Điều phối được phép bấm xác nhận (cả cọc và lần 2) để đơn vào xưởng ngay."
                isOn={isCoordinatorAllowed}
                onToggle={(val) =>
                  onChange({
                    trackingTriggerPolicy: val ? "PAYMENT_OR_COORDINATOR" : "PAYMENT_ONLY",
                    balancePaymentTriggerPolicy: val ? "PAYMENT_OR_COORDINATOR" : "PAYMENT_ONLY",
                  })
                }
                statusText={isCoordinatorAllowed ? "Điều hành HOẶC Điều phối" : "Chỉ Điều hành (người giữ TK)"}
                disabled={disabled}
              />

              {/* 3b. AI ĐỌC BILL (mặc định TẮT — PO 14/10/2026) */}
              <PolicyRow
                icon={<Clock size={17} className="text-text" />}
                title="AI đọc ảnh bill chuyển khoản"
                description="Bật: AI tự đọc tài khoản nhận, số tiền, mã giao dịch trên bill và đánh dấu bill khớp, lệch hoặc nghi trùng để duyệt nhanh. Ảnh bill được gửi sang dịch vụ AI bên ngoài và có tính phí theo lượt. Tắt (mặc định): người duyệt tự xem ảnh bill."
                isOn={policy.aiReadPaymentProof === true}
                onToggle={(val) => onChange({ aiReadPaymentProof: val })}
                statusText={policy.aiReadPaymentProof ? "AI đọc mọi bill khách gửi" : "Người duyệt tự xem bill"}
                disabled={disabled}
              />

              {/* 4. TỰ ĐỘNG DUYỆT BILL SAU 15 PHÚT */}
              <PolicyRow
                icon={<Clock size={17} className="text-text" />}
                title="Tự động duyệt thanh toán khi có ảnh chụp bill"
                description="Bill khách tải lên khớp đúng tài khoản và số tiền mà quá thời gian chọn chưa ai bấm duyệt, hệ thống tự xác nhận để đơn vào chế tác kịp giờ. Bill lệch hoặc không đọc được luôn chờ người duyệt. Cần bật “AI đọc ảnh bill”."
                isOn={isAutoApproveProof}
                onToggle={(val) => onChange({ autoApprovePaymentWithProof: val })}
                extraControl={
                  <Select
                    disabled={disabled || !isAutoApproveProof}
                    value={String(policy.autoApprovePaymentWithProofMinutes ?? 15)}
                    onValueChange={(val) => onChange({ autoApprovePaymentWithProofMinutes: Number(val) })}
                  >
                    <SelectTrigger aria-label="Thời gian chờ trước khi tự duyệt bill" className="h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 phút</SelectItem>
                      <SelectItem value="15">15 phút (Chuẩn)</SelectItem>
                      <SelectItem value="30">30 phút</SelectItem>
                    </SelectContent>
                  </Select>
                }
                disabled={disabled}
              />

              {/* 5. TỰ ĐỘNG HỦY & HOÀN TIỀN KHI ĐIỀU PHỐI TỪ CHỐI */}
              <PolicyRow
                icon={<AlertTriangle size={17} className="text-warning-text" />}
                title="Tự động hủy & hoàn tiền khi Điều phối từ chối"
                description="Khi xưởng hết nguyên liệu/quá tải, Điều phối báo từ chối. Quá thời gian quy định sẽ tự hủy & tạo lệnh hoàn tiền."
                isOn={Boolean(policy.cancellationApprovalTimeoutMinutes && policy.cancellationApprovalTimeoutMinutes <= 120)}
                onToggle={(val) => onChange({ cancellationApprovalTimeoutMinutes: val ? 30 : 1440 })}
                extraControl={
                  <Select
                    disabled={disabled}
                    value={String(policy.cancellationApprovalTimeoutMinutes ?? 15)}
                    onValueChange={(val) => onChange({ cancellationApprovalTimeoutMinutes: Number(val) })}
                  >
                    <SelectTrigger aria-label="Thời gian chờ trước khi tự hủy và hoàn tiền" className="h-8 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 phút</SelectItem>
                      <SelectItem value="10">10 phút</SelectItem>
                      <SelectItem value="15">15 phút (Ngày thường)</SelectItem>
                      <SelectItem value="30">30 phút (Cao điểm)</SelectItem>
                      <SelectItem value="60">60 phút</SelectItem>
                    </SelectContent>
                  </Select>
                }
                disabled={disabled}
              />

              {/* 6. HẠN THANH TOÁN GIỮ ĐƠN */}
              <PolicyRow
                icon={<Clock size={17} className="text-text" />}
                title="Hạn thanh toán giữ đơn (Tự hủy đơn nháp)"
                description="Hết giờ mà khách chưa chuyển khoản ➔ Đơn tự hủy để giải phóng tồn kho cho khách khác."
                isOn={isAutoCancelUnpaid}
                onToggle={(val) => onChange({ paymentTimeoutMinutes: val ? 30 : 0, autoCancelUnpaid: val })}
                extraControl={
                  <Select
                    disabled={disabled || !isAutoCancelUnpaid}
                    value={String(policy.paymentTimeoutMinutes || 30)}
                    onValueChange={(val) => onChange({ paymentTimeoutMinutes: Number(val) })}
                  >
                    <SelectTrigger aria-label="Hạn thanh toán giữ đơn" className="h-8 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 phút</SelectItem>
                      <SelectItem value="30">30 phút (Chuẩn)</SelectItem>
                      <SelectItem value="45">45 phút</SelectItem>
                      <SelectItem value="60">60 phút</SelectItem>
                    </SelectContent>
                  </Select>
                }
                disabled={disabled}
              />

              {/* 7. BẮT BUỘC KHÁCH TẢI ẢNH BILL */}
              <PolicyRow
                icon={<Camera size={17} className="text-text" />}
                title="Bắt buộc khách tải ảnh chụp bill chuyển khoản"
                description="Khách bắt buộc phải tải ảnh bill giao dịch thành công mới bấm được nút 'Tôi đã chuyển khoản'."
                isOn={isProofRequired}
                onToggle={(val) => onChange({ requirePaymentProof: val })}
                statusText={isProofRequired ? "Khuyên dùng BẬT để chống bill ảo" : "Cho phép báo chuyển không ảnh"}
                disabled={disabled}
              />

              {/* 8. ẢNH THÀNH PHẨM QC */}
              <PolicyRow
                icon={<Camera size={17} className="text-text" />}
                title="Bắt buộc ảnh sản phẩm hoàn thiện (QC) trước khi Giao"
                description="Thợ chế tác phải tải ảnh QC lên hệ thống mới mở nút Giao Ship. Tắt = không chặn xuất giao."
                isOn={isQCRequired}
                onToggle={(val) => onChange({ requireProductPhotoQC: val })}
                statusText={isQCRequired ? "Kiểm định sản phẩm chặt chẽ" : "Tự do giao (Thợ vẫn có thể tải ảnh)"}
                disabled={disabled}
              />

              {/* 9. ĐẾM NGƯỢC DUYỆT ẢNH HOA THÀNH PHẨM */}
              <PolicyRow
                icon={<Clock size={17} className="text-text" />}
                title="Đếm ngược duyệt ảnh thành phẩm"
                description="Khách xem ảnh trên link theo dõi. Hết thời gian đếm ngược sẽ tự động duyệt để kịp giờ bàn giao tài xế."
                isOn={(policy.productPhotoReviewMinutes ?? 10) > 0}
                onToggle={(val) => onChange({ productPhotoReviewMinutes: val ? 10 : 0 })}
                extraControl={
                  <Select
                    disabled={disabled || (policy.productPhotoReviewMinutes ?? 10) === 0}
                    value={String(policy.productPhotoReviewMinutes || 10)}
                    onValueChange={(val) => onChange({ productPhotoReviewMinutes: Number(val) })}
                  >
                    <SelectTrigger aria-label="Thời gian khách duyệt ảnh thành phẩm" className="h-8 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 phút</SelectItem>
                      <SelectItem value="10">10 phút (Chuẩn)</SelectItem>
                      <SelectItem value="15">15 phút</SelectItem>
                      <SelectItem value="20">20 phút</SelectItem>
                    </SelectContent>
                  </Select>
                }
                disabled={disabled}
              />

              {/* 10. ẢNH NGƯỜI NHẬN HOA */}
              <PolicyRow
                icon={<Camera size={17} className="text-text" />}
                title="Bắt buộc ảnh người nhận hàng lúc giao thành công"
                description="Shipper phải chụp ảnh người nhận mới bấm Hoàn tất. Tắt = cho phép bấm Hoàn tất trực tiếp."
                isOn={isRecipientPhotoRequired}
                onToggle={(val) => onChange({ requireRecipientPhoto: val })}
                statusText={isRecipientPhotoRequired ? "Bảo đảm bằng chứng giao" : "Tự do hoàn tất (Shipper vẫn chụp được)"}
                disabled={disabled}
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
