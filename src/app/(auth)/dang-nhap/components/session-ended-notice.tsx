"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

import { isSupersededResponse } from "./session-ended"

/**
 * Bị đẩy về trang đăng nhập vì tài khoản vừa đăng nhập ở thiết bị khác (một tài khoản chỉ một phiên, checklist
 * ALG 1.2). Có `?ly-do=thiet-bi-khac` thì hiện ngay; không có (màn nào đó tự chuyển về đây khi gặp 401) thì hỏi
 * máy chủ lý do phiên trong cookie đã kết thúc.
 */
export function SessionEndedNotice() {
  const params = useSearchParams()
  const fromParam = params.get("ly-do") === "thiet-bi-khac"
  const [superseded, setSuperseded] = useState(false)

  useEffect(() => {
    if (fromParam) return
    let cancelled = false
    fetch("/api/v1/auth/session-status", { cache: "no-store" })
      .then(async (res) => isSupersededResponse(res.status, await res.json().catch(() => null)))
      .then((yes) => { if (!cancelled && yes) setSuperseded(true) })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [fromParam])

  if (!fromParam && !superseded) return null
  return (
    <div role="alert" className="rounded-xl border-[1.5px] border-warning/30 bg-warning/10 px-3.5 py-2.5 text-body-sm font-medium text-warning">
      Tài khoản của bạn vừa được đăng nhập trên một thiết bị khác nên phiên ở đây đã kết thúc. Nếu
      đó không phải bạn, hãy đăng nhập lại và đổi mật khẩu.
    </div>
  )
}
