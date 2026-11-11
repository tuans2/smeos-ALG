"use client"

import { PageHeader } from "@/components/ui/page-header"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useI18n } from "@/lib/i18n"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { Building2 } from "@/components/ui/icon-set/building2"
import { Store } from "@/components/ui/icon-set/store"
import { Clock } from "@/components/ui/icon-set/clock"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { formatDateTime } from "@/lib/i18n/formatters"
import { CreditLedgerPanel } from "@/components/platform/credit-ledger-panel"
import { SubscriptionPanel } from "@/components/platform/subscription-panel"
import { CustomDomainsPanel } from "@/components/platform/custom-domains-panel"

type PlatformOrganizationDetail = {
  id: string
  name: string
  slug: string
  type: string
  creditBalance: number
  createdAt: string
  memberCount: number
  branchCount: number
  workspaceKinds: string[]
  unlockedLocales?: string[]
  pendingLanguageUnlock?: {
    requested_locales: string[]
    requested_at: string
    requested_by?: string
    note?: string | null
  } | null
  pendingModelChange?: {
    requested_type: string
    requested_at: string
    requested_by?: string
    note?: string | null
  } | null
}

async function layJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  if (!res.ok) return null
  return (await res.json()) as T
}

function Dong({ nhan, giaTri }: { nhan: string; giaTri: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 text-caption last:border-0">
      <span className="text-text-muted">{nhan}</span>
      <span className="font-medium">{giaTri}</span>
    </div>
  )
}

