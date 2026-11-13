"use client"

import { useState, useEffect, type FormEvent } from "react"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/select"
import type { RoleOption } from "./invite-member-dialog"

interface MemberTarget {
  id: string
  name: string | null
  email: string
  roleId: string | null
  roleName: string | null
  chainBranchCode: string | null
}

/** Vai tài khoản cửa hàng nhận gia công — cần gắn một chi nhánh chuỗi */
const STORE_ROLE_KEY = "cua_hang"

interface ChangeRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: MemberTarget | null
  roles: RoleOption[]
  canRemove: boolean
  onSuccess: () => void
}

export function ChangeRoleDialog({
  open,
  onOpenChange,
  member,
  roles,
  canRemove,
  onSuccess,
}: ChangeRoleDialogProps) {
  const [selectedRoleId, setSelectedRoleId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chainBranches, setChainBranches] = useState<Array<{ code: string; name: string }>>([])
  const [selectedBranchCode, setSelectedBranchCode] = useState("")

  useEffect(() => {
    if (member) {
      setSelectedRoleId(member.roleId || "")
      setSelectedBranchCode(member.chainBranchCode || "")
      setError(null)
      setShowRemoveConfirm(false)
    }
  }, [member])

  const isStoreRole = roles.find((r) => r.id === selectedRoleId)?.key === STORE_ROLE_KEY

  useEffect(() => {
    if (!open || !isStoreRole || chainBranches.length > 0) return
    fetch("/api/v1/members/chain-branches")
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { data?: Array<{ code: string; name: string }> } | null) => setChainBranches(body?.data ?? []))
      .catch(() => setChainBranches([]))
  }, [open, isStoreRole, chainBranches.length])

  if (!member) return null

  const roleChanged = selectedRoleId !== member.roleId
  const branchChanged = isStoreRole && selectedBranchCode !== (member.chainBranchCode || "")

  const handleUpdateRole = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedRoleId) {
      setError("Vui lòng chọn vai trò mới.")
      return
    }

    if (isStoreRole && !selectedBranchCode) {
      setError("Vui lòng chọn chi nhánh cho tài khoản cửa hàng.")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      if (roleChanged) {
        const res = await fetch(`/api/v1/members/${member.id}/role`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role_id: selectedRoleId }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.error?.message || "Không thể cập nhật vai trò.")
        }
      }

      if (branchChanged) {
        const res = await fetch(`/api/v1/members/${member.id}/chain-branch`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chain_branch_code: selectedBranchCode }),
        })
        if (!res.ok) throw new Error("Không gắn được chi nhánh cho tài khoản này.")
      }

      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định."
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveMember = async () => {
    setRemoving(true)
    setError(null)

    try {
      const res = await fetch(`/api/v1/members/${member.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message || "Không thể gỡ thành viên khỏi tiệm.")
      }

      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định."
      setError(message)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cập Nhật Vai Trò Nhân Viên"
      description={`Thiết lập phân quyền cho ${member.name || member.email}`}
      size="md"
    >
      <div className="flex flex-col gap-4">
        {error && (
          <div className="rounded-xl border border-warning/30 bg-warning-bg p-3 text-caption text-warning-text">
            {error}
          </div>
        )}

        {/* Thông tin nhân viên */}
        <div className="rounded-xl border border-border bg-surface-alt p-3.5">
          <div className="text-body-sm font-bold text-text">{member.name || "Chưa đặt tên"}</div>
          <div className="text-caption text-text-muted">{member.email}</div>
          <div className="mt-2 text-caption">
            <span className="text-text-muted">Vai trò hiện tại: </span>
            <span className="font-semibold text-primary">{member.roleName || "Chưa phân vai"}</span>
          </div>
        </div>

        {/* Form phân vai mới */}
        <form onSubmit={handleUpdateRole} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-body-sm font-semibold text-text">
              Chọn vai trò phân bổ mới
            </label>
            <NativeSelect
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              disabled={submitting || removing}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.key})
                </option>
              ))}
            </NativeSelect>
          </div>

          {isStoreRole && (
            <div className="flex flex-col gap-1.5">
              <label className="text-body-sm font-semibold text-text">Chi nhánh của tài khoản</label>
              <NativeSelect
                value={selectedBranchCode}
                onChange={(e) => setSelectedBranchCode(e.target.value)}
                disabled={submitting || removing}
              >
                <option value="">— Chọn chi nhánh —</option>
                {chainBranches.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </NativeSelect>
              <p className="text-caption text-text-muted">Tài khoản chỉ thấy và nhận đơn gia công của chi nhánh này.</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting || removing}
            >
              Đóng
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || removing || (!roleChanged && !branchChanged)}
            >
              <ShieldCheck size={16} />
              <span>{submitting ? "Đang lưu..." : "Cập Nhật Vai Trò"}</span>
            </Button>
          </div>
        </form>

        {/* Khu vực nguy hiểm: Gỡ khỏi tiệm */}
        {canRemove && (
          <div className="mt-2 border-t border-border pt-4">
            {!showRemoveConfirm ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-caption font-semibold text-danger">Gỡ nhân viên khỏi tiệm</div>
                  <div className="text-caption text-text-muted">Thu hồi toàn bộ quyền truy cập vào cửa hàng.</div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRemoveConfirm(true)}
                  disabled={submitting || removing}
                  className="text-danger-text hover:border-danger hover:bg-danger-bg"
                >
                  <Trash2 size={15} />
                  <span>Gỡ nhân viên</span>
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-danger/30 bg-danger-bg p-3.5">
                <div className="flex items-start gap-2 text-danger">
                  <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                  <div className="text-caption font-semibold">
                    Bạn có chắc chắn muốn gỡ nhân viên này khỏi tiệm? Hành động này không thể hoàn tác.
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRemoveConfirm(false)}
                    disabled={removing}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="button"
                    variant="warning"
                    size="sm"
                    onClick={handleRemoveMember}
                    disabled={removing}
                    className="bg-danger text-white hover:opacity-90"
                  >
                    {removing ? "Đang gỡ..." : "Xác Nhận Gỡ"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  )
}
