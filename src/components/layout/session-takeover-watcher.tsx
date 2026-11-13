"use client"

// Một tài khoản chỉ một phiên: khi ai đó đăng nhập cùng tài khoản ở thiết bị
// khác, phiên ở đây bị thu hồi. Thành phần này hỏi máy chủ định kỳ (và mỗi khi
// người dùng quay lại tab) để hiện cảnh báo NGAY, không đợi thao tác kế tiếp.

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"

const POLL_MS = 15_000
const SUPERSEDED = "SESSION_SUPERSEDED"

export function SessionTakeoverWatcher() {
  const [biThay, setBiThay] = useState(false)

  useEffect(() => {
    if (biThay) return
    let huy = false

    async function kiemTra() {
      if (document.visibilityState !== "visible") return
      try {
        const res = await fetch("/api/v1/auth/session-status", { cache: "no-store" })
        if (res.status !== 401 || huy) return
        const data = await res.json().catch(() => null)
        if (data?.error?.details?.reason === SUPERSEDED) setBiThay(true)
      } catch {
        // Mất mạng tạm thời — lượt sau hỏi lại.
      }
    }

    const timer = window.setInterval(kiemTra, POLL_MS)
    const khiQuayLai = () => void kiemTra()
    document.addEventListener("visibilitychange", khiQuayLai)
    window.addEventListener("focus", khiQuayLai)
    return () => {
      huy = true
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", khiQuayLai)
      window.removeEventListener("focus", khiQuayLai)
    }
  }, [biThay])

  const dangNhapLai = () => window.location.assign("/dang-nhap")

  return (
    <Dialog
      open={biThay}
      onOpenChange={() => {}}
      showCloseButton={false}
      size="sm"
      title="Tài khoản đang được dùng ở nơi khác"
      footer={<Button onClick={dangNhapLai}>Đăng nhập lại</Button>}
    >
      <p className="text-body text-text-muted">
        Có người vừa đăng nhập tài khoản này trên một thiết bị khác, nên phiên làm việc ở đây đã
        kết thúc. Nếu đó không phải bạn, hãy đăng nhập lại và đổi mật khẩu ngay.
      </p>
    </Dialog>
  )
}
