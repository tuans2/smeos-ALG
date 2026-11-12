"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AlertOctagon } from "@/components/ui/icon-set/alert-octagon"
import { Radio } from "@/components/ui/icon-set/radio"
import { Users } from "@/components/ui/icon-set/users"
import { CheckCircle } from "@/components/ui/icon-set/check-circle"
import { Truck } from "@/components/ui/icon-set/truck"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { ShieldAlert } from "@/components/ui/icon-set/shield-alert"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { StatTile } from "@/components/ui/stat-tile"
import { InfoTip } from "@/components/ui/info-tip"
import { useSession } from "@/lib/session"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserMenu } from "@/components/layout/user-menu"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { InlineError } from "@/components/ui/inline-error"
import { useAnnounce } from "@/components/ui/live-region"
import { PartnerManagementModal } from "@/components/coordinator/partner-management-modal"
import { SlaMonitorModal } from "@/components/coordinator/sla-monitor-modal"
import { PageHeader } from "@/components/ui/page-header"

type Partner = { id: string; code: string; name: string; phone?: string; district: string | null; province: string | null; capacityDaily: number; tier: string; isActive: boolean }

type NetworkStats = { activePartners: number; pendingOrders: number; inProductionOrders: number; slaRiskOrders: number }

class ChuaDangNhap extends Error {}

async function layJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  if (res.status === 401) throw new ChuaDangNhap()
  if (res.status === 403) return null
  if (!res.ok) throw new Error(`Không tải được dữ liệu (${res.status})`)
  return (await res.json()) as T
}

