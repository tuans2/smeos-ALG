"use client"

/**
 * DesktopNav — Sidebar điều hướng chính (Desktop)
 *
 * Chức năng enterprise:
 * - Thu gọn (icon-only, 64px) / Mở rộng (256px) — lưu localStorage
 * - Header phân biệt tầng kiến trúc (SaaS Mother / Ngành / ChainOS / StoreOS)
 * - Tìm kiếm nhanh với phím tắt `/`
 * - Nhóm mục có thể đóng/mở — mặc định chỉ mở nhóm chứa trang hiện tại, lưu trạng thái theo org
 * - Nav items với tooltip khi thu gọn, active indicator
 */

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "@/lib/session"
import { isRouteLocked } from "@/lib/feature-lock"
import { cn, stripVietnamese } from "@/lib/utils"
import { buildNav, type NavEntry, type NavGroup } from "./nav-model"
import { DesktopNavHeader } from "./desktop-nav-header"
import { DesktopNavItem } from "./desktop-nav-item"
import { DesktopNavGroup } from "./desktop-nav-group"
import { DesktopNavFooter } from "./desktop-nav-footer"
import { DesktopNavSearch } from "./desktop-nav-search"
import { NavSectionHeader } from "./nav-section-header"
import { isEntryActive, isNavGroupExpanded, resolveActiveHref } from "./nav-group-layout"
import { getAllToolkitNavEntries } from "./nav-toolkit-shortcuts"
import {
  loadNavGroups,
  loadReportsOpen,
  loadNavCollapsed,
  navStorageKeys,
  persistNavGroups,
  persistNavCollapsed,
} from "./nav-storage"
import { NAV_ICONS as ICONS } from "./nav-icons"
import { SuperadminHomepageBadge } from "./superadmin-homepage-badge"

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────
interface DesktopNavProps {
  /** Hiển thị trong ngăn kéo trên điện thoại */
  drawer?: boolean
  onNavigate?: () => void
  onClose?: () => void
  /** process.env.NODE_ENV !== "production" — truyền từ Server Component */
  isDev?: boolean
}

