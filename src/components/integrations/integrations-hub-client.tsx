"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plug } from "@/components/ui/icon-set/plug"
import { PageHeader } from "@/components/ui/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { InlineError } from "@/components/ui/inline-error"
import { EmptyState } from "@/components/ui/empty-state"
import { FeatureGuidanceCard } from "@/components/ui/feature-guidance-card"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { CATEGORY_ORDER, type ConnectorCategory } from "@/modules/integration-hub/domain/connector-manifest"
import type { CatalogItem, IntegrationHubView } from "@/modules/integration-hub/use-cases/get-integration-hub"
import type { ConnectionView } from "@/modules/integration-hub/domain/integration-views"
import { ConnectorCard } from "./connector-card"
import { ConnectDialog } from "./connect-dialog"
import { ConnectionDetailDialog } from "./connection-detail-dialog"
import { ManagedPanelDialog } from "./managed-panel"
import { ChainGovernanceSection } from "./chain-governance-section"
import { integrationApi } from "./integration-api"
import { CATEGORY_LABEL, STATUS_LABEL } from "./integration-labels"

/**
 * Trung tâm Tích hợp (archetype B — danh sách + chi tiết). L0: tổng quan và kết nối đang có;
 * L1: danh mục theo nhóm; L2: hộp kết nối; L3: chi tiết kết nối. Lỗi và "cần xử lý" luôn hiện.
 */
