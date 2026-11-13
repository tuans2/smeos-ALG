"use client"

import { useState, type FormEvent } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const MIN_LENGTH = 10

/**
 * Tự đổi mật khẩu (`A2`) — dùng ngay sau khi nhận mật khẩu tạm từ Điều hành. `required`: tài khoản
 * đang dùng mật khẩu tạm, hộp không đóng được tới khi đổi xong (checklist ALG 1.4); `onChanged` chạy
 * sau khi đổi thành công.
 */
export function ChangePasswordDialog({
  open,
  onOpenChange,
  required = false,
  onChanged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  required?: boolean
  onChanged?: () => void
}) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const close = (value: boolean) => {
    if (!value && required) return
    if (!value) {
      setCurrent("")
      setNext("")
      setConfirm("")
      setMessage(null)
    }
    onOpenChange(value)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (next.length < MIN_LENGTH) return setMessage({ ok: false, text: `Mật khẩu mới tối thiểu ${MIN_LENGTH} ký tự.` })
    if (next !== confirm) return setMessage({ ok: false, text: "Hai lần nhập mật khẩu mới chưa khớp." })
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch("/api/v1/session/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: current, new_password: next }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        const d = body?.error?.details as Record<string, string> | undefined
        throw new Error(d?.currentPassword || d?.newPassword || body?.error?.message || "Không đổi được mật khẩu")
      }
      setCurrent("")
      setNext("")
      setConfirm("")
      setMessage({ ok: true, text: "Đã đổi mật khẩu. Các máy khác đã được đăng xuất." })
      onChanged?.()
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Không đổi được mật khẩu" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      title="Đổi mật khẩu"
      size="sm"
      showCloseButton={!required}
      {...(required ? { description: "Tài khoản đang dùng mật khẩu tạm. Đặt mật khẩu mới để tiếp tục làm việc." } : {})}
    >
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-body-sm font-semibold text-text">
          Mật khẩu hiện tại
          <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} disabled={busy} />
        </label>
        <label className="flex flex-col gap-1 text-body-sm font-semibold text-text">
          Mật khẩu mới (tối thiểu {MIN_LENGTH} ký tự)
          <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} disabled={busy} />
        </label>
        <label className="flex flex-col gap-1 text-body-sm font-semibold text-text">
          Nhập lại mật khẩu mới
          <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={busy} />
        </label>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={`text-caption ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</p>
        )}
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          {!required && <Button type="button" variant="outline" size="sm" onClick={() => close(false)} disabled={busy}>Đóng</Button>}
          <Button type="submit" variant="primary" size="sm" disabled={busy}>{busy ? "Đang đổi..." : "Đổi mật khẩu"}</Button>
        </div>
      </form>
    </Dialog>
  )
}
