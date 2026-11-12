import React from "react"
import Link from "next/link"
import { Building2 } from "@/components/ui/icon-set/building2"
import { Store } from "@/components/ui/icon-set/store"
import { MessageSquare } from "@/components/ui/icon-set/message-square"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { Layers } from "@/components/ui/icon-set/layers"
import { Card } from "@/components/ui/card"

export interface ChainRelation {
  partnershipId: string
  partnerCode: string
  partnershipType: string
  chainOrgId?: string
  chainName?: string
  chainSlug?: string
  chainConnectCode?: string
  partnerOrgId?: string
  partnerName?: string
  partnerSlug?: string
}

export interface Member {
  membershipId: string
  memberId: string
  role: string
  name: string
  email: string
  joinedAt: string
}

export function ChainPartnersTab({
  asPartnerOf,
  asChainOf,
}: {
  asPartnerOf: ChainRelation[]
  asChainOf: ChainRelation[]
}) {
  return (
    <div className="space-y-4">
      {asPartnerOf.length > 0 && (
        <div>
          <h3 className="text-caption font-bold text-text-muted uppercase tracking-wider mb-2">
            Cửa hàng này là Đối tác của Chuỗi
          </h3>
          <div className="space-y-2">
            {asPartnerOf.map((r) => (
              <Card
                key={r.partnershipId}
                className="p-4 flex items-center justify-between hover:border-primary/40 transition-all"
                variant="interactive"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-muted text-primary flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-body-sm font-bold text-text">{r.chainName}</div>
                    <div className="text-caption text-text-muted mt-0.5">
                      Mã chuỗi: <span className="font-mono font-semibold">{r.chainConnectCode?.toUpperCase()}</span>
                      {" · "}
                      Mã đối tác: <span className="font-mono font-semibold">{r.partnerCode}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-success-bg text-success border border-success/20">
                    {r.partnershipType}
                  </span>
                  <Link
                    href={(r.chainOrgId ? `/tin-nhan?chuoi=${r.chainOrgId}` : "/tin-nhan") as never}
                    className="p-2 rounded-lg bg-primary-muted hover:bg-primary-muted/80 text-primary transition-colors"
                    title="Nhắn tin với chuỗi"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {asChainOf.length > 0 && (
        <div>
          <h3 className="text-caption font-bold text-text-muted uppercase tracking-wider mb-2">
            Chuỗi này đang quản lý các Đối tác / Chi nhánh
          </h3>
          <div className="space-y-2">
            {asChainOf.map((r) => (
              <Card
                key={r.partnershipId}
                className="p-4 flex items-center justify-between hover:border-primary/40 transition-all"
                variant="interactive"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-muted text-primary flex items-center justify-center">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-body-sm font-bold text-text">{r.partnerName}</div>
                    <div className="text-caption text-text-muted mt-0.5">
                      Mã đối tác: <span className="font-mono font-semibold">{r.partnerCode}</span>
                      {" · "}
                      Slug: <span className="font-mono font-semibold">{r.partnerSlug}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-primary-muted text-primary border border-primary/20">
                    {r.partnershipType}
                  </span>
                  <Link
                    href={(r.partnerOrgId ? `/tin-nhan?doi-tac=${r.partnerOrgId}` : "/tin-nhan") as never}
                    className="p-2 rounded-lg bg-primary-muted hover:bg-primary-muted/80 text-primary transition-colors"
                    title="Nhắn tin với đối tác"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-3 flex justify-end">
            <Link
              href="/dieu-phoi/doi-tac"
              className="inline-flex items-center gap-1.5 text-caption text-primary hover:text-primary-dark font-semibold"
            >
              Quản lý toàn bộ đối tác chuỗi <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {asPartnerOf.length === 0 && asChainOf.length === 0 && (
        <Card className="text-center py-16 space-y-3">
          <Layers className="w-12 h-12 text-text-muted/40 mx-auto" />
          <h3 className="text-body-sm font-semibold text-text">Chưa có quan hệ chuỗi</h3>
          <p className="text-meta text-text-muted max-w-sm mx-auto">
            Chia sẻ Mã Kết Nối của bạn để tham gia chuỗi, hoặc vào{" "}
            <Link href="/dieu-phoi/doi-tac" className="text-primary font-semibold hover:underline">
              Quản lý Đối tác
            </Link>{" "}
            để thêm cửa hàng vào mạng lưới chuỗi.
          </p>
        </Card>
      )}
    </div>
  )
}
