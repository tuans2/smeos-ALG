"use client"

import { generateVietQrUrl } from "@/modules/greeting-card/adapters/vietqr-helper"

/** Mã VietQR mẫu (checklist ALG 1.8): khách quét ra đúng ngân hàng, số và tên tài khoản cửa hàng vừa khai. */
export function VietQrSample({ bankId, accountNo, accountName }: { bankId: string; accountNo: string; accountName: string }) {
  if (!bankId.trim() || !accountNo.trim()) {
    return <p className="sm:col-span-2 text-caption text-text-muted">Nhập mã ngân hàng và số tài khoản để xem mã VietQR mẫu.</p>
  }
  const url = generateVietQrUrl({ bankId, accountNo, accountName, amount: 0, description: "DON MAU" })
  return (
    <figure className="sm:col-span-2 flex items-center gap-3 rounded-xl border border-border bg-surface-alt p-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- ảnh do VietQR sinh theo tài khoản, không qua bộ tối ưu ảnh */}
      <img src={url} alt="Mã VietQR mẫu của tài khoản nhận tiền" width={120} height={120} className="h-30 w-30 rounded-lg bg-surface object-contain" />
      <figcaption className="text-caption text-text-muted">
        Mã VietQR mẫu. Mỗi đơn có mã riêng kèm số tiền và nội dung chuyển khoản là mã đơn. Quét thử bằng ứng dụng ngân hàng để kiểm tra tên tài khoản.
      </figcaption>
    </figure>
  )
}
