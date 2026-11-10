"use client"

import { PageHeader } from "@/components/ui/page-header"
import { useI18n } from "@/lib/i18n"
import { useState, useMemo, type ComponentType } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Camera } from "@/components/ui/icon-set/camera"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { TrendingUp } from "@/components/ui/icon-set/trending-up"
import { Tag } from "@/components/ui/icon-set/tag"
import { Users } from "@/components/ui/icon-set/users"
import { ShoppingBag } from "@/components/ui/icon-set/shopping-bag"
import { Bot } from "@/components/ui/icon-set/bot"
import { Globe } from "@/components/ui/icon-set/globe"
import { Folder } from "@/components/ui/icon-set/folder"
import { WalletCards } from "@/components/ui/icon-set/wallet-cards"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Wand2 } from "@/components/ui/icon-set/wand2"
import { Video } from "@/components/ui/icon-set/video"
import { FileText } from "@/components/ui/icon-set/file-text"
import { Share2 } from "@/components/ui/icon-set/share2"
import { LayoutTemplate } from "@/components/ui/icon-set/layout-template"
import { Radio } from "@/components/ui/icon-set/radio"
import { Clock } from "@/components/ui/icon-set/clock"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { BarChart3 } from "@/components/ui/icon-set/bar-chart3"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { Settings2 } from "@/components/ui/icon-set/settings2"
import { BookOpen } from "@/components/ui/icon-set/book-open"
import { Cpu } from "@/components/ui/icon-set/cpu"
import { useSession } from "@/lib/session"
import { COMING_SOON_LABEL, isRouteLocked } from "@/lib/feature-lock"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  buildNav,
  mobileSecondSlot,
  type NavEntry,
} from "@/components/layout/nav-model"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"
import { InternalChatUnreadBadge } from "@/components/internal-chat/internal-chat-unread-badge"

const ICONS: Record<string, ComponentType<{ size?: number; className?: string; strokeWidth?: number }>> = {
  Users,
  ShoppingBag,
  Bot,
  Globe,
  Tag,
  Camera,
  Folder,
  WalletCards,
  TrendingUp,
  Sparkles,
  Wand2,
  Video,
  FileText,
  Share2,
  LayoutTemplate,
  Radio,
  Clock,
  CheckCircle2,
  BarChart3,
  ShieldCheck,
  Settings2,
  BookOpen,
  Cpu,
}

