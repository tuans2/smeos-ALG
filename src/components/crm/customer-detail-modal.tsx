"use client"

import React, { useState, useEffect } from "react"
import { Calendar, Gift, Shield, Plus, Loader2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { CustomerMasterIndex } from "@/modules/crm/domain/customer-master-index"
import { useSession } from "@/lib/session"
import { CustomerDetailTabs, type CustomerDetailTab } from "./customer-detail-tabs"
import { CustomerOrdersTab } from "./customer-orders-tab"
import { CustomerDataRequestsPanel } from "./customer-data-requests-panel"

interface CustomerDetailModalProps {
  customerId: string | null
  onClose: () => void
  onUpdated: () => void
}

export function CustomerDetailModal({ customerId, onClose, onUpdated }: CustomerDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<CustomerMasterIndex | null>(null)
  const [activeTab, setActiveTab] = useState<CustomerDetailTab>("profile")
  const { can } = useSession()

  // Form thêm dịp kỷ niệm
  const [showAddOccasion, setShowAddOccasion] = useState(false)
  const [occName, setOccName] = useState("")
  const [occDate, setOccDate] = useState("")
  const [occRecipient, setOccRecipient] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!customerId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API khi mount/đổi tham số; setState nằm trong hàm tải (nợ #149)
    setLoading(true)
    fetch(`/api/v1/crm/customers/${customerId}`)
      .then((r) => r.json())
      .then((res) => setData(res.customer))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [customerId])

  if (!customerId) return null

  async function handleAddOccasion(e: React.FormEvent) {
    e.preventDefault()
    if (!occName.trim() || !occDate.trim()) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/v1/crm/customers/${customerId}/occasions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: occName,
          date: occDate,
          recipientName: occRecipient.trim() || undefined,
        }),
      })
      if (res.ok) {
        setShowAddOccasion(false)
        setOccName("")
        setOccDate("")
        setOccRecipient("")
        onUpdated()
        // Refresh data
        const refreshed = await fetch(`/api/v1/crm/customers/${customerId}`).then((r) => r.json())
        setData(refreshed.customer)
      }
    } finally {
      setActionLoading(false)
    }
  }

  async function handleToggleConsent(channel: string, currentVal: boolean) {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/v1/crm/customers/${customerId}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, granted: !currentVal }),
      })
      if (res.ok) {
        const refreshed = await fetch(`/api/v1/crm/customers/${customerId}`).then((r) => r.json())
        setData(refreshed.customer)
      }
    } finally {
      setActionLoading(false)
    }
  }

  const tierColors: Record<string, "danger" | "warning" | "neutral" | "success" | "accent"> = {
    VIP: "danger",
    GOLD: "warning",
    SILVER: "accent",
    BRONZE: "neutral",
    NEW: "neutral",
  }

  return (
    <Dialog
      open={Boolean(customerId)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      size="lg"
      title={
        <div className="flex items-center gap-3">
          <span className="rounded bg-primary/10 px-2.5 py-1 text-caption font-mono font-bold text-primary flex items-center min-w-14 justify-center">
            {data?.code ?? <Skeleton className="h-3 w-12" />}
          </span>
          <div>
            <div className="text-title-sm font-bold text-text">{data?.name ?? "Chi tiết khách hàng"}</div>
            <div className="text-caption text-text-muted">{data?.phone}</div>
          </div>
        </div>
      }
    >
      <div className="-mx-5 -mt-5 sm:-mx-6 sm:-mt-6">
        <CustomerDetailTabs active={activeTab} onChange={setActiveTab} occasionCount={data?.occasions?.length ?? 0} showOrders={Boolean(can("R1"))} />

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none text-primary" />
          </div>
        ) : data ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-body-sm">
            {activeTab === "profile" && (
              <>
                {/* Dịp kỷ niệm sắp tới (L1 - Nâng lên theo chuẩn 03a UX) */}
                {data.occasions && data.occasions.length > 0 && (
                  <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                      <div>
                        <div className="text-caption font-bold text-primary">Dịp kỷ niệm đã lưu</div>
                        <div className="text-caption text-text">
                          {data.occasions[0]?.name} · Ngày {data.occasions[0]?.date}
                          {data.occasions[0]?.recipientName ? ` (người nhận: ${data.occasions[0].recipientName})` : ""}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setActiveTab("occasions")} className="text-caption font-semibold">
                      Xem tất cả ({data.occasions.length})
                    </Button>
                  </div>
                )}

                {/* Thẻ RFM */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-border bg-surface-alt p-4 text-center">
                  <div>
                    <div className="text-caption text-text-muted">Phân hạng RFM</div>
                    <Badge tone={tierColors[data.metrics.tier] ?? "neutral"} className="mt-1 font-bold">
                      {data.metrics.tier === "VIP" ? "VIP" : data.metrics.tier === "GOLD" ? "Vàng" : data.metrics.tier === "SILVER" ? "Bạc" : data.metrics.tier === "BRONZE" ? "Đồng" : "Khách mới"}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-caption text-text-muted">Tổng chi tiêu</div>
                    <div className="mt-1 font-bold text-primary">
                      {Number(data.metrics.totalSpentVnd).toLocaleString("vi-VN")} đ
                    </div>
                  </div>
                  <div>
                    <div className="text-caption text-text-muted">Số đơn hàng</div>
                    <div className="mt-1 font-bold text-text">{data.metrics.orderCount} đơn</div>
                  </div>
                  <div>
                    <div className="text-caption text-text-muted">Giá trị TB (AOV)</div>
                    <div className="mt-1 font-bold text-text">
                      {Number(data.metrics.aovVnd).toLocaleString("vi-VN")} đ
                    </div>
                  </div>
                </div>

                {/* Thông tin liên hệ & Sở thích */}
                <div className="space-y-3">
                  <div className="rounded-lg border border-border p-4 space-y-2 text-caption">
                    <div className="font-bold text-text-main text-body-sm">Thông tin cá nhân & Địa chỉ</div>
                    <div className="text-text-muted">SĐT: <span className="font-semibold text-text">{data.phone}</span></div>
                    <div className="text-text-muted">Email: <span className="font-semibold text-text">{data.email || "—"}</span></div>
                    <div className="text-text-muted">Địa chỉ: <span className="font-semibold text-text">{data.address || "—"}</span></div>
                    {data.notes && <div className="text-text-muted">Ghi chú: <span className="italic text-text">{data.notes}</span></div>}
                  </div>

                  <div className="rounded-lg border border-border p-4 space-y-2 text-caption">
                    <div className="font-bold text-text-main text-body-sm">Gu thẩm mỹ & Sở thích ngành hoa</div>
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted">Hoa yêu thích:</span>
                      <span className="font-semibold text-text">{data.preferences.preferredFlowers.join(", ") || "Chưa ghi nhận"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted">Tone màu chuộng:</span>
                      <span className="font-semibold text-text">{data.preferences.preferredColors.join(", ") || "Chưa ghi nhận"}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "occasions" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-caption text-text-muted">Các ngày kỷ niệm để hệ thống nhắc gửi thiệp & hoa</span>
                  <Button size="sm" variant="outline" onClick={() => setShowAddOccasion(!showAddOccasion)}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Thêm ngày kỷ niệm
                  </Button>
                </div>

                {showAddOccasion && (
                  <form onSubmit={handleAddOccasion} className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3 text-caption">
                    <div className="font-bold text-text">Thêm ngày kỷ niệm mới</div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="text"
                        placeholder="Tên dịp (Sinh nhật vợ, Kỷ niệm...)"
                        value={occName}
                        onChange={(e) => setOccName(e.target.value)}
                        required
                        className="text-caption"
                      />
                      <Input
                        type="text"
                        placeholder="Ngày (MM-DD, vd: 10-20 hoặc 03-08)"
                        value={occDate}
                        onChange={(e) => setOccDate(e.target.value)}
                        required
                        className="text-caption"
                      />
                    </div>
                    <Input
                      type="text"
                      placeholder="Tên người nhận hoa (nếu khác khách hàng)"
                      value={occRecipient}
                      onChange={(e) => setOccRecipient(e.target.value)}
                      className="text-caption"
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowAddOccasion(false)}>Hủy</Button>
                      <Button type="submit" size="sm" disabled={actionLoading}>Lưu dịp</Button>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  {data.occasions.length === 0 ? (
                    <div className="rounded-lg border border-border p-6 text-center text-caption text-text-muted">
                      Chưa có ngày kỷ niệm nào được lưu.
                    </div>
                  ) : (
                    data.occasions.map((o) => (
                      <div key={o.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-caption">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-subtle text-primary">
                            <Gift className="h-3.5 w-3.5" />
                          </span>
                          <div>
                            <div className="font-bold text-text">{o.name}</div>
                            <div className="text-text-muted">Người nhận: {o.recipientName || data.name}</div>
                          </div>
                        </div>
                        <Badge tone="accent">Hàng năm ({o.date})</Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "orders" && customerId && <CustomerOrdersTab customerId={customerId} />}

            {activeTab === "privacy" && (
              <div className="space-y-4">
                <div className="rounded-lg bg-info-bg border border-info/30 p-3 text-caption text-info">
                  🛡️ <strong>Chính sách bảo vệ người tiêu dùng:</strong> smeOS chỉ gửi tin nhắn nhắc nhở hoặc tiếp thị qua các kênh khách hàng đã đồng ý (Consent).
                </div>

                <div className="divide-y divide-border rounded-xl border border-border">
                  {[
                    { channel: "ZALO_ZNS", label: "Zalo ZNS (Thông báo trạng thái hoa & nhắc hẹn)" },
                    { channel: "SMS", label: "Tin nhắn SMS Brandname" },
                    { channel: "PROMOTION", label: "Ưu đãi sinh nhật & Khuyến mãi theo mùa" },
                    { channel: "PHONE_CALL", label: "Cuộc gọi chăm sóc khách hàng" },
                  ].map((c) => {
                    const isGranted = data.consents.find((it) => it.channel === c.channel)?.granted ?? false
                    return (
                      <div key={c.channel} className="flex items-center justify-between p-3.5 text-caption">
                        <div>
                          <div className="font-semibold text-text">{c.label}</div>
                          <div className="text-text-muted">Kênh: {c.channel}</div>
                        </div>
                        <Button variant="ghost"
                          type="button"
                          onClick={() => !actionLoading && handleToggleConsent(c.channel, isGranted)}
                          className={`text-[length:inherit] h-auto gap-0 px-3 py-1.5 rounded-full font-bold transition-colors cursor-pointer ${
                            actionLoading ? "opacity-50 cursor-not-allowed" : ""
                          } ${
                            isGranted ? "bg-success-bg text-success hover:opacity-85 hover:bg-success-bg" : "bg-surface-alt text-text-muted hover:bg-surface-alt/80"
                          }`}
                        >
                          {isGranted ? "✓ Đã đồng ý" : "✕ Chưa cấp phép"}
                        </Button>
                      </div>
                    )
                  })}
                </div>
                <CustomerDataRequestsPanel customerId={customerId} code={data.code} onErased={() => { onUpdated(); void fetch(`/api/v1/crm/customers/${customerId}`).then((r) => r.json()).then((res) => setData(res.customer)) }} />
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-text-muted">Không tìm thấy thông tin.</div>
        )}
      </div>
    </Dialog>
  )
}
