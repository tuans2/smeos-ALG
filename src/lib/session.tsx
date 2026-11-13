"use client"

// Ngữ cảnh phiên phía client — theo docs/dac-ta/04-frontend-architecture.md mục 5:
// "Đây là việc ẩn hiện giao diện, không phải phép kiểm quyền. Máy chủ kiểm lại ở
// mọi endpoint." Danh sách năng lực ở đây là DỮ LIỆU MẪU; bản thật đọc từ
// GET /auth/me và không bao giờ tự suy quyền từ vai ở phía client.

import { createContext, useContext, useMemo } from "react"
import type { MockSession } from "@/lib/mock-data"
import { resolveRoleUx, type RoleUxDefinition } from "@/modules/organization/domain/role-ux-catalog"

type SessionContextValue = MockSession & {
  can: (code: string) => boolean
  /**
   * Khuôn trải nghiệm của vai hiện tại (đặc tả 03b) — chỉ quyết định thứ tự và
   * trang chủ, KHÔNG mở quyền. `null` = vai chưa gắn khuôn (giữ hành vi cũ).
   */
  roleUx: RoleUxDefinition | null
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({
  session,
  children,
}: {
  session: MockSession
  children: React.ReactNode
}) {
  const value = useMemo<SessionContextValue>(
    () => ({
      ...session,
      can: (code: string) => session.capabilities.includes(code),
      roleUx: resolveRoleUx(session.roleKey, session.organizationType),
    }),
    [session]
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

const DEFAULT_FALLBACK_SESSION: SessionContextValue = {
  userName: "Quản trị Nền tảng",
  userInitials: "AD",
  orgName: "Vận hành Nền tảng",
  workspaceKind: "PRODUCTION",
  capabilities: [],
  can: () => true,
  roleUx: null,
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) return DEFAULT_FALLBACK_SESSION
  return ctx
}
