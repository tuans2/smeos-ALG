"use client"

import { HoldCountdown } from "./hold-countdown"
import React, { useCallback, useEffect, useState } from "react"
import useSWR from "swr"
import { apiGet } from "@/components/greeting-card/greeting-api"
import { Check, Copy, QrCode, ArrowRight, ShieldCheck } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import type { BrochurePaymentInstructions } from "@/modules/greeting-card/domain/greeting-card-types"
import type { TrackingTriggerPolicy } from "@/modules/greeting-card/domain/brochure-payment-policy"
import Image from "next/image"

const POLL_INTERVAL_MS = 5000
/**
 * Điều hành đã xác nhận nhận tiền — đơn cọc đã nhận cọc cũng coi như xong phần thanh toán của khách
 * (phần còn lại thu sau theo thoả thuận), PO 08/10/2026.
 */
function isPaid(order: { paidVnd: number; totalVnd: number } | undefined): boolean {
  return !!order && order.totalVnd > 0 && order.paidVnd > 0
}
import { BrochureQuotePending } from "./brochure-quote-pending"
import { PaymentFailedNotice } from "./payment-failed-notice"
import { PaymentProofUploader } from "./payment-proof-uploader"
import { BrochurePaymentConfirmedBanner } from "./brochure-payment-confirmed-banner"

import { useI18n } from "@/lib/i18n"

type PolledTracking = { status: string; order?: { status: string; productionStatus?: string; paidVnd: number; totalVnd: number; payment?: { status: string } } }

interface BrochurePaymentViewProps {
  orderCode: string
  sendCode?: string | undefined
  totalVnd: number
  /** `null` khi tiệm chưa cấu hình tài khoản nhận tiền — cửa hàng tự liên hệ khách. */
  vietQr: BrochurePaymentInstructions | null
  shopPhone?: string | null | undefined
  /** Hướng dẫn chuyển tiền quốc tế do cửa hàng cài đặt (Wise, PayPal, Swift...) */
  internationalGuide?: string | null | undefined
  onReportPaid: (proofAssetId?: string) => Promise<void>
  onGoToTracking: () => void
  /** Khách đã báo chuyển khoản trước đó (rời trang rồi quay lại) → hiện ngay "chờ xác nhận" */
  alreadyReported?: boolean | undefined
  /** Thanh toán thất bại (hết hạn thanh toán, đơn tự huỷ) — trang cha đổi nút dưới thành "Đặt lại đơn mới". */
  onPaymentFailed?: (() => void) | undefined
  /** Nút kêu gọi đặt lại đơn, hiện trong thông báo "Đơn hàng không hoàn thành". */
  failedCta?: React.ReactNode
  /** Bắt buộc tải ảnh chuyển khoản; mặc định BẬT (true). */
  requirePaymentProof?: boolean | undefined
  /** Cơ chế kích hoạt bước tiếp theo (PAYMENT_ONLY hoặc PAYMENT_OR_COORDINATOR). */
  triggerPolicy?: TrackingTriggerPolicy | undefined
  /** Số phút tự duyệt khi có ảnh bill — chỉ khi tiệm bật (`auto_approve_payment_with_proof`); null = không tự duyệt */ autoApproveMinutes?: number | null | undefined
}

