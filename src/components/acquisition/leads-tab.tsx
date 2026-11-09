"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import type { Route } from "next"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/select"
import { UserPlus } from "@/components/ui/icon-set/user-plus"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { formatDateTime } from "@/lib/i18n/formatters"
import {
  canTransitionLeadStatus,
  LEAD_STATUS_GROUPS,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/modules/acquisition/domain/lead-rules"
import { leadSourceLabel } from "@/modules/orders/domain/lead-queue"
import { EntryActionsSettingsPanel } from "@/components/orders/entry-actions-settings"
import { acquisitionApi, type LeadItem } from "./acquisition-api"

type GroupId = "ALL" | (typeof LEAD_STATUS_GROUPS)[number]["id"]

const FILTER_GROUPS: { id: GroupId; label: string; statuses: readonly LeadStatus[] }[] = [
  { id: "ALL", label: "Tất cả", statuses: [] },
  ...LEAD_STATUS_GROUPS,
]

function sourceLabel(lead: LeadItem): string {
  if (lead.short_link) return lead.short_link.placement_label ? `${lead.short_link.name} · ${lead.short_link.placement_label}` : lead.short_link.name
  return lead.source === "CATALOG_LINK" ? "Bộ sưu tập chung" : lead.source === "SHORT_LINK" ? "Link/QR" : leadSourceLabel(lead.source)
}

function getGroupCount(groupId: GroupId, counts: Record<string, number> | null): number {
  if (!counts) return 0
  if (groupId === "ALL") return Object.values(counts).reduce((a, b) => a + b, 0)
  const group = LEAD_STATUS_GROUPS.find((g) => g.id === groupId)
  if (!group) return 0
  return group.statuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0)
}

/** Chuỗi lọc trạng thái gửi API: trạng thái đang chọn, hoặc mọi trạng thái của nhóm. */
function statusQueryFor(selectedStatus: LeadStatus | undefined, groupId: GroupId): string | undefined {
  if (selectedStatus) return selectedStatus
  const group = FILTER_GROUPS.find((g) => g.id === groupId)
  return group && group.statuses.length > 0 ? group.statuses.join(",") : undefined
}

