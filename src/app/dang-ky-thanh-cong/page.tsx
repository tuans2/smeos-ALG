"use client"

import { useI18n } from "@/lib/i18n"
import Link from "next/link"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Clock } from "@/components/ui/icon-set/clock"
import { Mail } from "@/components/ui/icon-set/mail"


/**
 * Trang xác nhận sau khi đăng ký — public, không cần auth.
 * Hiển thị thông báo chờ Super Admin duyệt.
 */
export default function DangKyThanhCongPage() {
  const { t } = useI18n()
  return (
    <main className="min-h-screen flex items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-[460px] space-y-6">
        {/* Card chính */}
        <div className="rounded-2xl border border-border bg-surface shadow-lg p-8 text-center space-y-5">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-bg border-2 border-success-border mx-auto">
            <CheckCircle2 className="text-success" size={32} strokeWidth={1.8} />
          </div>

          {/* Tiêu đề */}
          <div>
            <h1 className="text-title font-extrabold text-text mb-1.5">
              Đăng ký thành công!
            </h1>
            <p className="text-body-sm text-text-muted leading-relaxed">
              Đơn đăng ký của bạn đã được ghi nhận. Chúng tôi đang xem xét và sẽ liên hệ
              qua email trong vòng <strong className="text-text">24–48 giờ</strong>.
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Bước tiếp theo */}
          <div className="space-y-3 text-left">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-warning-bg border border-warning-border">
              <div className="mt-0.5 shrink-0">
                <Clock size={16} className="text-warning-text" />
              </div>
              <div>
                <p className="text-caption font-semibold text-warning-text">Chờ xét duyệt</p>
                <p className="text-caption text-warning-text/90 mt-0.5 leading-relaxed">
                  Nhóm vận hành sẽ kiểm tra thông tin và kích hoạt tài khoản của bạn.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-info-bg border border-info-border">
              <div className="mt-0.5 shrink-0">
                <Mail size={16} className="text-info" />
              </div>
              <div>
                <p className="text-caption font-semibold text-info-text">Kiểm tra hộp thư</p>
                <p className="text-caption text-info-text/90 mt-0.5 leading-relaxed">
                  Khi được duyệt, chúng tôi sẽ thông báo đến email bạn đã đăng ký.
                  Sau đó bạn có thể đăng nhập bình thường.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Link đăng nhập */}
        <p className="text-center text-body-sm text-text-muted">
          Đã được duyệt?{" "}
          <Link
            href="/dang-nhap"
            className="font-semibold text-primary hover:underline transition-colors"
          >
            Đăng nhập ngay
          </Link>
        </p>

        {/* Branding */}
        <p className="text-center text-caption text-text-muted">
          smeOS Platform · Giai đoạn thử nghiệm (Beta)
        </p>
      </div>
    </main>
  )
}
