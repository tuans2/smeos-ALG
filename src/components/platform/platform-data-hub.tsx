"use client"

/**
 * Platform Data Hub — Dữ liệu chi tiết toàn nền tảng (Platform Admin)
 *
 * Level 0: Grid các ô Tổ chức
 * Level 1: Chọn Domain dữ liệu (Sản phẩm / Đơn hàng / Thành viên...)
 * Level 2: Bảng bản ghi thực tế (100/trang) + Tải CSV
 */

import { Input } from "@/components/ui/input"; import { Button, TEXT_BUTTON_HIT_AREA } from "@/components/ui/button"
import React, { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { Globe } from "@/components/ui/icon-set/globe"
import { Building2 } from "@/components/ui/icon-set/building2"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { Search } from "@/components/ui/icon-set/search"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { ArrowLeft } from "@/components/ui/icon-set/arrow-left"
import { Users } from "@/components/ui/icon-set/users"
import { Package } from "@/components/ui/icon-set/package"
import { ShoppingCart } from "@/components/ui/icon-set/shopping-cart"
import { Cpu } from "@/components/ui/icon-set/cpu"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { BarChart3 } from "@/components/ui/icon-set/bar-chart3"
import { Layers } from "@/components/ui/icon-set/layers"
import { UserCircle } from "@/components/ui/icon-set/user-circle"
import { Database } from "@/components/ui/icon-set/database"
import { FileDown } from "@/components/ui/icon-set/file-down"
import { FileSpreadsheet } from "@/components/ui/icon-set/file-spreadsheet"
import type { PlatformOrgDataSummary } from "@/modules/platform/use-cases/get-platform-orgs-data"
import type { RecordDomain } from "@/modules/platform/use-cases/get-platform-org-records"
import { useI18n } from "@/lib/i18n"
import { PlatformRecordsViewer } from "./platform-records-viewer"
import { PageHeader } from "@/components/ui/page-header"

// ─── Domain Definitions ───────────────────────────────────────────────────

interface DomainEntry {
  key: RecordDomain
  label: string
  description: string
  icon: React.ElementType
  color: string
  countKey: keyof PlatformOrgDataSummary
}

const DOMAINS: DomainEntry[] = [
  {
    key: "catalog",
    label: "Sản phẩm / Dịch vụ",
    description: "Toàn bộ sản phẩm trong catalog — tên, giá, danh mục, trạng thái",
    icon: Package,
    color: "text-tone-emerald",
    countKey: "productCount",
  },
  {
    key: "orders",
    label: "Đơn hàng",
    description: "Lịch sử đơn hàng — khách hàng, tổng tiền, trạng thái giao hàng",
    icon: ShoppingCart,
    color: "text-tone-blue",
    countKey: "orderCount",
  },
  {
    key: "members",
    label: "Thành viên",
    description: "Danh sách nhân sự đang hoạt động trong tổ chức",
    icon: Users,
    color: "text-tone-indigo",
    countKey: "memberCount",
  },
  {
    key: "branches",
    label: "Chi nhánh",
    description: "Các cơ sở / địa điểm kinh doanh với tồn kho",
    icon: Building2,
    color: "text-tone-amber",
    countKey: "branchCount",
  },
  {
    key: "customers",
    label: "Khách hàng",
    description: "Danh bạ khách hàng — liên hệ, lịch sử, ghi chú",
    icon: UserCircle,
    color: "text-tone-rose",
    countKey: "memberCount", // fallback
  },
  {
    key: "jobs",
    label: "AI Jobs",
    description: "Lịch sử các lần sử dụng AI (ảnh, nội dung, phân tích)",
    icon: Cpu,
    color: "text-primary",
    countKey: "generationJobCount",
  },
  {
    key: "spreadsheets",
    label: "File Excel đã tải lên",
    description: "Kho lưu trữ các file Excel (.xlsx, .xls, .csv) do cửa hàng tải lên kèm chứng chỉ quét mã độc",
    icon: FileSpreadsheet,
    color: "text-tone-teal",
    countKey: "spreadsheetCount",
  },
]

// ─── Org Card ─────────────────────────────────────────────────────────────

function OrgCard({
  org,
  onOpen,
}: {
  readonly org: PlatformOrgDataSummary
  readonly onOpen: (org: PlatformOrgDataSummary) => void
}) {
  const readinessColor =
    org.readinessScore >= 80
      ? "text-success"
      : org.readinessScore >= 50
      ? "text-warning-text"
      : "text-danger"

  const typeLabel: Record<string, string> = {
    TRIAL: "Dùng thử",
    STORE: "Cửa hàng", SINGLE: "Cửa hàng",
    CHAIN: "Chuỗi",
    ENTERPRISE: "Doanh nghiệp",
  }

  const totalRecords =
    org.productCount + org.orderCount + org.memberCount + org.generationJobCount

  return (
    <Button variant="outline"
      type="button"
      onClick={() => onOpen(org)}
      className="text-[length:inherit] h-auto flex-col items-stretch justify-start font-[inherit] gap-0 group text-left w-full rounded-2xl border border-border bg-surface hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 p-4 space-y-3 focus:outline-primary hover:bg-surface"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 size={20} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-body-sm text-text truncate group-hover:text-primary transition-colors">
              {org.name}
            </p>
            <p className="text-caption text-text-muted font-mono truncate">/{org.slug}</p>
          </div>
        </div>
        <span className="shrink-0 text-caption font-bold px-2 py-0.5 rounded-full bg-surface-alt border border-border text-text-muted">
          {typeLabel[org.type] ?? org.type}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 text-caption">
        <div className="flex items-center gap-1.5 text-text-muted">
          <Package size={11} className="text-primary shrink-0" />
          <span>{org.productCount.toLocaleString("vi-VN")} sản phẩm</span>
        </div>
        <div className="flex items-center gap-1.5 text-text-muted">
          <ShoppingCart size={11} className="text-primary shrink-0" />
          <span>{org.orderCount.toLocaleString("vi-VN")} đơn hàng</span>
        </div>
        <div className="flex items-center gap-1.5 text-text-muted">
          <Users size={11} className="text-primary shrink-0" />
          <span>{org.memberCount} thành viên</span>
        </div>
        <div className="flex items-center gap-1.5 text-text-muted">
          <Cpu size={11} className="text-primary shrink-0" />
          <span>{org.generationJobCount.toLocaleString("vi-VN")} AI jobs</span>
        </div>
      </div>

      {/* Total records hint */}
      <div className="flex items-center gap-1.5 text-caption text-text-muted bg-surface-alt rounded-lg px-2.5 py-1.5">
        <Database size={11} />
        <span>
          Khoảng {totalRecords.toLocaleString("vi-VN")} bản ghi có thể xem &amp; tải về
        </span>
        <FileDown size={11} className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Readiness bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-caption">
          <span className="text-text-muted font-medium">Hoàn thiện hồ sơ</span>
          <span className={`font-bold ${readinessColor}`}>{org.readinessScore}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-alt overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              org.readinessScore >= 80
                ? "bg-success"
                : org.readinessScore >= 50
                ? "bg-warning"
                : "bg-danger"
            }`}
            style={{ width: `${org.readinessScore}%` }}
          />
        </div>
      </div>

      {/* Profile status */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t border-border/60 text-caption">
        <span className={`flex items-center gap-1 ${org.hasBusinessProfile ? "text-success" : "text-text-muted"}`}>
          {org.hasBusinessProfile ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
          Hồ sơ pháp lý
        </span>
        <span className={`flex items-center gap-1 ${org.hasBrandProfile ? "text-success" : "text-text-muted"}`}>
          {org.hasBrandProfile ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
          Thương hiệu
        </span>
        <span className="ml-auto text-text-muted">{org.industryKey ?? "Chưa phân ngành"}</span>
      </div>
    </Button>
  )
}

// ─── Domain Picker (Level 1) ──────────────────────────────────────────────

function DomainPicker({
  org,
  onSelect,
}: {
  readonly org: PlatformOrgDataSummary
  readonly onSelect: (domain: RecordDomain) => void
}) {
  return (
    <div className="space-y-4">
      {/* Org summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Package, label: "Sản phẩm", value: org.productCount, color: "text-tone-emerald" },
          { icon: ShoppingCart, label: "Đơn hàng", value: org.orderCount, color: "text-tone-blue" },
          { icon: Users, label: "Thành viên", value: org.memberCount, color: "text-tone-indigo" },
          { icon: BarChart3, label: "Credit", value: org.creditBalance.toLocaleString("vi-VN"), color: "text-primary" },
        ].map((s) => (
          <Card key={s.label} className="p-3 flex items-center gap-2.5">
            <s.icon size={18} className={`${s.color} shrink-0`} />
            <div>
              <p className="text-caption text-text-muted">{s.label}</p>
              <p className="font-bold text-body-sm">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick full download banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-primary/20 bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Database size={20} className="text-primary" />
          </div>
          <div>
            <p className="font-bold text-body-sm text-text">
              Tải trọn bộ dữ liệu &amp; hình ảnh của {org.name}
            </p>
            <p className="text-caption text-text-muted">
              Bao gồm toàn bộ 6 file CSV (Sản phẩm, Đơn hàng, Thành viên...) và tất cả ảnh sản phẩm trong file ZIP
            </p>
          </div>
        </div>

        <a
          href={`/api/v1/platform/orgs-data/${org.id}/export?type=full`}
          download={`${org.name.replace(/\s+/g, "_")}_full.zip`}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl text-caption font-bold bg-primary hover:bg-primary-dark text-white transition-colors shrink-0 shadow-sm"
        >
          <FileDown size={14} />
          <span>Tải Trọn Bộ + Ảnh (.ZIP)</span>
        </a>
      </div>

      <div className="text-caption font-bold text-text-muted uppercase tracking-wider">
        Hoặc chọn từng loại dữ liệu để xem chi tiết
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOMAINS.map((d) => {
          const count = org[d.countKey]
          const Icon = d.icon
          return (
            <Button variant="outline"
              key={d.key}
              type="button"
              onClick={() => onSelect(d.key)}
              className="text-[length:inherit] h-auto justify-start font-[inherit] gap-0 group text-left w-full rounded-2xl border border-border bg-surface hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-4 space-y-2.5 focus:outline-primary hover:bg-surface"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl bg-surface-alt flex items-center justify-center`}>
                    <Icon size={18} className={d.color} />
                  </div>
                  <div>
                    <p className="font-bold text-body-sm text-text group-hover:text-primary transition-colors">
                      {d.label}
                    </p>
                    <p className="text-caption text-text-muted font-bold">
                      {typeof count === "number" ? `Khoảng ${count.toLocaleString("vi-VN")} bản ghi` : "—"}
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-text-muted group-hover:text-primary transition-colors" />
              </div>
              <p className="text-caption text-text-muted leading-relaxed">{d.description}</p>
              <div className="flex items-center gap-1.5 text-caption text-success font-bold bg-success-bg rounded-lg px-2 py-1 w-fit">
                <FileDown size={11} />
                Xem chi tiết + Tải CSV
              </div>
            </Button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

export function PlatformDataHub() {
  const { t, dict } = useI18n()
  const [orgs, setOrgs] = useState<readonly PlatformOrgDataSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<"ALL" | "TRIAL" | "STORE" | "CHAIN" | "ENTERPRISE">("ALL")

  const [selectedOrg, setSelectedOrg] = useState<PlatformOrgDataSummary | null>(null)
  const [selectedDomain, setSelectedDomain] = useState<RecordDomain | null>(null)

  const loadOrgs = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/platform/orgs-data")
      if (res.ok) {
        const json = await res.json()
        const data = json.data as { orgs: PlatformOrgDataSummary[] }
        setOrgs(data.orgs)
      }
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadOrgs())
  }, [])

  const handleOpenOrg = (org: PlatformOrgDataSummary) => {
    setSelectedOrg(org)
    setSelectedDomain(null)
  }

  const handleBackToOrgs = () => {
    setSelectedOrg(null)
    setSelectedDomain(null)
  }

  const handleBackToDomains = () => setSelectedDomain(null)

  const filteredOrgs = orgs.filter((o) => {
    const matchSearch =
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.slug.toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    if (filterType !== "ALL" && o.type !== filterType) return false
    return true
  })

  const typeCounts = {
    TRIAL: orgs.filter((o) => o.type === "TRIAL").length,
    STORE: orgs.filter((o) => o.type === "STORE").length,
    CHAIN: orgs.filter((o) => o.type === "CHAIN").length,
    ENTERPRISE: orgs.filter((o) => o.type === "ENTERPRISE").length,
  }

  const selectedDomainMeta = DOMAINS.find((d) => d.key === selectedDomain)

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="space-y-1">
        <nav aria-label="Đường dẫn" className="flex items-center gap-2 text-caption font-bold text-text-muted flex-wrap">
          <Button variant="ghost"
            type="button"
            onClick={handleBackToOrgs}
            className={`text-[length:inherit] h-auto p-0 flex items-center gap-1.5 hover:text-primary transition-colors text-text font-bold ${TEXT_BUTTON_HIT_AREA}`}
          >
            <Globe size={15} className="text-primary" />
            <span>Dữ Liệu Nền Tảng</span>
          </Button>
          {selectedOrg && (
            <>
              <ChevronRight size={13} className="text-text-muted/60" />
              <Button variant="ghost"
                type="button"
                onClick={handleBackToDomains}
                className={`text-[length:inherit] h-auto p-0 flex items-center gap-1.5 transition-colors ${selectedDomain ? "hover:text-primary text-text-muted" : "text-primary font-extrabold"}`}
              >
                <Building2 size={14} />
                <span>{selectedOrg.name}</span>
              </Button>
            </>
          )}
          {selectedDomain && selectedDomainMeta && (
            <>
              <ChevronRight size={13} className="text-text-muted/60" />
              <span className="flex items-center gap-1.5 text-primary font-extrabold">
                <selectedDomainMeta.icon size={14} />
                <span>{selectedDomainMeta.label}</span>
              </span>
            </>
          )}
        </nav>

        {/* Title + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <PageHeader
            title={
              <span className="inline-flex items-center gap-2">
                {selectedDomain && selectedDomainMeta ? (
                  <>
                    <selectedDomainMeta.icon className={selectedDomainMeta.color} size={20} />
                    <span>{selectedDomainMeta.label}</span>
                  </>
                ) : selectedOrg ? (
                  <>
                    <Building2 className="text-primary" size={20} />
                    <span>{selectedOrg.name}</span>
                  </>
                ) : (
                  <>
                    <Globe className="text-primary" size={20} />
                    <span>Dữ liệu toàn nền tảng</span>
                  </>
                )}
              </span>
            }
            tip={
              selectedDomain
                ? `Xem và tải toàn bộ bản ghi từ ${selectedOrg?.name}.`
                : selectedOrg
                ? "Chọn loại dữ liệu để xem chi tiết từng bản ghi và xuất file."
                : `Xuyên tổ chức — ${orgs.length} tổ chức đã đăng ký.`
            }
          />

          <div className="flex items-center gap-2 shrink-0">
            {selectedOrg ? (
              <Button
                variant="outline"
                size="sm"
                onClick={selectedDomain ? handleBackToDomains : handleBackToOrgs}
                className="gap-1.5 font-bold"
              >
                <ArrowLeft size={14} />
                <span>{selectedDomain ? "Quay lại chọn loại dữ liệu" : "Quay lại danh sách"}</span>
              </Button>
            ) : (
              <>
                <div className="relative w-44 sm:w-52">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <Input
                    type="text"
                    placeholder="Tìm tổ chức…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full text-caption h-9 pl-9 pr-3 rounded-xl border border-border bg-surface focus:outline-primary"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Làm mới dữ liệu"
                  onClick={() => void loadOrgs()}
                  className="h-9 w-9 p-0"
                >
                  <RefreshCw size={13} />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonBlock lines={6} />
      ) : selectedDomain && selectedOrg ? (
        /* Level 2: Actual records table */
        <PlatformRecordsViewer
          orgId={selectedOrg.id}
          orgName={selectedOrg.name}
          domain={selectedDomain}
        />
      ) : selectedOrg ? (
        /* Level 1: Domain picker */
        <DomainPicker org={selectedOrg} onSelect={setSelectedDomain} />
      ) : (
        /* Level 0: Org grid */
        <div className="space-y-4">
          {/* Type filters */}
          <div className="flex items-center gap-2 flex-wrap border-b border-border/60 pb-3">
            {(["ALL", "TRIAL", "STORE", "CHAIN", "ENTERPRISE"] as const).map((t) => {
              const labels: Record<string, string> = {
                ALL: `Tất cả (${orgs.length})`,
                TRIAL: `Dùng thử (${typeCounts.TRIAL})`,
                STORE: `Cửa hàng (${typeCounts.STORE})`,
                CHAIN: `Chuỗi (${typeCounts.CHAIN})`,
                ENTERPRISE: `DN (${typeCounts.ENTERPRISE})`,
              }
              return (
                <Button variant="ghost"
                  key={t}
                  type="button"
                  onClick={() => setFilterType(t)}
                  className={`h-auto gap-0 px-3 py-1 rounded-lg text-caption font-bold transition-colors ${
                    filterType === t
                      ? "bg-primary text-white hover:bg-primary"
                      : "bg-surface border border-border text-text-muted hover:text-text hover:bg-surface"
                  }`}
                >
                  {labels[t]}
                </Button>
              )
            })}
            <span className="ml-auto text-caption text-text-muted flex items-center gap-1">
              <Layers size={12} />
              Bấm vào ô → Chọn loại dữ liệu → Xem &amp; Tải
            </span>
          </div>

          {filteredOrgs.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-border bg-surface">
              <Globe size={28} className="mx-auto text-text-muted mb-2" />
              <p className="text-body-sm font-bold text-text">Không tìm thấy tổ chức phù hợp</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredOrgs.map((org) => (
                <OrgCard key={org.id} org={org} onOpen={handleOpenOrg} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
