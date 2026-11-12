"use client"

import { useI18n } from "@/lib/i18n"
import React, { useEffect, useState, useCallback } from "react"
import { Building2 } from "@/components/ui/icon-set/building2"
import { Store } from "@/components/ui/icon-set/store"
import { Users } from "@/components/ui/icon-set/users"
import { Copy } from "@/components/ui/icon-set/copy"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Link2 } from "@/components/ui/icon-set/link2"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { QrCode } from "@/components/ui/icon-set/qr-code"
import { MessageSquare } from "@/components/ui/icon-set/message-square"
import { Layers } from "@/components/ui/icon-set/layers"
import { Hash } from "@/components/ui/icon-set/hash"
import { BadgeCheck } from "@/components/ui/icon-set/badge-check"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PageContainer } from "@/components/ui/page-container"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { ChainPartnersTab, type ChainRelation, type Member } from "./chain-partners-tab"

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgIdentity {
  id: string
  shortId: string
  slug: string
  name: string
  displayName: string
  type: string
  phone: string | null
  email: string | null
  address: string | null
  createdAt: string
  connectCode: string
}

interface IdentityData {
  organization: OrgIdentity
  chainRelations: {
    asPartnerOf: ChainRelation[]
    asChainOf: ChainRelation[]
  }
  members: Member[]
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [value])

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={handleCopy}
      title={`Sao chép ${label ?? value}`}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface-muted hover:bg-surface-elevated text-text-muted text-caption font-medium h-auto"
    >
      {copied ? (
        <>
          <CheckCircle2 className="w-3 h-3 text-success" />
          <span className="text-success font-semibold">Đã sao chép!</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>Sao chép</span>
        </>
      )}
    </Button>
  )
}

// ─── Badge loại tổ chức ───────────────────────────────────────────────────────

function OrgTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    CHAIN: { label: "Chuỗi", cls: "bg-primary-subtle text-primary border-primary/20" },
    STORE: { label: "Cửa hàng", cls: "bg-primary-subtle text-primary border-primary/20" },
    PLATFORM: { label: "SaaS Platform", cls: "bg-surface-muted text-text border-border" },
    SINGLE: { label: "Tiệm độc lập", cls: "bg-warning-subtle text-warning-text border-warning/20" },
  }
  const { label, cls } = map[type] ?? { label: type, cls: "bg-surface-muted text-text-muted border-border" }
  return (
    <span className={`text-caption font-semibold px-2.5 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KetNoiPage() {
  const { t } = useI18n()
  const [data, setData] = useState<IdentityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"identity" | "chain" | "members">("identity")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadData = useCallback(() => {
    setLoading(true)
    setErrorMsg(null)
    fetch("/api/v1/noi-bo/identity", {
      credentials: "same-origin",
      headers: { "Accept": "application/json" },
    })
      .then(async (r) => {
        const res = await r.json().catch(() => null)
        if (!r.ok || !res?.data) {
          throw new Error(r.status === 403 ? "Tài khoản của bạn chưa được xem thông tin thành viên của tổ chức." : (res?.error?.message ?? res?.error ?? `Lỗi HTTP ${r.status}`))
        }
        setData(res.data)
      })
      .catch((err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : "Không thể kết nối máy chủ")
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => loadData())
  }, [loadData])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-meta text-text-muted">
        Đang tải thông tin định danh...
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col h-64 items-center justify-center space-y-3">
        <p className="text-body-sm text-danger font-medium">
          {errorMsg ? `Lỗi: ${errorMsg}` : "Không thể tải thông tin. Vui lòng thử lại."}
        </p>
        <Button onClick={loadData} size="sm">
          Thử lại
        </Button>
      </div>
    )
  }

  const { organization: org, chainRelations, members } = data
  const isChain = org.type === "CHAIN" || chainRelations.asChainOf.length > 0
  const isPartner = chainRelations.asPartnerOf.length > 0

  return (
    <PageContainer className="max-w-4xl space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-primary" />
            Profile Kết Nối Nội Bộ
          </span>
        }
        description="Mã định danh được dùng để kết nối và xác nhận danh tính trong hệ thống smeOS"
        actions={
          <Link
            href="/tin-nhan"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary-hover text-primary-fg text-caption font-semibold rounded-xl transition-colors shadow-xs"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Mở Chat nội bộ
          </Link>
        }
      />

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div className="flex border-b border-border">
        {(
          [
            { key: "identity", label: "Mã định danh", icon: Hash },
            { key: "chain", label: `Chuỗi & Đối tác (${chainRelations.asPartnerOf.length + chainRelations.asChainOf.length})`, icon: Layers },
            { key: "members", label: `Thành viên (${members.length})`, icon: Users },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-caption font-semibold border-b-2 rounded-none transition-all h-auto ${
              activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Button>
        ))}
      </div>

      {/* ── Tab: Mã định danh ──────────────────────────────────── */}
      {activeTab === "identity" && (
        <div className="space-y-4">
          {/* Card tổ chức */}
          <Card className="overflow-hidden">
            <div className="bg-primary p-5 text-primary-fg">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-primary-fg font-black text-title">
                  {isChain ? <Building2 className="w-7 h-7" /> : <Store className="w-7 h-7" />}
                </div>
                <div>
                  <h2 className="text-title-sm font-bold leading-tight">{org.displayName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <OrgTypeBadge type={org.type} />
                    {isPartner && (
                      <span className="text-caption bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold">
                        Đối tác chuỗi
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Mã kết nối chính */}
              <div className="p-4 bg-primary-subtle rounded-xl border border-primary/20">
                <div className="text-caption font-semibold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" />
                  Mã Kết Nối Nội Bộ
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-mono text-display font-black text-text tracking-wider">
                      {org.connectCode.toUpperCase()}
                    </div>
                    <div className="text-caption text-text-muted mt-1">
                      Dùng để chuỗi mời bạn vào mạng lưới đối tác hoặc để xác nhận danh tính
                    </div>
                  </div>
                  <CopyButton value={org.connectCode} label="mã kết nối" />
                </div>
              </div>

              {/* ID kỹ thuật (rút gọn) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface-muted rounded-xl border border-border">
                  <div className="text-caption font-semibold text-text-muted uppercase tracking-wider mb-1">
                    ID Tổ Chức (Rút Gọn)
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-body-sm font-bold text-text">{org.shortId}</span>
                    <CopyButton value={org.shortId} label="ID ngắn" />
                  </div>
                </div>

                <div className="p-3 bg-surface-muted rounded-xl border border-border">
                  <div className="text-caption font-semibold text-text-muted uppercase tracking-wider mb-1">
                    UUID Đầy Đủ
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-caption text-text-muted truncate max-w-[120px]">{org.id}</span>
                    <CopyButton value={org.id} label="UUID" />
                  </div>
                </div>
              </div>

              {/* Thông tin liên hệ */}
              {(org.phone || org.email || org.address) && (
                <div className="space-y-1.5 text-meta text-text-muted pt-1 border-t border-border">
                  {org.phone && <div><span className="font-semibold text-text">SĐT:</span> {org.phone}</div>}
                  {org.email && <div><span className="font-semibold text-text">Email:</span> {org.email}</div>}
                  {org.address && <div><span className="font-semibold text-text">Địa chỉ:</span> {org.address}</div>}
                </div>
              )}

              {/* Ghi chú bảo mật */}
              <div className="flex items-start gap-2 p-3 bg-success-subtle rounded-xl border border-success/20 text-caption text-success">
                <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span>
                  Mã kết nối là <strong>slug định danh công khai</strong> — an toàn để chia sẻ với đối tác. UUID nội bộ
                  chỉ dùng trong hệ thống kỹ thuật.
                </span>
              </div>
            </div>
          </Card>

          {/* Hướng dẫn kết nối */}
          <Card className="p-5 space-y-3">
            <h3 className="text-body-sm font-bold text-text flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary" />
              Cách Kết Nối Với Chuỗi
            </h3>
            <ol className="space-y-2 text-meta text-text-muted">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary-subtle text-primary flex items-center justify-center font-bold text-caption shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Chia sẻ <strong>Mã Kết Nối</strong> (<code className="bg-surface-muted px-1 rounded text-text">{org.connectCode}</code>) với Admin của chuỗi muốn tham gia.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary-subtle text-primary flex items-center justify-center font-bold text-caption shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Admin chuỗi vào <strong>Quản lý Đối tác → Mời tiệm đã có tài khoản</strong> và nhập mã kết nối của bạn.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary-subtle text-primary flex items-center justify-center font-bold text-caption shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Sau xác nhận, kênh Chat nội bộ giữa bạn và chuỗi sẽ tự động mở — không cần Zalo, Telegram.
                </span>
              </li>
            </ol>
          </Card>
        </div>
      )}

      {/* ── Tab: Chuỗi & Đối tác ──────────────────────────────── */}
      {activeTab === "chain" && (
        <ChainPartnersTab
          asPartnerOf={chainRelations.asPartnerOf}
          asChainOf={chainRelations.asChainOf}
        />
      )}

      {/* ── Tab: Thành viên ────────────────────────────────────── */}
      {activeTab === "members" && (
        <div className="space-y-2">
          {members.length === 0 ? (
            <Card className="text-center py-16 text-text-muted text-body-sm">
              Chưa có thành viên nào
            </Card>
          ) : (
            members.map((m) => (
              <Card
                key={m.membershipId}
                className="p-4 flex items-center justify-between hover:border-primary/20 transition-all"
                variant="interactive"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-subtle text-primary flex items-center justify-center font-bold text-body-sm">
                    {(m.name || m.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-meta font-bold text-text">{m.name}</div>
                    <div className="text-caption text-text-muted">{m.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-caption text-text-muted font-semibold uppercase tracking-wider">
                      Mã thành viên
                    </div>
                    <div className="font-mono text-meta font-bold text-text">{m.memberId}</div>
                  </div>
                  <CopyButton value={m.memberId} label="mã thành viên" />
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </PageContainer>
  )
}