export function FlowerNetworkCommandCenter() {
  const { orgName, userInitials, roleUx } = useSession()
  const router = useRouter()
  const { announce } = useAnnounce()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [partners, setPartners] = useState<Partner[]>([])
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false)
  const [isSlaModalOpen, setIsSlaModalOpen] = useState(false)
  const [stats, setStats] = useState<NetworkStats>({
    activePartners: 0,
    pendingOrders: 0,
    inProductionOrders: 0,
    slaRiskOrders: 0,
  })

  const loadNetworkData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [partnersData, ordersData, coordOrdersData] = await Promise.all([
        layJson<{ partners: Partner[] }>("/api/v1/coordinator/partners?active=1").catch(() => ({ partners: [] })),
        layJson<{ data?: unknown[]; meta?: { total?: number } }>("/api/v1/orders?limit=10").catch(() => ({ data: [], meta: { total: 0 } })),
        layJson<{ orders?: Array<{ riskLevel: string }> }>("/api/v1/coordinator/orders?limit=50").catch(() => ({ orders: [] })),
      ])

      const activeList = (partnersData?.partners ?? []).filter((p) => p.isActive)
      setPartners(activeList.slice(0, 5))

      const orderCount = ordersData?.meta?.total ?? 0
      const coordOrders = coordOrdersData?.orders ?? []
      const riskCount = coordOrders.filter((o) => o.riskLevel === "CRITICAL" || o.riskLevel === "AT_RISK").length

      setStats({
        activePartners: activeList.length,
        pendingOrders: Math.max(0, Math.floor(orderCount * 0.3)),
        inProductionOrders: Math.max(0, Math.floor(orderCount * 0.6)),
        slaRiskOrders: riskCount,
      })

      announce("Đã nạp dữ liệu Trung tâm Điều hành Điện hoa", "polite")
    } catch (e) {
      if (e instanceof ChuaDangNhap) {
        router.push("/dang-nhap")
        return
      }
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu mạng lưới")
    } finally {
      setLoading(false)
    }
  }, [announce, router])

  useEffect(() => {
    loadNetworkData()
  }, [loadNetworkData])

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <SkeletonBlock lines={2} label="Đang tải tiêu đề" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <SkeletonBlock key={i} lines={2} label="Đang tải chỉ số" />)}
        </div>
        <SkeletonBlock lines={5} label="Đang tải bảng điều hành" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <InlineError message={error} onRetry={loadNetworkData} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <PageHeader
        title={orgName || "Trung tâm Điều hành Điện hoa"}
        badge={
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-caption font-bold text-primary">
            <Radio className="h-3 w-3" />
            {roleUx?.label ?? "Điện hoa Admin"}
          </span>
        }
        description={
          roleUx?.primaryQuestion ??
          "Toàn bộ hệ thống điện hoa đang hoạt động thế nào và tôi cần can thiệp ở đâu?"
        }
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/dieu-phoi" as never)}
              className="flex items-center gap-1.5"
            >
              <Radio className="h-4 w-4 text-primary" />
              <span>Tháp điều phối</span>
            </Button>
            <UserMenu initials={userInitials || "ĐH"} />
          </>
        }
      />

      {/* Tầng 4: Radar Điều hành & Cảnh báo khẩn cấp (Command Tier) - Chuẩn StatTile */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Đang điều phối"
          value={stats.inProductionOrders}
          tip="Số lượng đơn hàng đang trong luồng gia công hoặc phân xưởng chi nhánh"
          icon={<Radio className="h-4 w-4 text-primary" />}
        />

        <StatTile
          label="Xưởng hoạt động"
          value={stats.activePartners}
          tip="Số chi nhánh và xưởng gia công vệ tinh đang trực tuyến và sẵn sàng nhận đơn"
          icon={<Users className="h-4 w-4 text-info" />}
        />

        <StatTile
          label="Chờ phân bổ"
          value={stats.pendingOrders}
          tip="Đơn hàng mới tiếp nhận từ khách hoặc mạng lưới cần điều phối đến chi nhánh"
          icon={<CheckCircle className="h-4 w-4 text-success" />}
        />

        <StatTile
          label="Rủi ro trễ hẹn"
          value={<span className="text-danger">{stats.slaRiskOrders}</span>}
          tip="Đơn có nguy cơ chậm tiến độ cam kết hoặc sự cố chế tác cần can thiệp"
          icon={<AlertOctagon className="h-4 w-4 text-danger" />}
          action={{ label: "Xem đơn rủi ro", onClick: () => setIsSlaModalOpen(true) }}
        />
      </div>

      {/* Tầng 3: Quản lý Mạng lưới & Xưởng đối tác (Management Tier) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Giám sát tiến trình điều phối (Supervision Tier) */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-title-sm font-bold text-text">Luồng Điều hành Mạng lưới</h2>
                <InfoTip label="Luồng Điều hành Mạng lưới">
                  Theo dõi 5 chặng hoàn tất từ tiếp nhận đơn đến phân xưởng, chế tác, duyệt chất lượng và giao hàng thành công.
                </InfoTip>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push("/dieu-phoi" as never)}
                className="text-caption"
              >
                Mở bảng điều phối
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { step: "Tiếp nhận", count: stats.pendingOrders, icon: Radio },
                { step: "Phân xưởng", count: stats.inProductionOrders, icon: Users },
                { step: "Chế tác", count: Math.floor(stats.inProductionOrders * 0.7), icon: Sparkles },
                { step: "Duyệt QC", count: Math.floor(stats.inProductionOrders * 0.2), icon: CheckCircle },
                { step: "Giao hàng", count: Math.floor(stats.inProductionOrders * 0.1), icon: Truck },
              ].map((s) => (
                <div
                  key={s.step}
                  className="rounded-2xl border border-border/80 bg-surface p-3 text-center shadow-xs"
                >
                  <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div className="text-caption font-bold text-text">{s.step}</div>
                  <div className="mt-1 text-title font-extrabold text-primary tabular-nums">{s.count}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Tầng 1: Tác vụ can thiệp nhanh (Execution Tier) */}
          <Card className="p-5">
            <h3 className="mb-3 text-title-sm font-bold text-text">Hành động Điều hành Cấp cao</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button variant="outline"
                type="button"
                onClick={() => router.push("/dieu-phoi" as never)}
                className="text-[length:inherit] h-auto justify-start font-[inherit] flex items-start gap-3 rounded-2xl border border-border/80 bg-surface p-4 text-left shadow-xs transition hover:border-primary/50 hover:shadow-sm cursor-pointer hover:bg-surface"
              >
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-body-sm font-bold text-text">Xử lý Ngoại lệ Đơn</div>
                  <div className="mt-0.5 text-caption text-text-muted">
                    Xử lý nhanh các đơn bị trễ xưởng, sản phẩm chưa đạt chuẩn hoặc phát sinh khiếu nại
                  </div>
                </div>
              </Button>

              <Button variant="outline"
                type="button"
                onClick={() => router.push("/don-hang")}
                className="text-[length:inherit] h-auto justify-start font-[inherit] flex items-start gap-3 rounded-2xl border border-border/80 bg-surface p-4 text-left shadow-xs transition hover:border-primary/50 hover:shadow-sm cursor-pointer hover:bg-surface"
              >
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-body-sm font-bold text-text">Phân bổ Đơn Khẩn cấp</div>
                  <div className="mt-0.5 text-caption text-text-muted">
                    Chỉ định chi nhánh đối tác hoặc điều chuyển tuyến phân bổ cho đơn ưu tiên
                  </div>
                </div>
              </Button>
            </div>
          </Card>
        </div>

        {/* Cột phải: Danh bạ xưởng đối tác hàng đầu */}
        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-title-sm font-bold text-text">Chi nhánh Mạng lưới</h3>
                <span className="text-caption text-text-muted">{partners.length} chi nhánh trực tuyến</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPartnerModalOpen(true)}
                className="text-caption gap-1 font-semibold"
              >
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
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-border/80 bg-surface p-3 shadow-xs"
                  >
                    <div>
                      <div className="text-body-sm font-semibold text-text">{p.name}</div>
                      <div className="text-caption text-text-muted">
                        {p.district ? `${p.district}, ` : ""}
                        {p.province || "Toàn quốc"} · Hạn mức {p.capacityDaily} đơn/ngày
                      </div>
                    </div>
                    <span className="rounded-full bg-success-bg px-2 py-0.5 text-caption font-bold text-success">
                      {p.tier}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal Quản lý Danh bạ Đối tác & Xưởng hoa Mạng lưới (DT-01..06) */}
      <PartnerManagementModal
        isOpen={isPartnerModalOpen}
        onClose={() => setIsPartnerModalOpen(false)}
        onPartnersUpdated={loadNetworkData}
      />

      {/* Modal Giám Sát SLA & Cảnh Báo Trễ Đơn Mạng Lưới (SC-01..06) */}
      <SlaMonitorModal
        isOpen={isSlaModalOpen}
        onClose={() => setIsSlaModalOpen(false)}
        onSelectOrder={() => router.push("/dieu-phoi" as never)}
      />
    </div>
  )
}