export function BrochurePaymentView({
  orderCode,
  sendCode,
  totalVnd,
  vietQr,
  shopPhone,
  internationalGuide,
  onReportPaid,
  onGoToTracking,
  alreadyReported = false,
  onPaymentFailed,
  failedCta,
  requirePaymentProof = true,
  triggerPolicy, autoApproveMinutes = null,
}: BrochurePaymentViewProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [hasReported, setHasReported] = useState(alreadyReported)
  const [loading, setLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [proofAssetId, setProofAssetId] = useState<string | null>(null)
  const canSubmit = !requirePaymentProof || !!proofAssetId

  // Hỏi trạng thái đơn định kỳ (SWR) để tự hiện "đã thanh toán" khi Điều hành/ngân hàng xác nhận.
  // Đã xác nhận thì hỏi thưa hơn (đơn còn có thể bị huỷ), đơn huỷ thì dừng; SWR tự bỏ lượt khi tab ẩn.
  const tracking = useSWR<PolledTracking>(
    `/api/v1/public/brochure/tracking/${orderCode}`,
    apiGet,
    { refreshInterval: (latest) => (latest?.order?.status === "CANCELLED" ? 0 : isPaid(latest?.order) ? 15_000 : POLL_INTERVAL_MS), revalidateOnFocus: true }
  )
  const isPaymentConfirmed = isPaid(tracking.data?.order)
  const isOrderAccepted =
    tracking.data?.order?.status === "CONFIRMED" ||
    tracking.data?.order?.status === "PROCESSING" ||
    (Boolean(tracking.data?.order?.productionStatus) && tracking.data?.order?.productionStatus !== "WAITING")
  const canGoToTracking =
    triggerPolicy === "PAYMENT_ONLY"
      ? isPaymentConfirmed
      : isPaymentConfirmed || isOrderAccepted

  // Hết hạn thanh toán: máy chủ huỷ đơn (bộ quét mỗi phút); trình duyệt báo ngay khi đồng hồ về 0
  const [deadlinePassed, setDeadlinePassed] = useState(false)
  const onDeadline = useCallback(() => setDeadlinePassed(true), [])
  const paymentFailed =
    tracking.data?.order?.payment?.status === "PAYMENT_FAILED" ||
    (deadlinePassed && vietQr?.cancelOnExpiry === true && !canGoToTracking && !hasReported)
  useEffect(() => {
    if (paymentFailed) onPaymentFailed?.()
  }, [paymentFailed, onPaymentFailed])
  // Tiệm huỷ đơn khi khách còn ở màn này (vd. Điều phối không nhận đơn) → sang Theo dõi để thấy thông báo huỷ
  const cancelledByShop = tracking.data?.order?.status === "CANCELLED" && !paymentFailed
  useEffect(() => { if (cancelledByShop) onGoToTracking() }, [cancelledByShop, onGoToTracking])
  const depositOnly = isPaymentConfirmed && (tracking.data?.order?.paidVnd ?? 0) < (tracking.data?.order?.totalVnd ?? 0)

  function copyToClipboard(text: string, field: string) {
    void navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  async function handleReportPaid() {
    setLoading(true)
    setReportError(null)
    try {
      await onReportPaid(proofAssetId || undefined)
      setHasReported(true)
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Không gửi được thông báo, vui lòng thử lại")
    } finally {
      setLoading(false)
    }
  }

  // Mẫu chưa có giá ("Liên hệ"): không hiện QR 0 đồng, cửa hàng sẽ báo giá trước khi thu tiền
  if (totalVnd <= 0) return <BrochureQuotePending orderCode={orderCode} onGoToTracking={onGoToTracking} />
  if (paymentFailed) return <PaymentFailedNotice orderCode={orderCode} cta={failedCta} />

  return (
    <div className="w-full max-w-md mx-auto bg-surface rounded-2xl border border-border p-5 sm:p-6 shadow-sm flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
        <QrCode size={26} />
      </div>

      {vietQr ? (
        <>
        <h2 className="text-title font-extrabold text-text mb-1">
          Thanh toán Chuyển khoản QR
        </h2>
        <p className="text-caption text-text-muted mb-4">
          Mở ứng dụng ngân hàng bất kỳ để quét mã QR thanh toán nhanh
        </p>
        {vietQr.holdUntil && !isPaymentConfirmed && !hasReported && (
          <HoldCountdown until={vietQr.holdUntil} deadline={vietQr.cancelOnExpiry === true} onExpire={onDeadline} />
        )}
        {vietQr.cancelOnExpiry && !isPaymentConfirmed && !hasReported && (
          <p className="mb-4 -mt-2 text-caption text-text-muted">Hết thời gian mà chưa chuyển khoản và chưa bấm “Tôi đã chuyển khoản”, đơn sẽ tự huỷ.</p>
        )}
          {vietQr.purpose !== "FULL" && (
            <p className="text-body-sm text-text mb-3">
              Tổng giá trị đơn: <strong>{vietQr.orderTotalVnd.toLocaleString("vi-VN")} đ</strong>
              {vietQr.purpose === "DEPOSIT" && ` — phần còn lại ${(vietQr.orderTotalVnd - vietQr.amount).toLocaleString("vi-VN")} đ thanh toán sau khi hoa hoàn thành và cửa hàng gửi ảnh xác nhận.`}
            </p>
          )}

        {/* QR Card */}
        <div className="p-3 bg-white rounded-2xl border border-border shadow-md mb-5 w-64 aspect-square flex items-center justify-center">
          <Image
            src={vietQr.qrUrl}
            alt={`Mã VietQR đơn ${orderCode}`}
            width={232}
            height={232}
            unoptimized
            priority
            className="w-full h-full object-contain"
          />
        </div>

        {/* Khách thường xem QR trên chính điện thoại dùng để chuyển khoản → không tự quét được:
            mở ảnh ở thẻ mới để nhấn giữ "Lưu ảnh", rồi chọn ảnh QR từ thư viện trong app ngân hàng */}
        <a
          href={vietQr.qrUrl}
          target="_blank"
          rel="noreferrer"
          className="-mt-2 mb-5 inline-flex h-11 items-center justify-center rounded-xl border border-border px-4 text-body-sm font-semibold text-primary hover:bg-surface-alt"
        >
          Mở ảnh QR để lưu vào máy
        </a>
        <p className="-mt-3 mb-5 text-caption text-text-muted">
          Đang dùng điện thoại này để chuyển khoản? Lưu ảnh QR rồi chọn &quot;Quét từ ảnh&quot; trong ứng dụng ngân hàng.
        </p>

        {/* Payment details list */}
        <div className="w-full bg-surface-alt rounded-xl p-3.5 flex flex-col gap-2.5 text-body-sm text-left mb-5 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Ngân hàng:</span>
            <span className="font-bold text-text">{vietQr.bankName}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-muted">Chủ tài khoản:</span>
            <span className="font-bold text-text">{vietQr.accountName}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-muted">Số tài khoản:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-extrabold text-text">{vietQr.accountNo}</span>
              <Button variant="ghost"
                type="button"
                onClick={() => copyToClipboard(vietQr.accountNo, "acc")}
                aria-label="Sao chép số tài khoản"
                className="text-[length:inherit] h-auto font-[inherit] gap-0 text-primary hover:text-primary-dark p-1 cursor-pointer"
              >
                {copiedField === "acc" ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-muted">
              {vietQr.purpose === "DEPOSIT" ? "Đặt cọc lần này:" : vietQr.purpose === "BALANCE" ? "Còn phải trả:" : "Số tiền:"}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-primary">{vietQr.amount.toLocaleString("vi-VN")} đ</span>
              <Button variant="ghost"
                type="button"
                onClick={() => copyToClipboard(String(vietQr.amount), "amount")}
                aria-label="Sao chép số tiền"
                className="text-[length:inherit] h-auto font-[inherit] gap-0 text-primary hover:text-primary-dark p-1 cursor-pointer"
              >
                {copiedField === "amount" ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-muted">Nội dung chuyển khoản:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-extrabold text-text">{vietQr.transferMemo}</span>
              <Button variant="ghost"
                type="button"
                onClick={() => copyToClipboard(vietQr.transferMemo, "memo")}
                aria-label="Sao chép nội dung chuyển khoản"
                className="text-[length:inherit] h-auto font-[inherit] gap-0 text-primary hover:text-primary-dark p-1 cursor-pointer"
              >
                {copiedField === "memo" ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              </Button>
            </div>
          </div>
        </div>

        {/* Khối hướng dẫn thanh toán quốc tế dành riêng cho khách nước ngoài */}
        {internationalGuide && (
          <div className="w-full p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2 text-left">
            <div className="flex items-center gap-2 text-body-sm font-bold text-text">
              <span className="text-title">🌍</span>
              <span>International Payment (Wise / PayPal / Swift / Zelle)</span>
            </div>
            <p className="text-body-sm text-text/90 whitespace-pre-line leading-relaxed font-mono">
              {internationalGuide}
            </p>
          </div>
        )}
        </>
      ) : (
        <>
          <h2 className="text-title font-extrabold text-text mb-1">Đặt hàng thành công!</h2>
          <p className="text-body-sm text-text-muted mb-4">
            Đơn <span className="font-mono font-bold text-text">#{orderCode}</span> trị giá{" "}
            <span className="font-bold text-primary">{totalVnd.toLocaleString("vi-VN")} đ</span>. Cửa hàng sẽ liên hệ
            bạn để hướng dẫn thanh toán.
            {shopPhone && <span className="block mt-1">Hotline cửa hàng: {shopPhone}</span>}
          </p>
        </>
      )}

      {/* Confirmation State Actions */}
      {canGoToTracking ? (
        <BrochurePaymentConfirmedBanner
          isPaymentConfirmed={isPaymentConfirmed}
          isOrderAccepted={isOrderAccepted}
          depositOnly={depositOnly}
          onGoToTracking={onGoToTracking}
        />
      ) : hasReported ? (
        <div className="w-full flex flex-col gap-3">
          <div className="p-3.5 rounded-xl bg-info-bg border border-info/30 text-info text-body-sm flex flex-col items-center justify-center gap-1.5 text-center">
            <div className="flex items-center gap-2 font-bold text-text">
              <ShieldCheck size={18} className="text-info" />
              <span>Đã báo chuyển khoản thành công!</span>
            </div>
            <p className="text-body-sm text-text font-semibold">
              Thời gian xác nhận chuyển khoản sẽ trong vòng 15’
            </p>
            <p className="text-caption text-text-muted">
              {isOrderAccepted
                ? "Xưởng đã tiếp nhận đơn! Đang chờ Điều hành đối soát chuyển khoản để kích hoạt màn hình theo dõi tiến độ..."
                : `Đang chờ Điều hành đối soát chuyển khoản${autoApproveMinutes ? ` (hệ thống tự động duyệt sau ${autoApproveMinutes}’ khi có ảnh bill hợp lệ)` : ""}${
                  triggerPolicy === "PAYMENT_ONLY" ? "" : " hoặc Điều phối xác nhận tiếp nhận đơn"}...`}
            </p>
          </div>
          <p className="text-caption text-text-muted text-center">
            {triggerPolicy === "PAYMENT_ONLY"
              ? "Nút Theo dõi tiến độ sẽ được kích hoạt ngay khi cửa hàng xác nhận đã nhận tiền."
              : "Nút Theo dõi tiến độ sẽ được kích hoạt ngay khi cửa hàng xác nhận đã nhận tiền hoặc tiếp nhận đơn."}
          </p>
          <Button
            type="button"
            disabled
            variant="outline"
            onClick={() => {}}
            className="w-full h-11 text-body-sm text-text-muted opacity-60 cursor-not-allowed rounded-xl flex items-center justify-center gap-2"
          >
            <span>Theo dõi tiến độ đơn hàng (Chờ xác nhận)</span>
            <ArrowRight size={16} />
          </Button>
        </div>
      ) : vietQr ? (
        <div className="w-full flex flex-col gap-2.5">
          {requirePaymentProof && sendCode && (
            <PaymentProofUploader
              sendCode={sendCode}
              purpose="DEPOSIT"
              onUploaded={(id) => setProofAssetId(id)}
              onRemoved={() => setProofAssetId(null)}
              disabled={loading}
            />
          )}

          {reportError && (
            <p role="alert" className="text-caption text-danger font-medium">{reportError}</p>
          )}
          <Button variant="ghost"
            type="button"
            disabled={loading || !canSubmit}
            onClick={handleReportPaid}
            className="px-0 py-0 w-full h-12 bg-success hover:bg-success/90 text-white font-extrabold text-body flex items-center justify-center gap-2 rounded-xl shadow-md cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={18} />
            <span>{loading ? "Đang xử lý..." : "TÔI ĐÃ CHUYỂN KHOẢN THANH TOÁN"}</span>
          </Button>
          {!canSubmit && (
            <p className="text-caption text-warning-text font-medium text-center">
              Vui lòng tải ảnh chuyển khoản để xác nhận
            </p>
          )}
          <Button
            type="button"
            disabled
            variant="outline"
            onClick={() => {}}
            className="w-full h-11 text-body-sm text-text-muted opacity-50 cursor-not-allowed rounded-xl flex items-center justify-center gap-2"
          >
            <span>Theo dõi tiến độ đơn hàng (Chờ thanh toán)</span>
            <ArrowRight size={16} />
          </Button>
          <p className="text-caption text-text-muted">
            Sau khi chuyển khoản, nhấn &quot;Tôi đã chuyển khoản thanh toán&quot;. Cửa hàng xác nhận đã nhận tiền thì nút Theo dõi tiến độ sẽ được kích hoạt.
          </p>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={onGoToTracking}
          className="w-full h-11 font-extrabold text-body-sm flex items-center justify-center gap-2 rounded-xl cursor-pointer"
        >
          <span>Theo dõi tiến độ Đơn hàng</span>
          <ArrowRight size={16} />
        </Button>
      )}
    </div>
  )
}
