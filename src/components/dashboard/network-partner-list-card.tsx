"use client"

import { useState } from "react"
import { Users } from "@/components/ui/icon-set/users"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PartnerStatementModal } from "@/components/coordinator/partner-statement-modal"

export type NetworkPartner = { id: string; code: string; name: string; phone?: string; district: string | null; province: string | null; capacityDaily: number; tier: string; isActive: boolean }

/** Danh bạ xưởng đối tác trên Trung tâm mạng lưới; mỗi đối tác mở được bảng kê tiền công thật (audit BL-22). */
export function NetworkPartnerListCard({ partners, onManage }: { partners: NetworkPartner[]; onManage: () => void }) {
  const [statementOf, setStatementOf] = useState<NetworkPartner | null>(null)
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-title-sm font-bold text-text">Chi nhánh Mạng lưới</h3>
          <span className="text-caption text-text-muted">{partners.length} chi nhánh trực tuyến</span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onManage} className="text-caption gap-1 font-semibold">
          <Users className="h-3.5 w-3.5 text-primary" />
          <span>Quản lý</span>
        </Button>
      </div>

      {partners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-caption text-text-muted">
          Chưa có chi nhánh hoặc xưởng đối tác nào trong mạng lưới
        </div>
      ) : (
        <div className="space-y-3">
          {partners.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-border/80 bg-surface p-3 shadow-xs">
              <div>
                <div className="text-body-sm font-semibold text-text">{p.name}</div>
                <div className="text-caption text-text-muted">
                  {p.district ? `${p.district}, ` : ""}
                  {p.province || "Toàn quốc"} · Hạn mức {p.capacityDaily} đơn/ngày
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-success-bg px-2 py-0.5 text-caption font-bold text-success">{p.tier}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setStatementOf(p)} className="text-caption">
                  Bảng kê
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <PartnerStatementModal partner={statementOf} onClose={() => setStatementOf(null)} />
    </Card>
  )
}
