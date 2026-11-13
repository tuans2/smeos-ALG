"use client"

/**
 * toolkit-shortcuts-group.tsx — Nhóm "01 · CÔNG CỤ" trong Sidebar (StoreOS)
 *
 * Thiết kế 3 lớp:
 *  1. Mục cố định "Thư viện 51 công cụ" → /cong-cu
 *  2. Danh sách Shortcuts (tối đa 5, user tự pin, lưu localStorage per org)
 *  3. Nút "+ Thêm" mở mini-picker chọn công cụ muốn pin
 *
 * SRP: File này chỉ phụ trách render nhóm Công cụ. Storage ở nav-toolkit-shortcuts.ts.
 */

import { Button } from "@/components/ui/button"
import { useState, useEffect, useCallback, useRef, useMemo, useSyncExternalStore } from "react"
import { Plus } from "@/components/ui/icon-set/plus"
import { X } from "@/components/ui/icon-set/x"
import { Pin } from "@/components/ui/icon-set/pin"
import { RotateCcw } from "@/components/ui/icon-set/rotate-ccw"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"
import { NAV_ICONS as ICONS } from "./nav-icons"
import { DesktopNavItem } from "./desktop-nav-item"
import { NavSectionHeader } from "./nav-section-header"
import { isEntryActive } from "./nav-group-layout"
import type { NavEntry } from "./nav-model"
import {
  getEffectiveShortcutKeys,
  pinShortcut,
  unpinShortcut,
  resetShortcuts,
  hasCustomShortcuts,
  MAX_SHORTCUTS,
} from "./nav-toolkit-shortcuts"
import { ToolkitPicker } from "./toolkit-picker"

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export interface ToolkitShortcutsGroupProps {
  /** Key của nhóm trong nav (vd: "cong-cu", "cong-cu-chuoi", "cong-cu-ban-hang") */
  groupKey?: string
  /** Nhãn hiển thị của nhóm (vd: "01 · CÔNG CỤ", "02 · CÔNG CỤ", "CÔNG CỤ BÁN HÀNG") */
  groupLabel?: string
  /** Toàn bộ NavEntry thuộc nhóm công cụ (không gồm mục Thư viện) */
  toolEntries: NavEntry[]
  /**
   * Toàn bộ NavEntry từ MỌI nhóm trong nav (đã lọc qua capability).
   * Dùng làm nguồn cho picker và resolve shortcut href.
   * Không bao gồm mục Thư viện (/cong-cu).
   */
  allNavEntries: NavEntry[]
  /** Mục "Thư viện 51 công cụ" cố định */
  libraryEntry: NavEntry
  collapsed: boolean
  expanded: boolean
  pathname: string
  orgId?: string | null | undefined
  onNavigate: (href: string) => void
  onToggleGroup: (key: string, current: boolean) => void
}

// ────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────

const noopSubscribe = () => () => {}

