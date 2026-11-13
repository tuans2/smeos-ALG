/**
 * NOTIFICATION MATRIX CELL — Ô toggle đơn (event × channel)
 *
 * Hiện trạng thái bật/tắt, hard lock indicator,
 * và cho phép toggle nếu không bị lock bởi tầng trên.
 */
"use client"

import { useState, useRef, useEffect } from "react"
import { Lock } from "@/components/ui/icon-set/lock"
import { Unlock } from "@/components/ui/icon-set/unlock"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import type { MatrixCellState } from "./notification-matrix-types"
import { TIER_LABELS } from "./notification-matrix-types"

interface MatrixCellProps {
  cell: MatrixCellState
  canManageHardLocks: boolean
  onToggle: (enabled: boolean) => Promise<void>
  onToggleHardLock?: ((enabled: boolean) => Promise<void>) | undefined
  onRemoveHardLock?: (() => Promise<void>) | undefined
}

export function NotificationMatrixCell({
  cell,
  canManageHardLocks,
  onToggle,
  onToggleHardLock,
  onRemoveHardLock,
}: MatrixCellProps) {
  const [toggling, setToggling] = useState(false)
  const [showLockMenu, setShowLockMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showLockMenu) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowLockMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showLockMenu])

  const isLockedByUpper = cell.hardLockedBy !== null && !cell.isOwnHardLock
  const isOwnLocked = cell.isOwnHardLock
  const isDisabled = isLockedByUpper || toggling

  async function handleToggle() {
    if (isDisabled) return
    setToggling(true)
    try {
      await onToggle(!cell.enabled)
    } finally {
      setToggling(false)
    }
  }

  async function handleToggleHardLock() {
    if (!onToggleHardLock) return
    setToggling(true)
    try {
      await onToggleHardLock(cell.enabled)
      setShowLockMenu(false)
    } finally {
      setToggling(false)
    }
  }

  async function handleRemoveHardLock() {
    if (!onRemoveHardLock) return
    setToggling(true)
    try {
      await onRemoveHardLock()
      setShowLockMenu(false)
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="relative flex items-center justify-center gap-1">
      {/* Toggle Switch */}
      <div className="relative inline-flex items-center">
        <Switch
          checked={cell.enabled}
          onCheckedChange={() => void handleToggle()}
          disabled={isDisabled}
          aria-label={`${cell.enabled ? "Tắt" : "Bật"} thông báo`}
          className="relative h-5 w-9 after:absolute after:-inset-x-[6px] after:-inset-y-[5px] [@media(pointer:coarse)]:after:-inset-[14px]"
        />
        {toggling && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Loader2 size={10} className="animate-spin motion-reduce:animate-none text-primary" />
          </span>
        )}
      </div>

      {/* Hard Lock Indicator */}
      {isLockedByUpper && cell.hardLockedBy && (
        <div
          className="flex items-center"
          title={`🔒 Khóa cứng bởi ${TIER_LABELS[cell.hardLockedBy]}${cell.hardLockReason ? `: ${cell.hardLockReason}` : ""}`}
        >
          <Lock size={11} className="text-warning-text" />
        </div>
      )}

      {/* Own Hard Lock Controls */}
      {canManageHardLocks && !isLockedByUpper && (
        <div ref={menuRef} className="relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowLockMenu(!showLockMenu)}
            className={`h-6 w-6 p-0 ${isOwnLocked ? "text-warning-text" : "text-text-muted hover:text-text"}`}
            title={isOwnLocked ? "Đã khóa cứng — bấm để quản lý" : "Đặt khóa cứng"}
          >
            {isOwnLocked ? <Lock size={11} /> : <Unlock size={11} />}
          </Button>

          {/* Lock Menu Dropdown */}
          {showLockMenu && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border border-border bg-surface shadow-lg p-1">
              {isOwnLocked ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveHardLock}
                  disabled={toggling}
                  className="w-full justify-start gap-2 text-caption font-normal"
                >
                  <Unlock size={12} />
                  <span>Gỡ khóa cứng</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleHardLock}
                  disabled={toggling}
                  className="w-full justify-start gap-2 text-caption font-normal"
                >
                  <Lock size={12} />
                  <span>Khóa cứng (giữ {cell.enabled ? "BẬT" : "TẮT"})</span>
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
