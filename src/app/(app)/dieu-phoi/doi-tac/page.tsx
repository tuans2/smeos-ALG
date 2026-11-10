"use client"

import React, { useState } from "react"
import { Users } from "@/components/ui/icon-set/users"
import { Plus } from "@/components/ui/icon-set/plus"
import { Search } from "@/components/ui/icon-set/search"
import { Store } from "@/components/ui/icon-set/store"
import { Phone } from "@/components/ui/icon-set/phone"
import { Mail } from "@/components/ui/icon-set/mail"
import { MapPin } from "@/components/ui/icon-set/map-pin"
import { MessageSquare } from "@/components/ui/icon-set/message-square"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import type { ChainPartnershipEntity } from "@/modules/chain-partnership/domain/partnership-entities"
import Link from "next/link"
import { PartnerToolMatrixModal } from "@/components/organization/partner-tool-matrix-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { ListLayout } from "@/components/layout/page-layout"
import { EmptyState } from "@/components/ui/empty-state"
import { Card } from "@/components/ui/card"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { ChainPartnerCreateModal } from "./chain-partner-create-modal"
import { PartnerCredentialDialog, type PartnerCredential } from "@/components/organization/partner-credential-dialog"
import { useChainPartners } from "@/components/organization/use-chain-partners"
import { PARTNERSHIP_STATUS_LABELS } from "@/modules/chain-partnership/domain/partnership-lifecycle"
import type { PartnershipStatus } from "@/modules/chain-partnership/domain/partnership-entities"

export default function ChainPartnersPage() {
  const { partners, setPartners, loading, refresh: fetchPartners } = useChainPartners()
  const [selectedToolPartner, setSelectedToolPartner] = useState<ChainPartnershipEntity | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [credential, setCredential] = useState<PartnerCredential | null>(null)

  const filtered = partners.filter(
    (p) =>
      (p.partnerOrgName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.partnerCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.contactName || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <ListLayout
      header={
        <PageHeader
          title="Chi nhánh & Đối tác"
          tip="Quản lý mạng lưới chi nhánh, xưởng gia công vệ tinh và liên kết trò chuyện trực tiếp trên nền tảng."
          badge={
            <span className="text-caption bg-primary-muted text-primary font-semibold px-2.5 py-0.5 rounded-full border border-primary/20">
              Mô hình chuỗi
            </span>
          }
          actions={
            <Button
              type="button"
              onClick={() => setShowModal(true)}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Thêm đối tác
            </Button>
          }
        />
      }
      filters={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <Input
              type="text"
              placeholder="Tìm theo tên chi nhánh, mã đối tác, người liên hệ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl"
              inputSize="sm"
            />
          </div>
          <div className="text-body-sm text-text-muted font-medium">
            Tổng số: <span className="font-bold text-text tabular-nums">{partners.length}</span> chi nhánh
          </div>
        </div>
      }
    >
      {/* Partner Cards Grid */}
      {loading ? (
        <div className="p-6 rounded-2xl border border-border bg-surface">
          <SkeletonBlock lines={4} label="Đang tải danh bạ chi nhánh chuỗi..." />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          kind={searchQuery ? "filtered" : "none"}
          title={searchQuery ? "Không tìm thấy chi nhánh phù hợp" : "Chưa có chi nhánh nào"}
          reason={
            searchQuery
              ? "Thử thay đổi từ khoá tìm kiếm tên, mã đối tác hoặc người liên hệ."
              : "Bắt đầu thêm đối tác hoặc cấp tài khoản chi nhánh thành viên trong chuỗi."
          }
          action={
            !searchQuery
              ? {
                  label: "Thêm đối tác",
                  onClick: () => setShowModal(true),
                }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Card
              key={p.id}
              className="p-5 hover:border-primary/40 transition-all space-y-4 rounded-2xl shadow-xs"
              variant="interactive"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-muted text-primary flex items-center justify-center font-bold text-body-sm">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-body font-bold text-text leading-tight">
                      {p.partnerOrgName || "Chi nhánh thành viên"}
                    </h3>
                    <span className="text-caption text-text-muted font-mono mt-0.5 inline-block">
                      Mã: {p.partnerCode}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-caption font-semibold px-2.5 py-0.5 rounded-full ${
                    p.status === "ACTIVE"
                      ? "bg-success-bg text-success border border-success/20"
                      : "bg-surface-alt text-text-muted"
                  }`}
                >
                  {PARTNERSHIP_STATUS_LABELS[p.status as PartnershipStatus] ?? "Tạm ngưng"}
                </span>
              </div>

              <div className="text-body-sm space-y-1.5 text-text border-t border-b border-border/80 py-3">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-text-muted" />
                  <span>Đại diện: {p.contactName || "Chưa cập nhật"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-text-muted" />
                  <span>{p.contactPhone || "Chưa có SĐT"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-text-muted" />
                  <span className="truncate">{p.contactEmail || "Chưa có Email"}</span>
                </div>
                {p.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-text-muted" />
                    <span className="truncate">{p.address} ({p.province})</span>
                  </div>
                )}
                {p.partnerOrgSlug && (
                  <div className="flex items-center justify-between pt-1 border-t border-border/80 mt-1">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-success" />
                      <span className="text-caption text-text-muted">Mã kết nối:</span>
                      <span className="font-mono font-bold text-text text-caption">
                        {p.partnerOrgSlug.toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedToolPartner(p)}
                  className="flex-1 rounded-xl text-caption"
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  <span>Phân quyền</span>
                </Button>
                <Link
                  href={`/tin-nhan?doi-tac=${p.partnerOrgId}` as never}
                  className="p-2 bg-primary-muted hover:bg-primary-muted/80 text-primary rounded-xl text-caption font-semibold flex items-center justify-center transition-colors"
                  title="Nhắn tin nội bộ"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/dieu-phoi"
                  className="px-3 py-2 border border-border hover:bg-surface-alt text-text rounded-xl text-caption font-medium transition-colors"
                >
                  Bắn đơn
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Phân quyền Công cụ Chi nhánh */}
      {selectedToolPartner && (
        <PartnerToolMatrixModal
          partnerId={selectedToolPartner.id}
          partnerName={selectedToolPartner.partnerOrgName || "Cửa hàng đối tác"}
          partnerCode={selectedToolPartner.partnerCode}
          initialUnlockedTools={selectedToolPartner.unlockedTools}
          onClose={() => setSelectedToolPartner(null)}
          onSuccess={(updatedTools) => {
            setPartners((prev) =>
              prev.map((item) =>
                item.id === selectedToolPartner.id
                  ? { ...item, unlockedTools: updatedTools }
                  : item
              )
            )
          }}
        />
      )}

      {/* Modal Thêm Đối tác */}
      <ChainPartnerCreateModal
        showModal={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={(c) => {
          if (c) setCredential(c)
          fetchPartners()
        }}
      />

      <PartnerCredentialDialog credential={credential} onClose={() => setCredential(null)} />
    </ListLayout>
  )
}
