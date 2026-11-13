import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import { Folder } from "@/components/ui/icon-set/folder"
import { Layers } from "@/components/ui/icon-set/layers"
import { Plus } from "@/components/ui/icon-set/plus"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import type { LucideIcon } from "@/components/ui/icon-set/wrap"
import { Clapperboard } from "@/components/ui/icon-set/clapperboard"
import { FileText } from "@/components/ui/icon-set/file-text"
import { Globe } from "@/components/ui/icon-set/globe"
import { Images } from "@/components/ui/icon-set/images"
import { LayoutGrid } from "@/components/ui/icon-set/layout-grid"
import { Music } from "@/components/ui/icon-set/music"
import { Sparkles } from "@/components/ui/icon-set/sparkles"

import type { TabAction, TabItem, TabOverflowAction } from "@/components/ui/tab-header"
import { LIBRARY_OPEN_HREF as OPEN_HREF, type LibraryType } from "@/modules/storage/domain/library"
import type { TrashItemType } from "@/modules/storage/domain/trash-types"
import { LIBRARY_CREATE_LABEL, LIBRARY_TAB_LABEL } from "./library/library-labels"
import { isHrefOpen } from "@/lib/feature-lock"

/** Tab v1 + tab thư viện v2 (`lib:<type>`), Screen Contract `kho-du-lieu.md` §4. */
export type LibraryTabId = `lib:${LibraryType}`
export type StorageTab = "raw" | "approved" | "finalized" | "trash" | LibraryTabId

/** Thứ tự tab thư viện mới (ảnh gốc giữ tab v1). */
const LIBRARY_TAB_ORDER: LibraryType[] = ["ai_image", "video", "audio", "content", "catalog", "greeting_catalog", "landing"]
const LIBRARY_ICON: Record<LibraryType, LucideIcon> = {
  original: Folder,
  ai_image: Sparkles,
  video: Clapperboard,
  audio: Music,
  content: FileText,
  catalog: LayoutGrid,
  greeting_catalog: Images,
  landing: Globe,
}

export function libraryTypeOf(tab: StorageTab): LibraryType | null {
  return tab.startsWith("lib:") ? (tab.slice(4) as LibraryType) : null
}

export function buildStorageTabs(input: {
  counts: { raw: number; approved: number; finalized: number; trash: number }
  isExecutive: boolean
  libraryTypes: readonly LibraryType[]
  libraryCounts: Partial<Record<LibraryType, number>>
}): TabItem[] {
  const { counts } = input
  const library = LIBRARY_TAB_ORDER.filter((t) => input.libraryTypes.includes(t))
  return [
    { id: "raw", label: "Ảnh gốc", icon: Folder, badge: counts.raw, badgeTone: "neutral" },
    { id: "approved", label: "Ảnh đã duyệt", icon: Layers, badge: counts.approved, badgeTone: "accent" },
    ...library.map((t) => ({
      id: `lib:${t}`,
      label: LIBRARY_TAB_LABEL[t],
      icon: LIBRARY_ICON[t],
      ...(input.libraryCounts[t] !== undefined ? { badge: input.libraryCounts[t], badgeTone: "neutral" as const } : {}),
    })),
    { id: "finalized", label: "Kịch bản tư vấn", icon: CheckCircle2, badge: counts.finalized, badgeTone: "success" },
    ...(input.isExecutive
      ? [{ id: "trash", label: "Thùng rác (30 ngày)", icon: Trash2, badge: counts.trash, badgeTone: "danger" as const }]
      : []),
  ]
}

type Handlers = {
  go: (href: string) => void
  refreshRaw: () => void
  refreshApproved: () => void
  refreshLibrary: () => void
}

export function buildPrimaryActions(tab: StorageTab, h: Handlers): TabAction[] {
  const lib = libraryTypeOf(tab)
  if (lib) return [{ id: "create", label: LIBRARY_CREATE_LABEL[lib], icon: Plus, variant: "primary", onClick: () => h.go(OPEN_HREF[lib]) }]
  if (tab === "raw") return [{ id: "upload-new", label: "Tải ảnh mới", icon: Plus, variant: "primary", onClick: () => h.go("/tai-anh") }]
  if (tab === "approved") return [{ id: "refresh-approved", label: "Làm mới", icon: RefreshCw, variant: "outline", onClick: h.refreshApproved }]
  return [{ id: "create-pitch", label: "Tạo thẻ chào mới", icon: Plus, variant: "primary", onClick: () => h.go("/tai-anh?tab=m01c") }]
}

export function buildOverflowActions(tab: StorageTab, h: Handlers): TabOverflowAction[] {
  const lib = libraryTypeOf(tab)
  if (lib) {
    // Công cụ đích đang khoá "Sắp ra mắt" (production) thì không đưa nút mở (audit N-05)
    return [
      { id: "refresh-library", label: "Làm mới", icon: RefreshCw, onClick: h.refreshLibrary },
      ...(isHrefOpen(OPEN_HREF[lib])
        ? [{ id: "open-tool", label: `Mở ${LIBRARY_TAB_LABEL[lib].toLowerCase()} trong công cụ`, icon: ExternalLink, onClick: () => h.go(OPEN_HREF[lib]) }]
        : []),
    ]
  }
  if (tab === "raw") {
    return [
      { id: "refresh-raw", label: "Làm mới danh sách ảnh", icon: RefreshCw, onClick: h.refreshRaw },
      { id: "goto-tai-anh", label: "Chuyển tới trang Tải ảnh", icon: ExternalLink, onClick: () => h.go("/tai-anh") },
    ]
  }
  if (tab === "approved" && isHrefOpen("/duyet")) return [{ id: "go-approval-queue", label: "Đi tới Hàng chờ duyệt", icon: ExternalLink, onClick: () => h.go("/duyet") }]
  return [{ id: "refresh-finalized", label: "Tải lại danh sách", icon: RefreshCw, onClick: h.refreshApproved }]
}

/** Loại thùng rác của một mục thư viện; `null` = không vào thùng rác từ đây (âm thanh có nút xoá riêng). */
export function trashTypeForLibrary(type: LibraryType): TrashItemType | null {
  const map: Record<LibraryType, TrashItemType | null> = {
    original: "RAW_ASSET",
    ai_image: "RAW_ASSET",
    video: "VIDEO",
    audio: null,
    content: "CONTENT",
    catalog: "CATALOG",
    greeting_catalog: "GREETING_CATALOG",
    landing: "LANDING",
  }
  return map[type]
}
