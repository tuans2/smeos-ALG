/**
 * Tab của mục Đơn hàng theo vai (KIEN_TRUC_SSOT_DON_HANG_DA_NGUON.md §6). Hiện theo mã năng lực; mở mặc định
 * theo việc chính của vai: Điều hành → Phê duyệt, Điều phối → Điều phối, Sale → Khách tiềm năng.
 */

export type WorkspaceTab = "leads" | "sale" | "approve" | "coordinate" | "all"

export const WORKSPACE_TAB_LABELS: Record<WorkspaceTab, string> = {
  leads: "Khách tiềm năng",
  sale: "Sale chăm sóc",
  approve: "Phê duyệt",
  coordinate: "Điều phối",
  all: "Tất cả",
}

export function visibleWorkspaceTabs(can: (code: string) => boolean): WorkspaceTab[] {
  const tabs: WorkspaceTab[] = []
  if (can("Q1")) tabs.push("leads")
  if (can("R2")) tabs.push("sale")
  if (can("R11") || can("R16")) tabs.push("approve")
  if (can("R4") || can("R5")) tabs.push("coordinate")
  tabs.push("all")
  return tabs
}

export function defaultWorkspaceTab(can: (code: string) => boolean): WorkspaceTab {
  const tabs = visibleWorkspaceTabs(can)
  if (tabs.includes("approve")) return "approve"
  if (tabs.includes("coordinate")) return "coordinate"
  if (tabs.includes("leads")) return "leads"
  return "all"
}

export function isWorkspaceTab(value: string | null): value is WorkspaceTab {
  return value === "leads" || value === "sale" || value === "approve" || value === "coordinate" || value === "all"
}