/** Khách để lại tên + SĐT trên trang công khai; nhân viên đổi trạng thái theo pipeline 10 bước. */
export function LeadsTab({ onCountsChange }: { onCountsChange: (counts: Record<string, number>) => void }) {
  const [selectedGroupId, setSelectedGroupId] = useState<GroupId>("NEW_GROUP")
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | undefined>(undefined)
  const [leads, setLeads] = useState<LeadItem[] | null>(null)
  const [counts, setCounts] = useState<Record<string, number> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeGroup = FILTER_GROUPS.find((g) => g.id === selectedGroupId)

  const statusQuery = statusQueryFor(selectedStatus, selectedGroupId)

  const fetchLeads = useCallback(
    () =>
      acquisitionApi
        .listLeads(statusQuery)
        .then((p) => {
          setLeads(p.items)
          setCounts(p.counts)
          setError(null)
          onCountsChange(p.counts)
        })
        .catch((e: Error) => setError(e.message)),
    [statusQuery, onCountsChange],
  )

  useEffect(() => {
    void fetchLeads()
  }, [fetchLeads])

  const load = () => {
    setError(null)
    setLeads(null)
    void fetchLeads()
  }

  const selectGroup = (gid: GroupId) => {
    setLeads(null)
    setSelectedGroupId(gid)
    setSelectedStatus(undefined)
  }

  const selectSubStatus = (s: LeadStatus | undefined) => {
    setLeads(null)
    setSelectedStatus(s)
  }

  const changeStatus = async (lead: LeadItem, nextStatus: LeadStatus) => {
    if (!canTransitionLeadStatus(lead.status, nextStatus)) {
      setError(`Không thể chuyển trạng thái từ "${LEAD_STATUS_LABELS[lead.status] ?? lead.status}" sang "${LEAD_STATUS_LABELS[nextStatus]}"`)
      return
    }
    try {
      await acquisitionApi.updateLead(lead.id, { status: nextStatus })
      void fetchLeads()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không cập nhật được trạng thái")
    }
  }

  return (
    <div className="space-y-4">
      <EntryActionsSettingsPanel />

      {/* Tầng 1 Progressive Disclosure: 4 nhóm trạng thái + Tất cả */}
      <div role="group" aria-label="Lọc theo nhóm trạng thái" className="flex flex-wrap gap-1.5">
        {FILTER_GROUPS.map((g) => {
          const count = getGroupCount(g.id, counts)
          const isSelected = selectedGroupId === g.id
          return (
            <Button
              key={g.id}
              type="button"
              variant={isSelected ? "primary" : "outline"}
              size="sm"
              aria-pressed={isSelected}
              onClick={() => selectGroup(g.id)}
              className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-caption font-medium ${
                isSelected ? "bg-primary text-white" : ""
              }`}
            >
              <span>{g.label}</span>
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0.2 text-caption ${isSelected ? "bg-white/20 text-white" : "bg-surface-alt text-text-muted"}`}>
                  {count}
                </span>
              )}
            </Button>
          )
        })}
      </div>

      {/* Tầng 2: Chip lọc chi tiết trong nhóm đã chọn (nếu có hơn 1 trạng thái) */}
      {activeGroup && activeGroup.statuses.length > 1 && (
        <div role="group" aria-label={`Chi tiết nhóm ${activeGroup.label}`} className="flex flex-wrap items-center gap-1.5 pt-1 text-caption">
          <span className="text-text-muted">Chi tiết:</span>
          <Button
            type="button"
            variant={selectedStatus === undefined ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={selectedStatus === undefined}
            onClick={() => selectSubStatus(undefined)}
            className="h-7 rounded-md px-2 py-0.5 text-caption"
          >
            Tất cả {activeGroup.label.toLowerCase()}
          </Button>
          {activeGroup.statuses.map((s) => (
            <Button
              key={s}
              type="button"
              variant={selectedStatus === s ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={selectedStatus === s}
              onClick={() => selectSubStatus(s)}
              className="h-7 rounded-md px-2 py-0.5 text-caption"
            >
              {LEAD_STATUS_LABELS[s]}
              {counts && counts[s] ? ` (${counts[s]})` : ""}
            </Button>
          ))}
        </div>
      )}

      {error && <InlineError message={error} onRetry={load} />}
      {leads === null && !error && <SkeletonBlock lines={3} label="Đang tải khách để lại thông tin" />}
      {leads?.length === 0 && (
        <EmptyState
          icon={UserPlus}
          title={selectedStatus ? `Không có khách ở trạng thái "${LEAD_STATUS_LABELS[selectedStatus]}"` : `Chưa có khách trong nhóm "${activeGroup?.label ?? "này"}"`}
          reason="Khách điền tên và số điện thoại từ các trang công khai, mã QR hoặc chiến dịch sẽ hiện ở đây."
        />
      )}

      {leads && leads.length > 0 && (
        <ul className="space-y-2">
          {leads.map((lead) => (
            <li key={lead.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-0.5">
                <div className="text-body font-semibold text-text">
                  {lead.customer_id ? <Link href={`/khach-hang?id=${lead.customer_id}` as Route} className="hover:underline">{lead.name}</Link> : lead.name}
                </div>
                <a href={`tel:${lead.phone}`} className="text-body-sm text-primary hover:underline">{lead.phone}</a>
                <p className="text-caption text-text-muted">
                  {formatDateTime(lead.created_at)} · Nguồn: {sourceLabel(lead)}
                  {lead.utm_campaign ? ` · Chiến dịch: ${lead.utm_campaign}` : ""}
                </p>
                {lead.message && <p className="text-body-sm text-text">{lead.message}</p>}
              </div>

              <label className="flex shrink-0 items-center gap-2 text-caption text-text">
                <span>Trạng thái</span>
                <NativeSelect
                  value={lead.status}
                  onChange={(e) => void changeStatus(lead, e.target.value as LeadStatus)}
                  className="h-9 px-2 text-body-sm"
                >
                  {LEAD_STATUS_GROUPS.map((group) => (
                    <optgroup key={group.id} label={group.label}>
                      {group.statuses.map((s) => (
                        <option key={s} value={s}>
                          {LEAD_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </NativeSelect>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
