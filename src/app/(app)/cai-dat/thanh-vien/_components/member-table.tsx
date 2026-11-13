"use client"

import { Users } from "@/components/ui/icon-set/users"
import { Building } from "@/components/ui/icon-set/building"
import { Shield } from "@/components/ui/icon-set/shield"
import { UserCog } from "@/components/ui/icon-set/user-cog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { MemberAccountActions } from "./member-account-actions"
import { MemberPhoneAction } from "./member-phone-action"

export interface MemberListItem {
  id: string
  user: { id: string; name: string | null; email: string; phone?: string | null }
  role: { id: string; key: string; name: string } | null
  branch_id: string | null
  chain_branch_code?: string | null
  status: string
  invited_at: string
  joined_at: string | null
}

interface MemberTableProps {
  members: MemberListItem[]
  branchMap: Map<string, string>
  loading: boolean
  searchQuery: string
  canManageRole: boolean
  /** `A7` đặt lại mật khẩu, `A5` tạm khoá/mở — trần cứng Điều hành. */
  canResetPassword: boolean
  canToggleActive: boolean
  /** `F4` xoá nhân viên khỏi tiệm — trần cứng Điều hành. */
  canRemove: boolean
  currentUserId: string | null
  onChanged: () => void
  onSelectMember: (target: {
    id: string
    name: string | null
    email: string
    roleId: string | null
    roleName: string | null
    chainBranchCode: string | null
  }) => void
}

export function MemberTable({
  members,
  branchMap,
  loading,
  searchQuery,
  canManageRole,
  canResetPassword,
  canToggleActive,
  canRemove,
  currentUserId,
  onChanged,
  onSelectMember,
}: MemberTableProps) {
  if (loading) {
    return (
      <div className="p-6">
        <SkeletonBlock lines={4} label="Đang tải danh sách nhân sự" />
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="p-12 text-center">
        <Users size={36} className="mx-auto text-text-muted/60 mb-2" />
        <div className="text-body font-bold text-text">Không tìm thấy thành viên</div>
        <div className="text-caption text-text-muted mt-1">
          {searchQuery ? "Không có kết quả khớp với từ khóa tìm kiếm." : "Tiệm chưa có nhân viên nào khác."}
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border bg-surface-alt/60 text-caption font-bold text-text-muted uppercase tracking-wider">
            <th className="py-3 px-4">Nhân sự</th>
            <th className="py-3 px-4">Vai trò</th>
            <th className="py-3 px-4">Chi nhánh</th>
            <th className="py-3 px-4">Trạng thái</th>
            <th className="py-3 px-4 text-right">Tác vụ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-body-sm">
          {members.map((m) => {
            const branchName = m.branch_id ? branchMap.get(m.branch_id) || "Chi nhánh" : "Toàn cửa hàng"
            const initial = (m.user.name || m.user.email).charAt(0).toUpperCase()
            const isInvited = m.status === "INVITED"
            const isSuspended = m.status === "SUSPENDED"
            const isSelf = m.user.id === currentUserId

            return (
              <tr key={m.id} className="hover:bg-surface-alt/40 transition-colors">
                {/* Avatar & Tên/Email */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-body-sm flex-shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-text truncate">
                        {m.user.name || "Chưa cập nhật tên"}
                      </div>
                      <div className="text-caption text-text-muted truncate">{m.user.email}</div>
                    </div>
                  </div>
                </td>

                {/* Vai trò */}
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1 font-semibold text-primary">
                    <Shield size={14} />
                    <span>{m.role?.name || "Chưa phân vai"}</span>
                  </span>
                </td>

                {/* Chi nhánh */}
                <td className="py-3.5 px-4 text-text-muted text-caption">
                  <span className="inline-flex items-center gap-1">
                    <Building size={13} />
                    <span>{branchName}</span>
                  </span>
                </td>

                {/* Trạng thái */}
                <td className="py-3.5 px-4">
                  <Badge tone={isInvited || isSuspended ? "warning" : "success"}>
                    {isSuspended ? "Đang tạm khoá" : isInvited ? "Chờ kích hoạt" : "Đang hoạt động"}
                  </Badge>
                </td>

                {/* Tác vụ */}
                <td className="py-3.5 px-4 text-right">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                  {!isSelf && <MemberPhoneAction member={{ ...m.user, id: m.id }} onChanged={onChanged} />}
                  {!isSelf && (
                    <MemberAccountActions
                      member={{ id: m.id, name: m.user.name, email: m.user.email, status: m.status }}
                      canResetPassword={canResetPassword}
                      canToggleActive={canToggleActive}
                      canRemove={canRemove}
                      onChanged={onChanged}
                    />
                  )}
                  {canManageRole && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onSelectMember({
                          id: m.id,
                          name: m.user.name,
                          email: m.user.email,
                          roleId: m.role?.id || null,
                          roleName: m.role?.name || null,
                          chainBranchCode: m.chain_branch_code ?? null,
                        })
                      }
                    >
                      <UserCog size={15} />
                      <span>Phân vai</span>
                    </Button>
                  )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
