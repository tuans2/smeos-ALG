"use client"

import React, { useState } from "react"
import { Bot } from "@/components/ui/icon-set/bot"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { MessageCircle } from "@/components/ui/icon-set/message-circle"
import { Phone } from "@/components/ui/icon-set/phone"
import { Store } from "@/components/ui/icon-set/store"
import { Button } from "@/components/ui/button"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"

export const BRANCH_LIST_URL = "/api/v1/greeting-card/chain-branches"

interface BranchPartner {
  branchCode: string
  name: string
  address: string | null
  phone: string | null
  isActive: boolean
  telegramChatId: string | null
  telegramLinked: boolean
  partnerStore?: boolean
  zalo: boolean
}

/**
 * Danh sách đối tác (chi nhánh / xưởng) đang có trong hệ thống — kể cả chi nhánh không còn trong
 * file Excel (nhập Excel chỉ thêm / cập nhật, không xoá). Tạm dừng → không được mời nhận đơn.
 */
export function BranchPartnerList() {
  const { data, isLoading, mutate } = useApi<{ data: BranchPartner[] }>(BRANCH_LIST_URL)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const branches = data?.data ?? []

  const toggle = async (b: BranchPartner) => {
    setSaving(b.branchCode)
    setError(null)
    try {
      await apiSend(`${BRANCH_LIST_URL}/${encodeURIComponent(b.branchCode)}`, "PATCH", { isActive: !b.isActive }, "Không đổi được trạng thái")
      await mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đổi được trạng thái")
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-body font-extrabold text-text flex items-center gap-2">
          <Store size={18} className="text-primary" /> Đối tác đang có trong hệ thống ({branches.length})
        </h3>
        <p className="text-caption text-text-muted">
          Chỉ đối tác <strong>Hoạt động</strong> mới được sàng lọc và mời nhận đơn. Chuyển sang <strong>Tạm dừng</strong> để ngừng gửi đơn cho đối tác đó.
        </p>
      </div>

      {error && <div className="p-3 rounded-xl bg-danger-bg border border-danger/30 text-danger text-caption">{error}</div>}

      {isLoading ? (
        <div className="p-4 flex items-center gap-2 text-caption text-text-muted">
          <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> Đang tải danh sách…
        </div>
      ) : branches.length === 0 ? (
        <div className="p-4 text-center text-caption text-text-muted rounded-xl border border-dashed border-border">
          Chưa có đối tác nào. Nhập file Excel ở trên để thêm.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {branches.map((b) => (
            <div
              key={b.branchCode}
              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                b.isActive ? "border-border bg-surface" : "border-border bg-surface-alt opacity-70"
              }`}
            >
              <div className="min-w-0">
                <div className="text-body-sm font-bold text-text">
                  {b.name} <span className="font-mono text-caption text-text-muted">[{b.branchCode}]</span>
                  {b.partnerStore && (
                    <span className="ml-2 text-caption font-semibold px-2 py-0.5 rounded-full bg-primary-muted text-primary">Cửa hàng đối tác</span>
                  )}
                </div>
                {b.address && <div className="text-caption text-text-muted truncate">{b.address}</div>}
                <div className="flex flex-wrap items-center gap-3 mt-1 text-caption">
                  {b.phone && (
                    <span className="text-text-muted inline-flex items-center gap-1">
                      <Phone size={11} /> {b.phone}
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 ${b.telegramLinked ? "text-success" : "text-warning-text"}`}>
                    <Bot size={11} />
                    {b.telegramLinked ? "Telegram đã liên kết" : b.telegramChatId ? "Telegram chưa liên kết" : "Chưa có Telegram"}
                  </span>
                  {b.zalo && (
                    <span className="text-text-muted inline-flex items-center gap-1">
                      <MessageCircle size={11} /> Zalo
                    </span>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                role="switch"
                aria-checked={b.isActive}
                disabled={saving === b.branchCode}
                onClick={() => toggle(b)}
                className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-caption font-bold border disabled:opacity-50 ${
                  b.isActive ? "bg-success-bg text-success border-success-border hover:bg-success-bg/80" : "bg-surface text-text-muted border-border hover:bg-surface-alt"
                }`}
              >
                {saving === b.branchCode ? <Loader2 size={12} className="animate-spin motion-reduce:animate-none" /> : null}
                {b.isActive ? "Hoạt động" : "Tạm dừng"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
