"use client"

import { useState } from "react"
import { KeyRound } from "@/components/ui/icon-set/key-round"
import { Lock } from "@/components/ui/icon-set/lock"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { Unlock } from "@/components/ui/icon-set/unlock"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { TemporaryPasswordNotice } from "./temporary-password-notice"

async function send(url: string, method: string, body: unknown, fallback: string) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error?.message || fallback)
  return json?.data
}

/** Đặt lại mật khẩu (`A7`), tạm khoá/mở lại (`A5`) và xoá (`F4`) một nhân viên — có hỏi lại trước khi làm. */
export function MemberAccountActions({
  member,
  canResetPassword,
  canToggleActive,
  canRemove = false,
  onChanged,
}: {
  member: { id: string; name: string | null; email: string; status: string }
  canResetPassword: boolean
  canToggleActive: boolean
  canRemove?: boolean
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [reset, setReset] = useState<{ email: string; temporaryPassword: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirm, confirmDialog] = useConfirmDialog()
  const who = member.name || member.email
  const suspended = member.status === "SUSPENDED"

  const doReset = async () => {
    if (
      !(await confirm({
        title: `Đặt lại mật khẩu cho ${who}?`,
        consequence: "Người này sẽ bị đăng xuất ở mọi thiết bị và nhận mật khẩu tạm.",
        confirmLabel: "Đặt lại mật khẩu",
        tone: "danger",
      }))
    ) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      setReset(await send(`/api/v1/members/${member.id}/reset-password`, "POST", {}, "Không đặt lại được mật khẩu"))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đặt lại được mật khẩu")
    } finally {
      setBusy(false)
    }
  }

  const doToggle = async () => {
    const question = suspended ? `Mở khoá tài khoản ${who}?` : `Tạm khoá tài khoản ${who}?`
    const consequence = suspended
      ? "Người này sẽ có thể đăng nhập lại vào tiệm."
      : "Người này bị đăng xuất ngay, dữ liệu và đơn vẫn giữ nguyên."
    if (
      !(await confirm({
        title: question,
        consequence,
        confirmLabel: suspended ? "Mở khoá" : "Tạm khoá",
        tone: suspended ? "default" : "danger",
      }))
    ) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await send(`/api/v1/members/${member.id}/status`, "PATCH", { active: suspended }, "Không cập nhật được trạng thái")
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được trạng thái")
    } finally {
      setBusy(false)
    }
  }

  const doRemove = async () => {
    if (
      !(await confirm({
        title: `Xoá tài khoản ${who} khỏi tiệm?`,
        consequence: "Người này bị đăng xuất ngay và không vào tiệm được nữa. Đơn hàng, dữ liệu cũ vẫn giữ nguyên.",
        confirmLabel: "Xoá tài khoản",
        tone: "danger",
      }))
    ) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/members/${member.id}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error?.message || "Không xoá được tài khoản")
      }
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xoá được tài khoản")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {canResetPassword && (
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void doReset()} aria-label={`Đặt lại mật khẩu cho ${who}`}>
          <KeyRound size={15} />
          <span>Đặt lại mật khẩu</span>
        </Button>
      )}
      {canToggleActive && (
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void doToggle()} aria-label={`${suspended ? "Mở khoá" : "Tạm khoá"} ${who}`}>
          {suspended ? <Unlock size={15} /> : <Lock size={15} />}
          <span>{suspended ? "Mở khoá" : "Tạm khoá"}</span>
        </Button>
      )}
      {canRemove && (
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void doRemove()} aria-label={`Xoá tài khoản ${who}`} className="text-danger">
          <Trash2 size={15} />
          <span>Xoá</span>
        </Button>
      )}
      {error && <span role="alert" className="block text-caption text-danger">{error}</span>}
      <Dialog open={reset !== null} onOpenChange={(open) => !open && setReset(null)} title="Mật khẩu tạm mới" size="md">
        {reset && <TemporaryPasswordNotice email={reset.email} password={reset.temporaryPassword} />}
      </Dialog>
      {confirmDialog}
    </>
  )
}
