/**
 * Sự kiện đẩy tức thì của Trao đổi nội bộ (IC-7.1): chỉ báo "phòng X vừa có thay đổi", KHÔNG mang nội dung tin —
 * trình duyệt nhận xong tự đọc lại qua API đã kiểm quyền. Phát cho tổ chức chủ phòng và tổ chức bên kia. Pure TS.
 */
export interface ChatRoomEvent {
  conversationId: string
  /** Tổ chức chủ phòng */
  organizationId: string
  counterpartOrgId: string | null
  /** Phòng chi nhánh: nhân viên gắn chi nhánh khác bỏ qua sự kiện */
  branchId: string | null
}

export function audienceOf(event: ChatRoomEvent): string[] {
  return [event.organizationId, ...(event.counterpartOrgId && event.counterpartOrgId !== event.organizationId ? [event.counterpartOrgId] : [])]
}

/** Người nghe (theo tổ chức + chi nhánh của phiên) có cần nhận sự kiện này không. */
export function eventVisibleTo(event: ChatRoomEvent, viewer: { organizationId: string; branchId: string | null }): boolean {
  if (!audienceOf(event).includes(viewer.organizationId)) return false
  if (event.branchId && viewer.organizationId === event.organizationId && viewer.branchId && viewer.branchId !== event.branchId) return false
  return true
}

export function parseChatRoomEvent(raw: string): ChatRoomEvent | null {
  try {
    const v = JSON.parse(raw) as Partial<ChatRoomEvent>
    if (typeof v.conversationId !== "string" || typeof v.organizationId !== "string") return null
    return { conversationId: v.conversationId, organizationId: v.organizationId, counterpartOrgId: v.counterpartOrgId ?? null, branchId: v.branchId ?? null }
  } catch {
    return null
  }
}