export default function ThemPage() {
  const { t } = useI18n()
  const router = useRouter()
  const { can, roleUx, organization } = useSession()
  const ti = getIndustryTerminology(organization?.industry)
  const coTheThemSanPham = can("L2")

  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [loi, setLoi] = useState<string | null>(null)
  const [dangGui, setDangGui] = useState(false)

  const navView = useMemo(
    () =>
      buildNav(
        can,
        roleUx,
        organization?.industry,
        organization?.navHiddenKeys,
        undefined,
        organization?.unlockedTools
      ),
    [
      can,
      roleUx,
      organization?.industry,
      organization?.navHiddenKeys,
      organization?.unlockedTools,
    ]
  )
  const slot2 = useMemo(
    () =>
      mobileSecondSlot(
        can,
        roleUx,
        organization?.industry,
        organization?.navHiddenKeys,
        undefined
      ),
    [
      can,
      roleUx,
      organization?.industry,
      organization?.navHiddenKeys,
    ]
  )
  const canApprove = can("H3") || can("I2")

  // Các mục đã có trên thanh dưới bottom nav
  const bottomBarHrefs = useMemo(() => {
    return new Set([
      "/",
      "/tai-anh",
      "/them",
      slot2.href,
      canApprove ? "/duyet" : "/job",
    ])
  }, [slot2.href, canApprove])

  // Lọc các nhóm để hiển thị dưới trang Thêm (bỏ viec-chinh và các mục đã có trên thanh dưới)
  const additionalGroups = useMemo(() => {
    return navView.groups
      .filter((g) => g.key !== "viec-chinh")
      .map((g) => ({
        ...g,
        entries: g.entries.filter((e) => !bottomBarHrefs.has(e.href)),
      }))
      .filter((g) => g.entries.length > 0)
  }, [navView, bottomBarHrefs])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoi(null)
    setDangGui(true)
    try {
      const res = await fetch("/api/v1/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, name, category: category || null }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setLoi(data?.error?.message ?? `Tạo sản phẩm thất bại (${res.status})`)
        return
      }
      router.push("/san-pham" as never)
    } catch {
      setLoi("Không kết nối được máy chủ")
    } finally {
      setDangGui(false)
    }
  }

  function renderGroupEntry(item: NavEntry) {
    const Icon = ICONS[item.iconKey] || Tag
    const isComingSoon = item.status === "COMING_SOON" || isRouteLocked(item.href)

    if (isComingSoon) {
      return (
        <div
          key={item.href}
          aria-disabled="true"
          className="flex min-h-[44px] items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-2.5 text-text-muted opacity-60"
        >
          <div className="flex items-center gap-3">
            <Icon size={18} strokeWidth={1.8} className="text-text-muted" />
            <span className="text-body-sm font-medium">{item.label}</span>
          </div>
          <span className="rounded-full bg-surface-alt px-2 py-0.5 text-caption font-extrabold uppercase tracking-wide">
            {COMING_SOON_LABEL}
          </span>
        </div>
      )
    }

    return (
      <Link
        key={item.href}
        href={item.href as never}
        className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-2.5 text-left transition-colors hover:bg-surface-alt active:bg-surface-alt/80"
      >
        <div className="flex items-center gap-3">
          <Icon size={18} strokeWidth={1.8} className="text-primary" />
          <span className="text-body-sm font-medium text-text">{item.label}</span>
        </div>
        {item.navKey === "internal-chat" && <InternalChatUnreadBadge />}
        <ChevronRight size={18} strokeWidth={2} className="text-text-muted" />
      </Link>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-shrink-0 border-b border-border bg-surface px-4 py-4">
        <PageHeader title="Thêm & Điều hướng" />
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pb-20">
        {/* Lối tắt nhanh */}
        <Link
          href="/tai-anh"
          className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-xs transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary"
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-surface-alt">
            <Camera size={20} strokeWidth={1.8} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-body-sm font-semibold text-text">Tải ảnh, để AI nhận diện</div>
            <div className="text-caption text-text-muted">Phân tích ảnh sản phẩm và bóc tách dữ liệu</div>
          </div>
          <ChevronRight size={18} strokeWidth={2} className="text-text-muted" />
        </Link>

        <Link
          href="/market-intelligence"
          className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-xs transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary"
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-surface-alt text-primary">
            <TrendingUp size={20} strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-body-sm font-semibold text-text">
              Nghiên cứu Thị trường & Xu hướng
            </div>
            <div className="text-caption text-text-muted">Khám phá cơ hội và xu hướng bán hàng</div>
          </div>
          <ChevronRight size={18} strokeWidth={2} className="text-text-muted" />
        </Link>

        {/* Nhập tay sản phẩm mới */}
        {coTheThemSanPham ? (
          <Card className="flex flex-col gap-3.5 p-4">
            <div className="text-body-sm font-bold text-text">Hoặc nhập tay sản phẩm mới</div>

            {loi && (
              <div className="rounded-xl border border-danger/30 bg-danger-bg px-3.5 py-2.5 text-body-sm font-medium text-danger">
                {loi}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <div className="mb-1.5 text-body-sm font-semibold">Mã sản phẩm</div>
                <Input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="VD: BHC-001"
                />
              </div>
              <div>
                <div className="mb-1.5 text-body-sm font-semibold">Tên sản phẩm</div>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Bó hồng đỏ 20 cành"
                />
              </div>
              <div>
                <div className="mb-1.5 text-body-sm font-semibold">Danh mục (tuỳ chọn)</div>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={`VD: ${ti.sampleProduct}`}
                />
              </div>
              <Button type="submit" disabled={dangGui}>
                {dangGui ? "Đang tạo…" : "Tạo sản phẩm"}
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="p-4 text-body-sm text-text-muted">
            Tài khoản này chưa có quyền tạo sản phẩm thủ công (cần năng lực L2).
          </Card>
        )}

        {/* Danh sách các chức năng còn lại theo chuỗi giá trị */}
        <div className="mt-2 space-y-4">
          <div className="text-body-sm font-bold text-text">Tất cả chức năng hệ thống</div>
          {additionalGroups.map((group) => (
            <div key={group.key} className="space-y-1.5">
              <div className="text-caption font-bold uppercase tracking-wider text-text-muted">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.entries.map(renderGroupEntry)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
