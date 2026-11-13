"use client"

/**
 * desktop-nav-group.tsx — Render một nhóm điều hướng trong Sidebar (SRP)
 */

import { BarChart3 } from "@/components/ui/icon-set/bar-chart3"
import { LayoutGrid } from "@/components/ui/icon-set/layout-grid"
import type { NavEntry, NavGroup as NavGroupType } from "./nav-model"
import { isToolkitGroupKey } from "./nav/nav-types"
import { DesktopNavItem } from "./desktop-nav-item"
import { NavSectionHeader } from "./nav-section-header"
import { NavSubTree } from "./nav-sub-tree"
import {
  MATRIX_SUBTREE_LABEL,
  isEntryActive,
  matrixChildLabel,
  matrixSubtreeKey,
  splitMatrixEntries,
} from "./nav-group-layout"
import { NAV_ICONS as ICONS } from "./nav-icons"
import { ToolkitShortcutsGroup } from "./toolkit-shortcuts-group"
import { getAllToolkitNavEntries } from "./nav-toolkit-shortcuts"
import { InternalChatUnreadBadge } from "@/components/internal-chat/internal-chat-unread-badge"

export interface DesktopNavGroupProps {
  group: NavGroupType
  collapsed: boolean
  expanded: boolean
  /** href mục đang chọn (khớp dài nhất — xem resolveActiveHref) */
  pathname: string
  reportsOpen: boolean
  /** ID tổ chức hiện tại — dùng để lưu shortcuts per-org */
  orgId?: string | null | undefined
  /**
   * Toàn bộ NavEntry từ mọi nhóm (đã lọc qua capability) — dùng cho picker shortcuts.
   * Chỉ cần khi nhóm là ToolkitGroupKey.
   */
  allNavEntries?: NavEntry[]
  /** Trạng thái đóng/mở đã lưu của các mục con (vd: "quan-tri:ma-tran") */
  subtreeOpen?: Record<string, boolean>
  onToggleGroup: (key: string, current: boolean) => void
  onToggleReports: (next: boolean) => void
  onNavigate: (href: string) => void
}

export function DesktopNavGroup({
  group,
  collapsed,
  expanded,
  pathname,
  reportsOpen,
  orgId,
  allNavEntries,
  subtreeOpen,
  onToggleGroup,
  onToggleReports,
  onNavigate,
}: DesktopNavGroupProps) {
  const isActive = (entry: NavEntry) => isEntryActive(entry, pathname)

  // ── Nhóm Công cụ (StoreOS: "cong-cu", ChainOS: "cong-cu-chuoi", SaaS Ngành: "cong-cu-ban-hang") ───────
  if (isToolkitGroupKey(group.key)) {
    const libraryEntry =
      group.entries.find(
        (e) =>
          e.navKey === "toolkit" ||
          e.navKey === "chain-toolkit" ||
          e.navKey === "industry-toolkit" ||
          e.href === "/cong-cu"
      ) ?? group.entries[0]!

    const toolEntries = group.entries.filter(
      (e) => e.href !== libraryEntry.href && e.navKey !== libraryEntry.navKey
    )
    // Cung cấp toàn bộ danh mục công cụ (SSOT toolkit-catalog) cho picker và shortcut resolution
    const toolkitNavEntries = getAllToolkitNavEntries()
    return (
      <ToolkitShortcutsGroup
        groupKey={group.key}
        groupLabel={group.label}
        libraryEntry={libraryEntry}
        toolEntries={toolEntries}
        allNavEntries={toolkitNavEntries}
        collapsed={collapsed}
        expanded={expanded}
        pathname={pathname}
        orgId={orgId}
        onNavigate={onNavigate}
        onToggleGroup={onToggleGroup}
      />
    )
  }

  // ── Collapsed: chỉ hiện icon stack ──────────────────────────
  if (collapsed) {
    return (
      <div className="flex flex-col gap-0.5">
        {group.entries.map((entry) => (
          <DesktopNavItem
            key={entry.href}
            item={entry}
            active={isActive(entry)}
            collapsed
            iconComponent={ICONS[entry.iconKey]}
            onClick={() => onNavigate(entry.href)}
          />
        ))}
        <div className="mx-auto my-1.5 h-px w-6 bg-border" aria-hidden />
      </div>
    )
  }

  // ── Nhóm "viec-chinh" — luôn mở, có mục con Báo cáo ─────────
  if (group.key === "viec-chinh") {
    const homeEntry = group.entries.find((e) => e.href === "/")
    const reportEntries = group.entries.filter((e) => e.href !== "/")

    return (
      <div className="flex flex-col gap-px">
        <NavSectionHeader label={group.label} expanded />

        {homeEntry && (
          <DesktopNavItem
            item={homeEntry}
            active={pathname === "/"}
            iconComponent={ICONS[homeEntry.iconKey]}
            onClick={() => onNavigate("/")}
          />
        )}

        {reportEntries.length > 0 && (
          <NavSubTree
            label="Báo cáo"
            icon={BarChart3}
            entries={reportEntries}
            open={reportsOpen}
            pathname={pathname}
            extraActive={pathname === "/so-lieu"}
            onToggle={() => onToggleReports(!reportsOpen)}
            onNavigate={onNavigate}
          />
        )}
      </div>
    )
  }

  // ── Nhóm thông thường — đóng/mở được, gom mục "Ma trận …" ───
  const { primary, matrix } = splitMatrixEntries(group.entries)
  const matrixKey = matrixSubtreeKey(group.key)
  const matrixOpen =
    matrix.some((e) => isEntryActive(e, pathname)) || (subtreeOpen?.[matrixKey] ?? false)

  return (
    <div className="flex flex-col gap-px">
      <NavSectionHeader
        label={group.label}
        expanded={expanded}
        count={group.entries.length}
        onToggle={() => onToggleGroup(group.key, expanded)}
      />

      {expanded && (
        <>
          {primary.map((entry) => (
            <DesktopNavItem
              key={entry.href}
              item={entry}
              active={isActive(entry)}
              iconComponent={ICONS[entry.iconKey]}
              trailing={entry.navKey === "internal-chat" ? <InternalChatUnreadBadge /> : undefined}
              onClick={() => onNavigate(entry.href)}
            />
          ))}
          {matrix.length > 0 && (
            <NavSubTree
              label={MATRIX_SUBTREE_LABEL}
              icon={LayoutGrid}
              entries={matrix}
              open={matrixOpen}
              pathname={pathname}
              childLabel={matrixChildLabel}
              onToggle={() => onToggleGroup(matrixKey, matrixOpen)}
              onNavigate={onNavigate}
            />
          )}
        </>
      )}
    </div>
  )
}