export function IntegrationsHubClient() {
  const [hub, setHub] = useState<IntegrationHubView | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [category, setCategory] = useState<ConnectorCategory | "ALL">("ALL")
  const [connecting, setConnecting] = useState<CatalogItem | null>(null)
  const [selected, setSelected] = useState<ConnectionView | null>(null)
  const [managing, setManaging] = useState<CatalogItem | null>(null)
  const [deepLinkHandled, setDeepLinkHandled] = useState(false)
  const [confirm, confirmDialog] = useConfirmDialog()

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      setHub(await integrationApi.hub())
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Không tải được danh sách tích hợp")
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API khi mount; setState nằm trong hàm tải (nợ #149)
    void load()
  }, [load])

  // Liên kết sâu `/tich-hop?connector=<khoá>` (vd. từ trang cũ đã chuyển hướng) mở thẳng dịch vụ đó.
  useEffect(() => {
    if (!hub || deepLinkHandled) return
    const key = new URLSearchParams(window.location.search).get("connector")
    const item = key ? hub.catalog.find((c) => c.key === key) : undefined
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mở hộp theo tham số URL một lần sau khi tải xong
    setDeepLinkHandled(true)
    if (item?.panel) setManaging(item)
    else if (item?.canConnect) setConnecting(item)
  }, [hub, deepLinkHandled])

  const labelOf = useMemo(() => new Map((hub?.catalog ?? []).map((c) => [c.key, c.label])), [hub])
  const categories = CATEGORY_ORDER.filter((c) => hub?.catalog.some((item) => item.category === c))
  const visible = (hub?.catalog ?? []).filter((item) => category === "ALL" || item.category === category)

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <PageHeader
        title="Tích hợp"
        description="Kết nối cửa hàng với kênh bán hàng, mạng xã hội, thanh toán và các dịch vụ bên ngoài tại một nơi."
      />
      <FeatureGuidanceCard
        badgeLabel="HƯỚNG DẪN"
        title="Chọn dịch vụ, kết nối, rồi theo dõi tại đây"
        description="Mỗi kết nối hiện trạng thái hoạt động và dữ liệu nhận về. Khi kết nối hết hạn hoặc lỗi, bạn sẽ nhận thông báo."
        tips={["Facebook, Zalo, SePay, Telegram và tin báo khách đã quản lý được ngay tại đây — bấm Quản lý hoặc Thiết lập trên thẻ dịch vụ."]}
        guidanceId="integrations-hub"
      />

      {loadError && <InlineError message={loadError} onRetry={() => void load()} />}

      {hub && (
        <section aria-label="Tổng quan" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <OverviewTile label="Đang hoạt động" value={hub.overview.active} />
          <OverviewTile label="Cần xử lý" value={hub.overview.needsAttention} alert={hub.overview.needsAttention > 0} />
          <OverviewTile label="Dữ liệu lỗi 24 giờ qua" value={hub.overview.failedEvents24h} alert={hub.overview.failedEvents24h > 0} />
        </section>
      )}

      {hub && (hub.connections.length > 0 || hub.managedConnected.length > 0 || hub.inherited.length > 0) && (
        <section aria-label="Kết nối của bạn" className="space-y-3">
          <h2 className="text-title font-bold text-text">Kết nối của bạn</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {hub.catalog
              .filter((item) => hub.managedConnected.includes(item.key))
              .map((item) => (
                <li key={item.key} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold text-text">{item.label}</p>
                    <p className="text-body-sm text-text-muted">{CATEGORY_LABEL[item.category]}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <ManagedStatus log={hub.managedLogs.find((l) => l.connectorKey === item.key)} />
                    {hub.managedLogs.some((l) => l.connectorKey === item.key) && (
                      <Button variant="ghost" size="sm" onClick={() => setSelected(hub.managedLogs.find((l) => l.connectorKey === item.key) ?? null)}>
                        Nhật ký
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setManaging(item)}>
                      Quản lý
                    </Button>
                  </div>
                </li>
              ))}
            {hub.inherited.map((item) => (
              <li key={`inherited-${item.connectorKey}`} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-text">{item.displayName}</p>
                  <p className="text-body-sm text-text-muted">{labelOf.get(item.connectorKey) ?? "Dịch vụ ngoài"}</p>
                </div>
                <Badge tone="neutral">Dùng kết nối của chuỗi</Badge>
              </li>
            ))}
            {hub.connections.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-text">{c.displayName}</p>
                  <p className="text-body-sm text-text-muted">{labelOf.get(c.connectorKey) ?? "Dịch vụ ngoài"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={STATUS_LABEL[c.status].tone}>{STATUS_LABEL[c.status].text}</Badge>
                  <Button variant="outline" size="sm" onClick={() => setSelected(c)}>
                    Xem chi tiết
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hub && (
        <section aria-label="Danh mục tích hợp" className="space-y-3">
          <h2 className="text-title font-bold text-text">Danh mục tích hợp</h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo nhóm">
            {(["ALL", ...categories] as const).map((c) => (
              <Button
                key={c}
                size="xs"
                variant={category === c ? "primary" : "outline"}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {c === "ALL" ? "Tất cả" : CATEGORY_LABEL[c]}
              </Button>
            ))}
          </div>
          {visible.length === 0 ? (
            <EmptyState icon={Plug} title="Chưa có dịch vụ nào trong nhóm này" />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((item) => (
                <ConnectorCard key={item.key} item={item} onConnect={setConnecting} onManage={setManaging} />
              ))}
            </div>
          )}
        </section>
      )}

      {hub && <ChainGovernanceSection />}

      <ConnectDialog
        item={connecting}
        onClose={() => setConnecting(null)}
        onConnected={() => {
          setConnecting(null)
          void load()
        }}
        askConfirm={confirm}
      />
      <ConnectionDetailDialog
        key={selected?.id ?? "none"}
        connection={selected}
        connectorLabel={selected ? (labelOf.get(selected.connectorKey) ?? "Dịch vụ ngoài") : ""}
        isSalesChannel={hub?.catalog.some((c) => c.key === selected?.connectorKey && c.category === "SALES_CHANNEL") ?? false}
        onClose={() => setSelected(null)}
        onChanged={() => void load()}
        askConfirm={confirm}
      />
      <ManagedPanelDialog
        item={managing}
        onClose={() => {
          setManaging(null)
          void load()
        }}
      />
      {confirmDialog}
    </div>
  )
}

/** Tích hợp sẵn có: "Đang bật" khi chưa có nhật ký; có nhật ký thì hiện trạng thái theo tin gần nhất. */
function ManagedStatus({ log }: { log: ConnectionView | undefined }) {
  const status = log ? STATUS_LABEL[log.status] : { text: "Đang bật", tone: "success" as const }
  return <Badge tone={status.tone}>{status.text}</Badge>
}

function OverviewTile({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-body-sm text-text-muted">{label}</p>
      <p className={alert ? "text-display font-bold text-danger-text" : "text-display font-bold text-text"}>{value}</p>
    </div>
  )
}
