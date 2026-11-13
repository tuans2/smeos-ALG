/**
 * Thư viện tập trung — Kho dữ liệu v2 (Screen Contract
 * `docs/dac-ta/screen-contracts/kho-du-lieu.md` §4–§5, PO duyệt 29/10/2026).
 *
 * Thuần: không import hạ tầng.
 */
export const LIBRARY_TYPES = ["original", "ai_image", "video", "audio", "content", "catalog", "greeting_catalog", "landing"] as const
export type LibraryType = (typeof LIBRARY_TYPES)[number]

/** Mã quyền ĐỌC của công cụ gốc — thư viện không mở rộng quyền so với màn gốc. */
export const LIBRARY_CAPABILITY: Readonly<Record<LibraryType, string>> = {
  original: "G1",
  ai_image: "G1",
  video: "I1",
  audio: "I1",
  content: "I1",
  catalog: "J1",
  greeting_catalog: "L1",
  landing: "J1",
}

/** Nơi mở lại mục trong công cụ đã tạo ra nó. */
export const LIBRARY_OPEN_HREF: Readonly<Record<LibraryType, string>> = {
  original: "/tai-anh",
  ai_image: "/creative-studio",
  video: "/video",
  audio: "/creative-studio",
  content: "/noi-dung",
  catalog: "/catalog",
  greeting_catalog: "/the-chao",
  landing: "/landing-page",
}

/**
 * Mở đúng mục khi công cụ gốc nhận tham số chọn mục (Creative Studio: `assetId`,
 * `videoJobId`, `voiceId`); công cụ chưa nhận thì mở trang công cụ.
 */
export function libraryOpenHref(type: LibraryType, id: string, subtype: string | null): string {
  const q = encodeURIComponent(id)
  if (type === "ai_image") return `/creative-studio?area=d&assetId=${q}`
  if (type === "video") return `/creative-studio?area=e&videoJobId=${q}`
  if (type === "audio" && subtype === "VOICE") return `/creative-studio?area=c&voiceId=${q}`
  if (type === "audio") return "/creative-studio?area=c"
  return LIBRARY_OPEN_HREF[type]
}

export const AI_IMAGE_KINDS = ["ENHANCED", "MASTER", "MARKETING", "CATALOG", "LANDING", "SOCIAL", "RATIO"] as const

export const LIBRARY_PAGE_SIZE = 50

export function isLibraryType(value: string): value is LibraryType {
  return (LIBRARY_TYPES as readonly string[]).includes(value)
}

export function visibleLibraryTypes(capabilities: ReadonlySet<string>): LibraryType[] {
  return LIBRARY_TYPES.filter((type) => capabilities.has(LIBRARY_CAPABILITY[type]))
}

/** `all` = toàn chuỗi; `hq` = trụ sở; còn lại là id chi nhánh. */
export type LibraryScope = "all" | "hq" | { branchId: string }

/**
 * Bộ lọc người tạo theo phạm vi. `branchOfUser`: user → chi nhánh (null = toàn
 * tổ chức/trụ sở). Người tạo không có trong bản đồ (job hệ thống, khoá lạ) và
 * mục không có người tạo tính là trụ sở.
 *
 * Nhân viên chi nhánh (`viewerBranchId` khác null, Screen Contract §14 L-3):
 * luôn chỉ thấy chi nhánh mình + trụ sở, bỏ qua phạm vi gửi lên.
 */
export type CreatorFilter =
  | { kind: "none" }
  | { kind: "only"; userIds: string[] }
  | { kind: "exclude"; userIds: string[]; includeUnknown: true }

export function creatorFilterForScope(
  scope: LibraryScope,
  branchOfUser: ReadonlyMap<string, string | null>,
  viewerBranchId: string | null
): CreatorFilter {
  const usersOf = (match: (branch: string | null) => boolean) =>
    [...branchOfUser].filter(([, branch]) => match(branch)).map(([user]) => user)

  if (viewerBranchId) {
    return { kind: "exclude", userIds: usersOf((b) => b !== null && b !== viewerBranchId), includeUnknown: true }
  }
  if (scope === "all") return { kind: "none" }
  if (scope === "hq") return { kind: "exclude", userIds: usersOf((b) => b !== null), includeUnknown: true }
  return { kind: "only", userIds: usersOf((b) => b === scope.branchId) }
}

export function parseLibraryScope(raw: string | null): LibraryScope {
  if (!raw || raw === "all") return "all"
  if (raw === "hq") return "hq"
  return { branchId: raw }
}