export function ToolkitShortcutsGroup({
  groupKey = "cong-cu",
  groupLabel = "01 · CÔNG CỤ",
  toolEntries,
  allNavEntries,
  libraryEntry,
  collapsed,
  expanded,
  pathname,
  orgId,
  onNavigate,
  onToggleGroup,
}: ToolkitShortcutsGroupProps) {
  const { dict } = useI18n()
  const displayLibraryEntry = useMemo(() => ({
    ...libraryEntry,
    label: dict.layout.toolkitShortcuts.libraryLabel || libraryEntry.label,
  }), [libraryEntry, dict.layout.toolkitShortcuts.libraryLabel])
  // Gợi ý default keys từ chính nhóm công cụ hiện tại nếu chưa custom
  const tierDefaultKeys = useMemo(
    () => toolEntries.map((e) => e.navKey).slice(0, MAX_SHORTCUTS),
    [toolEntries]
  )

  // Server và lần hydrate đầu dùng tierDefaultKeys (HTML khớp 100%); sau khi chạy trên client mới
  // đọc localStorage. useSyncExternalStore thay cho setState trong effect (luật react-hooks).
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)
  const [pinned, setPinned] = useState<{ orgId: typeof orgId; keys: string[] } | null>(null)
  const shortcutKeys = useMemo(
    () =>
      pinned && pinned.orgId === orgId
        ? pinned.keys
        : mounted
          ? getEffectiveShortcutKeys(orgId, tierDefaultKeys)
          : tierDefaultKeys,
    [pinned, orgId, mounted, tierDefaultKeys]
  )
  const setShortcutKeys = useCallback((keys: string[]) => setPinned({ orgId, keys }), [orgId])
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Đóng picker khi click ngoài
  useEffect(() => {
    if (!pickerOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [pickerOpen])

  const handlePin = useCallback(
    (navKey: string) => {
      const next = pinShortcut(orgId, navKey)
      setShortcutKeys([...next])
    },
    [orgId, setShortcutKeys]
  )

  const handleUnpin = useCallback(
    (navKey: string) => {
      const next = unpinShortcut(orgId, navKey)
      setShortcutKeys([...next])
    },
    [orgId, setShortcutKeys]
  )

  const handleReset = useCallback(() => {
    resetShortcuts(orgId)
    setShortcutKeys([...tierDefaultKeys])
    setPickerOpen(false)
  }, [orgId, tierDefaultKeys, setShortcutKeys])

  // Shortcut entries hiển thị theo thứ tự đã pin.
  // Lookup trong allNavEntries để resolve shortcuts từ toàn bộ 51 công cụ.
  const shortcutEntries: NavEntry[] = useMemo(() => {
    return shortcutKeys
      .map((key) => allNavEntries.find((e) => e.navKey === key))
      .filter((e): e is NavEntry => e !== undefined)
  }, [shortcutKeys, allNavEntries])

  // Lấy danh sách keys hợp lệ đang tồn tại trong allNavEntries
  const validPinnedKeys = useMemo(
    () => shortcutEntries.map((e) => e.navKey),
    [shortcutEntries]
  )

  // Entries khả dụng cho picker: toàn bộ allNavEntries, trừ Thư viện và đã pin (loại trừ trùng lặp navKey)
  const unpinnedEntries = useMemo(() => {
    const seenNavKeys = new Set<string>()
    return allNavEntries.filter((e) => {
      if (
        e.href === libraryEntry.href ||
        e.navKey === libraryEntry.navKey ||
        validPinnedKeys.includes(e.navKey)
      ) {
        return false
      }
      if (seenNavKeys.has(e.navKey)) {
        return false
      }
      seenNavKeys.add(e.navKey)
      return true
    })
  }, [allNavEntries, libraryEntry, validPinnedKeys])

  const isActive = (entry: NavEntry) => isEntryActive(entry, pathname)

  // ── Collapsed mode: chỉ icon ─────────────────────────────────
  if (collapsed) {
    return (
      <div className="flex flex-col gap-0.5">
        {/* Thư viện */}
        <DesktopNavItem
          item={displayLibraryEntry}
          active={isActive(displayLibraryEntry)}
          collapsed
          iconComponent={ICONS[displayLibraryEntry.iconKey]}
          onClick={() => onNavigate(displayLibraryEntry.href)}
        />
        {/* Shortcuts */}
        {shortcutEntries.map((entry) => (
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

  // ── Expanded mode ─────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-px">
      <NavSectionHeader
        label={groupLabel}
        expanded={expanded}
        count={shortcutEntries.length + 1}
        onToggle={() => onToggleGroup(groupKey, expanded)}
      />

      {expanded && (
        <>
          {/* 1. Thư viện cố định */}
          <DesktopNavItem
            item={displayLibraryEntry}
            active={isActive(displayLibraryEntry)}
            iconComponent={ICONS[displayLibraryEntry.iconKey]}
            onClick={() => onNavigate(displayLibraryEntry.href)}
          />

          {/* 2. Nhãn lối tắt */}
          {shortcutEntries.length > 0 && (
            <div className="flex h-6 items-center gap-1.5 px-2.5 pt-1 text-caption font-medium text-text-muted">
              <Pin size={11} aria-hidden />
              <span>Lối tắt đã ghim</span>
            </div>
          )}

          {/* 3. Shortcut entries */}
          {shortcutEntries.map((entry) => (
            <div key={entry.href} className="group/shortcut relative flex items-center">
              <DesktopNavItem
                item={entry}
                active={isActive(entry)}
                iconComponent={ICONS[entry.iconKey]}
                onClick={() => onNavigate(entry.href)}
              />
              {/* Nút bỏ pin — hiện khi hover */}
              <Button variant="ghost"
                type="button"
                aria-label={`Bỏ ghim "${entry.label}"`}
                onClick={(e) => {
                  e.stopPropagation()
                  handleUnpin(entry.navKey)
                }}
                className={cn("font-[inherit] gap-0", 
                  "absolute right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-md bg-surface hover:bg-surface",
                  "text-text-muted transition-opacity duration-150 hover:bg-danger-bg hover:text-danger",
                  "opacity-0 group-hover/shortcut:opacity-100 focus-visible:opacity-100"
                )}
              >
                <X size={11} />
              </Button>
            </div>
          ))}

          {/* 4. Nút thêm shortcut */}
          {shortcutEntries.length < MAX_SHORTCUTS && (
            <div className="relative" ref={pickerRef}>
              <Button variant="ghost"
                type="button"
                id="btn-add-toolkit-shortcut"
                aria-label="Thêm lối tắt công cụ"
                aria-expanded={pickerOpen}
                onClick={() => setPickerOpen((v) => !v)}
                className={cn("justify-start font-[inherit]", 
                  "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-body-sm pointer-coarse:h-11",
                  "text-text-muted transition-colors duration-150 hover:bg-surface-alt hover:text-text",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset",
                  pickerOpen && "bg-surface-alt text-text hover:bg-surface-alt"
                )}
              >
                <span className="flex size-4.5 shrink-0 items-center justify-center rounded-md border border-dashed border-border">
                  <Plus size={12} strokeWidth={2.5} aria-hidden />
                </span>
                <span className="flex-1">Thêm lối tắt</span>
                <span className="text-caption tabular-nums text-text-muted">
                  {shortcutEntries.length}/{MAX_SHORTCUTS}
                </span>
              </Button>

              {/* Picker dropdown */}
              {pickerOpen && (
                <ToolkitPicker
                  entries={unpinnedEntries}
                  pinnedKeys={validPinnedKeys}
                  isCustomized={hasCustomShortcuts(orgId)}
                  onPin={handlePin}
                  onReset={handleReset}
                  onClose={() => setPickerOpen(false)}
                />
              )}
            </div>
          )}

          {/* Khi đã đủ MAX: chỉ hiện nút reset nếu đã tùy chỉnh */}
          {mounted && shortcutEntries.length >= MAX_SHORTCUTS && hasCustomShortcuts(orgId) && (
            <Button variant="ghost"
              type="button"
              onClick={handleReset}
              className="py-0 font-[inherit] flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-meta text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
            >
              <RotateCcw size={11} aria-hidden />
              <span>Đặt lại mặc định</span>
            </Button>
          )}
        </>
      )}
    </div>
  )
}