// ────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────
export function DesktopNav({
  drawer = false,
  onNavigate,
  onClose,
  isDev = false,
}: DesktopNavProps = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const { can, roleUx, organization, organizationType } = useSession()
  const orgId = organization?.id
  const { groupsKey, reportsKey, collapseKey } = useMemo(() => navStorageKeys(orgId), [orgId])

  // ── State ──────────────────────────────────────────────────────
  const [collapsed, setCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [reportsOpen, setReportsOpen] = useState(true)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // ── Nav data ───────────────────────────────────────────────────
  const navView = useMemo(
    () =>
      buildNav(
        can,
        roleUx,
        organization?.industry,
        organization?.navHiddenKeys,
        organizationType,
        organization?.unlockedTools
      ),
    [
      can,
      roleUx,
      organization?.industry,
      organization?.navHiddenKeys,
      organizationType,
      organization?.unlockedTools,
    ]
  )

  // Toàn bộ entries đã lọc (capability + hidden) — nguồn cho picker shortcuts
  const allNavEntries = useMemo(
    () => navView.groups.flatMap((g) => g.entries),
    [navView]
  )

  // Mục đang chọn: href khớp dài nhất (kể cả lối tắt công cụ ghim từ danh mục đầy đủ)
  const activeHref = useMemo(
    () =>
      resolveActiveHref(
        [...allNavEntries, ...getAllToolkitNavEntries()].map((e) => e.href),
        pathname
      ),
    [allNavEntries, pathname]
  )

  // ── Hydrate from localStorage ──────────────────────────────────
  useEffect(() => {
    setOpenGroups(loadNavGroups(groupsKey))
    setReportsOpen(loadReportsOpen(reportsKey))
    if (!drawer) setCollapsed(loadNavCollapsed(collapseKey))
  }, [groupsKey, reportsKey, collapseKey, drawer])

  // ── Collapse toggle ─────────────────────────────────────────────
  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      persistNavCollapsed(collapseKey, next)
      if (next) setSearchQuery("") // đóng search khi thu gọn
      return next
    })
  }, [collapseKey])

  // ── Keyboard shortcut: ⌘B → toggle, `/` → search, Escape → blur ─
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(
        (e.target as HTMLElement)?.tagName
      )

      // ⌘B / Ctrl+B toggle collapse
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b" && !isInput) {
        e.preventDefault()
        toggleCollapse()
        return
      }

      if (e.key === "/" && !isInput) {
        e.preventDefault()
        if (collapsed) setCollapsed(false)
        requestAnimationFrame(() => searchInputRef.current?.focus())
      }

      if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearchQuery("")
        searchInputRef.current?.blur()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [collapsed, toggleCollapse])

  // ── Groups ─────────────────────────────────────────────────────
  function isGroupExpanded(group: NavGroup): boolean {
    // Mặc định chỉ mở nhóm chứa trang hiện tại; nhóm đã tự đóng/mở giữ theo lựa chọn
    return isNavGroupExpanded(group, activeHref, openGroups)
  }

  function toggleGroup(key: string, current: boolean) {
    const next = { ...openGroups, [key]: !current }
    setOpenGroups(next)
    persistNavGroups(groupsKey, next)
  }

  function toggleReports(next: boolean) {
    setReportsOpen(next)
    try { localStorage.setItem(reportsKey, String(next)) } catch { /* ignore */ }
  }

  // ── Search ─────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    const q = stripVietnamese(searchQuery.trim())
    if (!q) return []
    const all = navView.groups.flatMap((g) => g.entries)
    const seen = new Set<string>()
    return all.filter((e) => {
      if (seen.has(e.href)) return false
      seen.add(e.href)
      return stripVietnamese(e.label).includes(q)
    })
  }, [navView, searchQuery])

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && searchResults.length > 0) {
      const t = searchResults[0]!
      if (t.status !== "COMING_SOON" && !isRouteLocked(t.href)) {
        setSearchQuery("")
        router.push(t.href as never)
        onNavigate?.()
      }
    }
  }

  function navigateTo(href: string) {
    if (searchQuery) setSearchQuery("")
    router.push(href as never)
    onNavigate?.()
  }

  function isActive(entry: NavEntry): boolean {
    return isEntryActive(entry, activeHref)
  }

  // ── Sidebar width ──────────────────────────────────────────────
  const sidebarWidth = drawer
    ? "w-72 max-w-[85vw]"
    : collapsed
    ? "w-16"
    : "w-64"

  // ────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────
  return (
    <aside
      aria-label="Điều hướng chính"
      className={cn(
        "relative z-30 h-dvh flex-shrink-0 flex-col border-r border-border bg-surface",
        "transition-[width] duration-200 ease-in-out",
        drawer ? "flex" : "hidden md:flex",
        sidebarWidth
      )}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <DesktopNavHeader
        collapsed={collapsed && !drawer}
        onToggleCollapse={toggleCollapse}
        drawer={drawer}
        onClose={onClose}
        isDev={isDev}
      />

      {/* ── Search — ẩn khi thu gọn ────────────────────────────── */}
      {!collapsed && (
        <DesktopNavSearch
          inputRef={searchInputRef}
          value={searchQuery}
          onChange={setSearchQuery}
          onKeyDown={handleSearchKeyDown}
        />
      )}

      {/* ── Navigation Scroll Area ───────────────────────────────── */}
      <nav
        className={cn(
          "flex flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:thin]",
          collapsed ? "gap-0.5 px-3 py-3" : "px-3 pt-1 pb-4"
        )}
        aria-label="Menu điều hướng"
      >
        {/* Search results */}
        {searchQuery && !collapsed ? (
          <div className="flex flex-col gap-px">
            <NavSectionHeader label={`Kết quả (${searchResults.length})`} expanded />
            {searchResults.length === 0 ? (
              <p className="px-2.5 py-4 text-center text-meta text-text-muted">
                Không tìm thấy chức năng phù hợp
              </p>
            ) : (
              searchResults.map((entry) => (
                <DesktopNavItem
                  key={entry.href}
                  item={entry}
                  active={isActive(entry)}
                  iconComponent={ICONS[entry.iconKey]}
                  onClick={() => navigateTo(entry.href)}
                />
              ))
            )}
          </div>
        ) : (
          navView.groups.map((group) => {
            const isCollapsed = collapsed && !drawer
            const node = (
              <DesktopNavGroup
                key={group.key}
                group={group}
                collapsed={isCollapsed}
                expanded={isGroupExpanded(group)}
                pathname={activeHref}
                reportsOpen={reportsOpen}
                orgId={orgId}
                allNavEntries={allNavEntries}
                subtreeOpen={openGroups}
                onToggleGroup={(key, current) => toggleGroup(key, current)}
                onToggleReports={toggleReports}
                onNavigate={navigateTo}
              />
            )
            // Mở rộng: mỗi nhóm là một khối, ngăn bằng đường kẻ mảnh (thu gọn đã có vạch riêng)
            return isCollapsed ? (
              node
            ) : (
              <div
                key={group.key}
                className="border-t border-border py-2.5 first:border-t-0 first:pt-1.5 last:pb-0"
              >
                {node}
              </div>
            )
          })
        )}
      </nav>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <DesktopNavFooter collapsed={collapsed && !drawer} />
    </aside>
  )
}

