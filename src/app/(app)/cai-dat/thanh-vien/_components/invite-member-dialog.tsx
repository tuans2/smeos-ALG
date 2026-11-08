"use client"

import { useState, type FormEvent } from "react"
import { UserPlus } from "@/components/ui/icon-set/user-plus"
import { Mail } from "@/components/ui/icon-set/mail"
import { Shield } from "@/components/ui/icon-set/shield"
import { Building } from "@/components/ui/icon-set/building"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"

export interface RoleOption {
  id: string
  key: string
  name: string
}

export interface BranchOption {
  id: string
  name: string
  code: string
}

interface InviteMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roles: RoleOption[]
  branches: BranchOption[]
  onSuccess: () => void
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  roles,
  branches,
  onSuccess,
}: InviteMemberDialogProps) {
  const [email, setEmail] = useState("")
  const [roleId, setRoleId] = useState("")
  const [branchId, setBranchId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !roleId) {
      setError("Vui lòng nhập email và chọn vai trò cho nhân viên.")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/v1/members/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          role_id: roleId,
          branch_id: branchId.trim() ? branchId : null,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message || "Không thể mời thành viên. Vui lòng thử lại.")
      }

      setEmail("")
      setRoleId("")
      setBranchId("")
      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định."
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Mời người đã có tài khoản"
      description="Dành cho người đã dùng smeOS ở cửa hàng khác. Họ nhận lời mời ở mục “Tổ chức của tôi” trong menu tài khoản, trong 14 ngày."
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-xl border border-warning/30 bg-warning-bg p-3 text-caption text-warning-text">
            {error}
          </div>
        )}

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-body-sm font-semibold text-text">
            <Mail size={15} className="text-text-muted" />
            <span>Địa chỉ Email nhân viên</span>
          </label>
          <Input
            type="email"
            placeholder="nhanvien@tiemhoa.vn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            required
          />
          <span className="text-caption text-text-muted">
            Email chưa có tài khoản thì dùng nút “Thêm nhân viên” để tạo tài khoản dùng được ngay.
          </span>
        </div>

        {/* Vai trò */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-body-sm font-semibold text-text">
            <Shield size={15} className="text-text-muted" />
            <span>Vai trò phụ trách</span>
          </label>
          <NativeSelect
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            disabled={submitting}
            required
          >
            <option value="">-- Chọn vai trò cho nhân viên --</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.key})
              </option>
            ))}
          </NativeSelect>
        </div>

        {/* Chi nhánh (tùy chọn) */}
        {branches.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-body-sm font-semibold text-text">
              <Building size={15} className="text-text-muted" />
              <span>Chi nhánh làm việc (tùy chọn)</span>
            </label>
            <NativeSelect
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              disabled={submitting}
            >
              <option value="">Toàn bộ cửa hàng (Không giới hạn chi nhánh)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </NativeSelect>
          </div>
        )}

        {/* Nút hành động */}
        <div className="mt-2 flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Hủy
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={submitting}>
            <UserPlus size={16} />
            <span>{submitting ? "Đang gửi..." : "Gửi Lời Mời"}</span>
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
