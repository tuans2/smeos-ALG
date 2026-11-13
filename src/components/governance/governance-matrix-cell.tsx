/**
 * GOVERNANCE MATRIX CELL
 * Hiển thị một ô toggle quy tắc kèm:
 * - Badge nguồn gốc thừa kế (Mother / Industry / Chain / Store)
 * - Biểu tượng Khóa cứng (Lock) & lý do
 * - Nút Reset về mặc định nếu đang có Local Override
 */
"use client"

import { useState } from "react"
import { Lock } from "@/components/ui/icon-set/lock"
import { RotateCcw } from "@/components/ui/icon-set/rotate-ccw"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import type { GovernanceMatrixItem, GovernanceViewerTier } from "./governance-matrix-types"
import { GOVERNANCE_TIER_LABELS } from "./governance-matrix-types"

interface GovernanceMatrixCellProps {
  item: GovernanceMatrixItem
  viewerTier: GovernanceViewerTier
  canManageHardLocks?: boolean | undefined
  onToggle: (enabled: boolean) => Promise<void>
  onResetOverride?: (() => Promise<void>) | undefined
  onToggleHardLock?: ((locked: boolean) => Promise<void>) | undefined
}

export function GovernanceMatrixCell({
  item,
  viewerTier,
  canManageHardLocks,
  onToggle,
  onResetOverride,
  onToggleHardLock,
}: GovernanceMatrixCellProps) {
  const [loading, setLoading] = useState(false)

  const isLockedByUpper = item.isLocked && !item.isOwnHardLock
  const isDisabled = isLockedByUpper || loading

  async function handleToggle() {
    if (isDisabled) return
    setLoading(true)
    try {
      await onToggle(!item.enabled)
    } finally {
      setLoading(false)
    }
  }

  async function handleReset() {
    if (!onResetOverride || loading) return
    setLoading(true)
    try {
      await onResetOverride()
    } finally {
      setLoading(false)
    }
  }

  async function handleLockToggle() {
    if (!onToggleHardLock || loading) return
    setLoading(true)
    try {
      await onToggleHardLock(!item.isOwnHardLock)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 justify-end">
      {/* Nguồn gốc kế thừa Badge */}
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-caption font-medium border ${
          item.isLocked
            ? "bg-danger-bg text-danger-text border-border-danger/30"
            : item.hasLocalOverride
            ? "bg-primary/10 text-primary border-primary/20"
            : "bg-surface-alt text-text-muted border-border"
        }`}
      >
        {item.isLocked && item.hardLockedBy
          ? `🔒 ${GOVERNANCE_TIER_LABELS[item.hardLockedBy]}`
          : item.hasLocalOverride
          ? "Đã tùy biến"
          : "Mặc định"}
      </span>

      {/* Nút Reset về mặc định */}
      {item.hasLocalOverride && !item.isLocked && onResetOverride && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={loading}
          title="Khôi phục về mặc định của Cấp trên"
          className="h-7 w-7 p-0 text-text-muted hover:text-text"
        >
          <RotateCcw size={14} />
        </Button>
      )}

      {/* Quản trị Hard-Lock cho tầng có quyền */}
      {canManageHardLocks && onToggleHardLock && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleLockToggle}
          disabled={loading || isLockedByUpper}
          title={
            item.isOwnHardLock
              ? "Gỡ khóa cứng cho các đơn vị trực thuộc"
              : "Khóa cứng quy tắc này (Cấp dưới không thể đổi)"
          }
          className={`h-7 w-7 p-0 ${
            item.isOwnHardLock
              ? "bg-danger/10 text-danger hover:bg-danger/20"
              : "text-text-muted hover:text-text"
          }`}
        >
          <Lock size={14} className={item.isOwnHardLock ? "fill-danger" : ""} />
        </Button>
      )}

      {/* Toggle Button */}
      <div className="relative inline-flex items-center">
        <Switch
          checked={item.enabled}
          onCheckedChange={() => void handleToggle()}
          disabled={isDisabled}
          aria-label={`${item.enabled ? "Tắt" : "Bật"} ${item.title}`}
          className="h-5 w-9"
        />
        {loading && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Loader2 size={10} className="animate-spin motion-reduce:animate-none text-primary" />
          </span>
        )}
      </div>

      {/* Khóa bởi cấp trên cảnh báo */}
      {isLockedByUpper && item.lockReason && (
        <span
          className="text-caption text-text-muted truncate max-w-[140px]"
          title={item.lockReason}
        >
          {item.lockReason}
        </span>
      )}
    </div>
  )
}
