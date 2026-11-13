"use client"

import { useState, type FormEvent } from "react"
import { UserPlus } from "@/components/ui/icon-set/user-plus"
import { Mail } from "@/components/ui/icon-set/mail"
import { Shield } from "@/components/ui/icon-set/shield"
import { User } from "@/components/ui/icon-set/user"
import { Phone } from "@/components/ui/icon-set/phone"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import type { RoleOption } from "./invite-member-dialog"
import { TemporaryPasswordNotice } from "./temporary-password-notice"

const SELECT = "flex h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 text-body-sm text-text focus-visible:outline-2 focus-visible:outline-primary"

/**
 * Điều hành tạo tài khoản nhân viên (PO 08/10/2026): họ tên, email đăng nhập (không cần email thật),
 * vai → tài khoản dùng được ngay + mật khẩu tạm hiện một lần.
 */
export function AddStaffDialog({
  open,
  onOpenChange,
  roles,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  roles: RoleOption[]
  onSuccess: () => void
}) {
  const defaultRole = roles.find((r) => r.key === "sale")?.id ?? ""
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [roleId, setRoleId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ email: string; temporaryPassword: string } | null>(null)

  const close = (next: boolean) => {
    if (!next) {
      setName("")
      setEmail("")
      setPhone("")
      setRoleId("")
      setError(null)
      setCreated(null)
    }
    onOpenChange(next)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const role = roleId || defaultRole
    if (!name.trim() || !email.trim() || !role) {
      setError("Nhập họ tên, email đăng nhập và chọn vai cho nhân viên.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role_id: role, ...(phone.trim() ? { phone: phone.trim() } : {}) }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        const details = body?.error?.details as Record<string, string> | undefined
        throw new Error(details?.email || details?.name || details?.phone || body?.error?.message || "Không tạo được tài khoản. Vui lòng thử lại.")
      }
      setCreated(body.data)
      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không tạo được tài khoản. Vui lòng thử lại.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close} title="Thêm nhân viên" description="Tạo tài khoản đăng nhập cho Sale, Điều phối… dùng được ngay." size="md">
      {created ? (
        <div className="flex flex-col gap-4">
          <TemporaryPasswordNotice email={created.email} password={created.temporaryPassword} />
          <div className="flex justify-end border-t border-border pt-4">
            <Button type="button" variant="outline" size="sm" onClick={() => close(false)}>Xong</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <div role="alert" className="rounded-xl border border-warning/30 bg-warning-bg p-3 text-caption text-warning-text">{error}</div>}
          <label className="flex flex-col gap-1.5 text-body-sm font-semibold text-text">
            <span className="flex items-center gap-1.5"><User size={15} className="text-text-muted" />Họ tên nhân viên</span>
            <Input value={name} maxLength={100} placeholder="VD: Nguyễn Thị Lan" onChange={(e) => setName(e.target.value)} disabled={submitting} />
          </label>
          <label className="flex flex-col gap-1.5 text-body-sm font-semibold text-text">
            <span className="flex items-center gap-1.5"><Mail size={15} className="text-text-muted" />Email đăng nhập</span>
            <Input type="email" value={email} placeholder="VD: lan.sale@tenquan.vn" onChange={(e) => setEmail(e.target.value)} disabled={submitting} />
            <span className="text-caption font-normal text-text-muted">Chỉ dùng để đăng nhập — không cần là email thật, nhưng mỗi người một email riêng.</span>
          </label>
          <label className="flex flex-col gap-1.5 text-body-sm font-semibold text-text">
            <span className="flex items-center gap-1.5"><Phone size={15} className="text-text-muted" />Số điện thoại (không bắt buộc)</span>
            <Input type="tel" value={phone} placeholder="VD: 0912345678" onChange={(e) => setPhone(e.target.value)} disabled={submitting} />
            <span className="text-caption font-normal text-text-muted">Shipper nhận đơn giao theo số này — Điều phối ghi đúng số khi điều xe.</span>
          </label>
          <label className="flex flex-col gap-1.5 text-body-sm font-semibold text-text">
            <span className="flex items-center gap-1.5"><Shield size={15} className="text-text-muted" />Vai trò</span>
            <NativeSelect value={roleId || defaultRole} onChange={(e) => setRoleId(e.target.value)} disabled={submitting}>
              <option value="">-- Chọn vai trò --</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </NativeSelect>
          </label>
          <div className="mt-2 flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" size="sm" onClick={() => close(false)} disabled={submitting}>Hủy</Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              <UserPlus size={16} />
              <span>{submitting ? "Đang tạo..." : "Tạo tài khoản"}</span>
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