export default function ChiTietToChucPage() {
  const { t } = useI18n()
  const params = useParams<{ id: string }>()
  const [org, setOrg] = useState<PlatformOrganizationDetail | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  const [thongBao, setThongBao] = useState<string | null>(null)
  const [dangDuyet, setDangDuyet] = useState(false)

  const taiDuLieu = async () => {
    const res = await layJson<{ data: PlatformOrganizationDetail }>(`/api/v1/platform/organizations/${params.id}`)
    if (!res) {
      setLoi("Không tìm thấy tổ chức, hoặc không tải được.")
      return
    }
    setOrg(res.data)
  }

  useEffect(() => {
    void taiDuLieu()
  }, [params.id])

  const handleApprove = async (targetType: string) => {
    setDangDuyet(true)
    setLoi(null)
    setThongBao(null)
    try {
      const res = await fetch(`/api/v1/platform/organizations/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          note: "Phê duyệt bởi Quản trị viên SaaS",
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error?.message || "Phê duyệt thất bại")
      }

      setThongBao(`Đã chuyển đổi tổ chức sang ${targetType === "CHAIN" ? "Chuỗi cửa hàng" : "1 Cửa hàng độc lập"} thành công!`)
      await taiDuLieu()
    } catch (err: unknown) {
      setLoi(err instanceof Error ? err.message : "Đã có lỗi xảy ra")
    } finally {
      setDangDuyet(false)
    }
  }

  if (loi && !org) return <p role="alert" className="text-body-sm text-danger">{loi}</p>
  if (!org) return <div className="py-4"><SkeletonBlock lines={4} /></div>

  const isChain = org.type === "CHAIN"

  return (
    <div className="space-y-4 max-w-xl">
      <PageHeader title={org.name} description="Chi tiết tổ chức" backHref="/van-hanh/to-chuc" backLabel="Danh sách tổ chức" />
      {thongBao && (
        <div className="p-3 bg-primary/10 border border-primary/30 rounded-xl text-body-sm font-semibold text-primary flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{thongBao}</span>
        </div>
      )}

      {loi && (
        <div className="p-3 bg-danger/10 border border-danger/30 rounded-xl text-body-sm font-semibold text-danger">
          {loi}
        </div>
      )}

      {/* Khối cảnh báo yêu cầu chuyển đổi mô hình đang chờ duyệt */}
      {org.pendingModelChange && (
        <Card className="p-4 border-2 border-warning/40 bg-warning-bg rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-warning-text font-bold text-body-sm">
            <Clock size={16} />
            <span>Yêu cầu chuyển đổi mô hình cần duyệt</span>
          </div>

          <div className="text-caption text-text-muted space-y-1">
            <div>
              Chuyển sang:{" "}
              <strong className="text-text">
                {org.pendingModelChange.requested_type === "CHAIN" ? "Chuỗi cửa hàng (CHAIN)" : "1 Cửa hàng độc lập (SINGLE)"}
              </strong>
            </div>
            <div>Thời gian gửi: {formatDateTime(org.pendingModelChange.requested_at)}</div>
            {org.pendingModelChange.note && (
              <div className="italic">Lý do: &ldquo;{org.pendingModelChange.note}&rdquo;</div>
            )}
          </div>

          <div className="pt-1 flex items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              disabled={dangDuyet}
              onClick={() => handleApprove(org.pendingModelChange!.requested_type)}
              className="gap-1.5 font-bold shadow-xs"
            >
              <CheckCircle2 size={14} />
              <span>{dangDuyet ? "Đang xử lý…" : `Duyệt chuyển sang ${org.pendingModelChange.requested_type}`}</span>
            </Button>
          </div>
        </Card>
      )}

      {/* Khối cảnh báo yêu cầu MỞ KHÓA NGÔN NGỮ QUỐC TẾ cần Admin duyệt */}
      {org.pendingLanguageUnlock && (
        <Card className="p-4 border-2 border-primary/40 bg-primary/5 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-primary font-bold text-body-sm">
            <Clock size={16} />
            <span>Yêu cầu mở khóa Gói Ngôn Ngữ Quốc Tế (Tiếng Anh)</span>
          </div>

          <div className="text-caption text-text-muted space-y-1">
            <div>
              Cửa hàng gửi yêu cầu mở khóa:{" "}
              <strong className="text-text">
                Tiếng Anh ({org.pendingLanguageUnlock.requested_locales.join(", ")})
              </strong>
            </div>
            <div>Thời gian gửi: {formatDateTime(org.pendingLanguageUnlock.requested_at)}</div>
            {org.pendingLanguageUnlock.note && (
              <div className="italic">Ghi chú từ cửa hàng: &ldquo;{org.pendingLanguageUnlock.note}&rdquo;</div>
            )}
          </div>

          <div className="pt-1 flex items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={dangDuyet}
              onClick={async () => {
                setDangDuyet(true)
                setLoi(null)
                try {
                  const res = await fetch(`/api/v1/platform/organizations/${params.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ unlocked_locales: ["vi", "en"] }),
                  })
                  if (!res.ok) throw new Error("Không thể phê duyệt mở khóa ngôn ngữ")
                  setThongBao("Đã phê duyệt MỞ KHÓA Tiếng Anh thành công cho cửa hàng!")
                  await taiDuLieu()
                } catch (err) {
                  setLoi(err instanceof Error ? err.message : "Lỗi phê duyệt")
                } finally {
                  setDangDuyet(false)
                }
              }}
              className="gap-1.5 font-bold shadow-xs"
            >
              <CheckCircle2 size={14} />
              <span>{dangDuyet ? "Đang xử lý…" : "Phê duyệt Mở khóa Tiếng Anh"}</span>
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between mb-1 border-b border-border pb-2">
          <p className="text-title-sm font-semibold">{org.name}</p>
          <span className="rounded bg-surface-alt px-2 py-0.5 text-caption text-text-muted">Phạm vi: Tổ chức cụ thể</span>
        </div>

        <Dong nhan="Slug" giaTri={org.slug} />
        <Dong
          nhan="Loại tổ chức"
          giaTri={
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-caption font-semibold ${
                  isChain ? "bg-accent/15 text-accent-text" : "bg-primary/15 text-primary"
                }`}
              >
                {isChain ? "Chuỗi cửa hàng (CHAIN)" : "1 Cửa hàng độc lập (SINGLE)"}
              </span>

              {/* Nút đổi nhanh của Admin nếu không có pending request */}
              {!org.pendingModelChange && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  disabled={dangDuyet}
                  onClick={() => handleApprove(isChain ? "SINGLE" : "CHAIN")}
                  className="text-caption text-text-muted hover:text-primary underline ml-1 h-auto p-0"
                >
                  {isChain ? "Chuyển về 1 Cửa hàng" : "Chuyển sang Chuỗi"}
                </Button>
              )}
            </div>
          }
        />
        <Dong nhan="Số dư credit" giaTri={org.creditBalance} />
        <Dong nhan="Thành viên" giaTri={org.memberCount} />
        <Dong nhan="Chi nhánh" giaTri={org.branchCount} />
        <Dong nhan="Workspace" giaTri={org.workspaceKinds.join(", ") || "—"} />
        <Dong nhan="Tạo lúc" giaTri={formatDateTime(org.createdAt)} />
      </Card>

      <SubscriptionPanel organizationId={params.id} />

      <CustomDomainsPanel organizationId={params.id} />

      <CreditLedgerPanel organizationId={params.id} orgCode={org.slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12)} onChanged={() => void taiDuLieu()} />

      {/* Khối quản trị mở khóa ngôn ngữ đa quốc gia (SaaS Admin Language Unlock) */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div>
            <p className="text-body-sm font-bold text-text">Gói Ngôn Ngữ & Quốc Tế (SaaS Unlock)</p>
            <p className="text-caption text-text-muted">
              Admin SaaS cấp quyền cho cửa hàng này được phép sử dụng ngôn ngữ nào trên Bộ sưu tập riêng.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <label className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-surface-muted/40 cursor-not-allowed">
            <div className="flex items-center gap-2.5">
              <span className="text-body">🇻🇳</span>
              <div>
                <p className="text-caption font-bold text-text">Tiếng Việt (vi)</p>
                <p className="text-caption text-text-muted">Mặc định cho toàn bộ cửa hàng nội địa</p>
              </div>
            </div>
            <span className="text-caption font-semibold text-success bg-success-bg px-2 py-0.5 rounded-full border border-success/20">
              Luôn mở
            </span>
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-surface hover:bg-surface-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-2.5">
              <span className="text-body">🇬🇧</span>
              <div>
                <p className="text-caption font-bold text-text">Tiếng Anh (en — Quốc tế / Kiều bào)</p>
                <p className="text-caption text-text-muted">Cho phép cửa hàng tạo bộ sưu tập riêng & nhận đơn từ nước ngoài</p>
              </div>
            </div>
            <Checkbox
              checked={Boolean(org.unlockedLocales?.includes("en"))}
              disabled={dangDuyet}
              onCheckedChange={async (checked) => {
                const enableEn = Boolean(checked)
                const newLocales = enableEn ? ["vi", "en"] : ["vi"]
                setDangDuyet(true)
                setLoi(null)
                try {
                  const res = await fetch(`/api/v1/platform/organizations/${params.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ unlocked_locales: newLocales }),
                  })
                  if (!res.ok) throw new Error("Không thể cập nhật quyền ngôn ngữ")
                  setThongBao(enableEn ? "Đã MỞ KHÓA Tiếng Anh cho cửa hàng này!" : "Đã KHÓA Tiếng Anh đối với cửa hàng này.")
                  await taiDuLieu()
                } catch (err) {
                  setLoi(err instanceof Error ? err.message : "Lỗi cập nhật ngôn ngữ")
                } finally {
                  setDangDuyet(false)
                }
              }}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
            />
          </label>
        </div>
      </Card>
    </div>
  )
}

