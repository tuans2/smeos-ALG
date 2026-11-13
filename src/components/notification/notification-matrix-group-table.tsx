/**
 * NOTIFICATION MATRIX TABLE — Bảng ma trận event × channel cho 1 nhóm
 *
 * Hiển thị danh sách events theo nhóm, mỗi hàng là 1 event,
 * mỗi cột là 1 channel — ô giao nhau là toggle bật/tắt.
 */
"use client"

import { Button } from "@/components/ui/button"
import { ChevronDown } from "@/components/ui/icon-set/chevron-down"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { useState } from "react"
import { NotificationMatrixCell } from "./notification-matrix-cell"
import type {
  MatrixEventGroupSection,
  MatrixEventRow,
} from "./notification-matrix-types"
import {
  EVENT_GROUP_LABELS,
  CHANNEL_LABELS,
} from "./notification-matrix-types"
import type { NotifyChannel } from "@/modules/notification/domain/events/_contract"

interface MatrixGroupTableProps {
  section: MatrixEventGroupSection
  activeChannels: NotifyChannel[]
  canManageHardLocks: boolean
  onToggleCell: (eventKey: string, channel: NotifyChannel, enabled: boolean) => Promise<void>
  onToggleHardLock?: ((eventKey: string, channel: NotifyChannel, enabled: boolean, reason?: string) => Promise<void>) | undefined
  onRemoveHardLock?: ((eventKey: string, channel: NotifyChannel) => Promise<void>) | undefined
  /** Cho phép gấp/mở nhóm */
  defaultExpanded?: boolean | undefined
}

export function NotificationMatrixGroupTable({
  section,
  activeChannels,
  canManageHardLocks,
  onToggleCell,
  onToggleHardLock,
  onRemoveHardLock,
  defaultExpanded = true,
}: MatrixGroupTableProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const groupLabel = EVENT_GROUP_LABELS[section.groupKey] ?? section.groupKey

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Group Header — Click to expand/collapse */}
      <Button variant="ghost"
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-[length:inherit] h-auto font-[inherit] gap-0 w-full flex cursor-pointer items-center justify-between px-4 py-3 bg-surface-alt hover:bg-surface-alt/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown size={16} className="text-text-muted" />
          ) : (
            <ChevronRight size={16} className="text-text-muted" />
          )}
          <h2 className="text-body-sm font-bold text-text">{groupLabel}</h2>
          <span className="text-caption text-text-muted">
            ({section.events.length} sự kiện)
          </span>
        </div>
      </Button>

      {/* Matrix Table */}
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-caption">
            <thead>
              <tr className="border-b border-border bg-surface-alt/50">
                <th className="text-left px-4 py-2 font-semibold text-text-muted min-w-[220px]">
                  Sự kiện
                </th>
                {activeChannels.map((ch) => (
                  <th
                    key={ch}
                    className="text-center px-2 py-2 font-semibold text-text-muted min-w-[80px]"
                  >
                    {CHANNEL_LABELS[ch] ?? ch}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.events.map((evt: MatrixEventRow) => (
                <tr
                  key={evt.eventKey}
                  className="border-b border-border/50 hover:bg-surface-alt/30 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-body-sm text-text">
                        {evt.label}
                      </span>
                      <span className="text-caption text-text-muted line-clamp-1">
                        {evt.description}
                      </span>
                    </div>
                  </td>
                  {activeChannels.map((ch) => {
                    const cell = evt.channels[ch]
                    if (!cell) {
                      return (
                        <td key={ch} className="text-center px-2 py-2.5">
                          <span className="text-text-muted">—</span>
                        </td>
                      )
                    }
                    return (
                      <td key={ch} className="text-center px-2 py-2.5">
                        <NotificationMatrixCell
                          cell={cell}
                          canManageHardLocks={canManageHardLocks}
                          onToggle={(enabled) => onToggleCell(evt.eventKey, ch, enabled)}
                          onToggleHardLock={
                            onToggleHardLock
                              ? (enabled) => onToggleHardLock(evt.eventKey, ch, enabled)
                              : undefined
                          }
                          onRemoveHardLock={
                            onRemoveHardLock
                              ? () => onRemoveHardLock(evt.eventKey, ch)
                              : undefined
                          }
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
