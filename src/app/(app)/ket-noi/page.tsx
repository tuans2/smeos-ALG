"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Share2 } from "@/components/ui/icon-set/share2"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { Calendar } from "@/components/ui/icon-set/calendar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FeatureGuidanceCard } from "@/components/ui/feature-guidance-card"
import { InlineError } from "@/components/ui/inline-error"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { PlatformAccountCard, ConnectAccountModal, type PlatformConfig } from "@/components/templates/platform-connections"
import { useChannelAccounts } from "@/components/channel-connections/use-channel-accounts"
import { summarizeChannelHealth, STALE_AFTER_DAYS } from "@/modules/integration/domain/channel-session-health"
import { useSession } from "@/lib/session"
import { getIndustryTerminology, type IndustryTerminology } from "@/modules/organization/domain/industry-profile"
import { PageHeader } from "@/components/ui/page-header"

function getSupportedPlatforms(ti: IndustryTerminology): PlatformConfig[] {
  return [
    {
      id: "facebook",
      name: "Facebook Fanpage",
      icon: "📘",
      tag: "Fanpage & Cộng đồng",
      description: `Đăng bài viết kèm album ảnh ${ti.sampleProduct} thiết kế, tiếp cận khách hàng trên Fanpage.`,
      features: ["Đăng bài tự động", "Hỗ trợ nhiều ảnh", "Đăng lên đúng Fanpage"],
      badgeColor: "blue",
    },
    {
      id: "instagram",
      name: "Instagram",
      icon: "📸",
      tag: "Ảnh & video ngắn",
      description: `Chia sẻ hình ảnh thẩm mỹ cao, reels ${ti.sampleProduct} và câu chuyện thương hiệu.`,
      features: ["Đăng ảnh thẩm mỹ cao", "Gắn thẻ hashtag tự động", "Hình ảnh nhất quán thương hiệu"],
      badgeColor: "rose",
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      icon: "💼",
      tag: "Đối tác & Doanh nghiệp",
      description: `Xây dựng thương hiệu doanh nghiệp, giới thiệu gói ${ti.sampleProduct} định kỳ và quà tặng VIP.`,
      features: ["Bài chia sẻ chuyên môn", "Kết nối khách doanh nghiệp", "Đăng bài chuyên nghiệp"],
      badgeColor: "sky",
    },
    {
      id: "tiktok",
      name: "TikTok",
      icon: "🎵",
      tag: "Video ngắn xu hướng",
      description: `Phát sóng các video hậu trường ${ti.makerAction}, clip thực tế 30-45 giây thu hút giới trẻ.`,
      features: ["Kịch bản quay 30s", "Mở đầu cuốn hút, kêu gọi đặt hàng", "Âm thanh xu hướng"],
      badgeColor: "purple",
    },
    {
      id: "zalo",
      name: "Zalo Official Account",
      icon: "💬",
      tag: "Tư vấn & Chăm sóc 1-chạm",
      description: `Gửi tin nhắn chào ${ti.sampleProduct} mới, báo giá ưu đãi và tư vấn khách hàng cá nhân hóa.`,
      features: ["Tin nhắn tư vấn 1-chạm", "Báo giá nhanh chóng", "Chăm sóc khách VIP"],
      badgeColor: "blue",
    },
  ]
}

export default function PlatformConnectionsPage() {
  const router = useRouter()
  const { organization, can } = useSession()
  const ti = getIndustryTerminology(organization?.industry)
  const platforms = getSupportedPlatforms(ti)
  const nameOf = (id: string) => platforms.find((p) => p.id === id)?.name ?? id
  const { accounts, loadState, refreshing, actionLoading, notice, reload, login, save, check, disconnect } = useChannelAccounts(nameOf)
  const [modalPlatform, setModalPlatform] = useState<string | null>(null)
  const [editingUsername, setEditingUsername] = useState("")
  const [confirm, confirmDialog] = useConfirmDialog()
  const canManage = can("J5")

  const openModal = (platformId: string, username = "") => {
    setModalPlatform(platformId)
    setEditingUsername(username)
  }

  const handleDisconnect = async (platformId: string) => {
    const ok = await confirm({
      title: `Ngắt kết nối ${nameOf(platformId)}?`,
      consequence: "Bài đã lên lịch cho kênh này sẽ không đăng được cho đến khi bạn kết nối lại. Thông tin đăng nhập đã lưu sẽ bị xoá.",
      confirmLabel: "Ngắt kết nối",
      tone: "danger",
    })
    if (ok) await disconnect(platformId)
  }

  const activeModalConfig = platforms.find((p) => p.id === modalPlatform)
  const health = summarizeChannelHealth(accounts, new Date())

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-bg p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <PageHeader
          breadcrumbs={
            <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Share2 size={13} className="text-primary" aria-hidden="true" />
              Kênh mạng xã hội của cửa hàng
            </span>
          }
          title="Kết nối kênh bán hàng"
          description="Kết nối trang mạng xã hội và kênh nhắn tin để đăng bài sản phẩm từ ALG"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="success" className="text-caption px-2.5 py-1">
            <CheckCircle2 size={13} aria-hidden="true" />
            <strong className="mx-1">{health.healthy + health.stale}</strong> / {platforms.length} đang kết nối
          </Badge>
          <Button size="sm" variant="outline" onClick={() => void reload()} disabled={refreshing} className="text-caption gap-1">
            <RefreshCw size={12} className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />
            Làm mới
          </Button>
          <Button size="sm" onClick={() => router.push("/lich-dang" as never)} className="text-caption font-bold gap-1">
            <Calendar size={13} aria-hidden="true" />
            Bảng lịch đăng
            <ArrowRight size={13} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {notice && (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          className={`p-3.5 rounded-xl border text-caption font-semibold flex items-center gap-2.5 ${
            notice.type === "success" ? "bg-success-bg border-success/30 text-text" : "bg-danger-bg border-danger/30 text-danger-text"
          }`}
        >
          {notice.type === "success" ? <CheckCircle2 size={16} className="text-success flex-shrink-0" aria-hidden="true" /> : <AlertCircle size={16} className="flex-shrink-0" aria-hidden="true" />}
          <span>{notice.message}</span>
        </div>
      )}

      {loadState === "error" && (
        <InlineError message="Chưa tải được danh sách tài khoản từ dịch vụ đăng bài. Trạng thái bên dưới có thể chưa đúng." onRetry={() => void reload()} />
      )}
      {!canManage && (
        <p className="rounded-xl border border-border bg-surface-alt p-3 text-caption text-text">
          Bạn đang xem ở chế độ chỉ đọc. Kết nối, đăng nhập lại hoặc ngắt kênh cần quyền đăng bài lên mạng xã hội — nhờ quản lý cửa hàng cấp quyền.
        </p>
      )}
      {(health.stale > 0 || health.needsLogin > 0) && (
        <p role="status" className="rounded-xl border border-warning/40 bg-warning-bg p-3 text-caption text-warning-text">
          {health.needsLogin > 0 && `${health.needsLogin} kênh cần đăng nhập lại. `}
          {health.stale > 0 && `${health.stale} kênh đã hơn ${STALE_AFTER_DAYS} ngày chưa đăng nhập lại — bấm "Kiểm tra" trước khi lên lịch đăng để tránh bài bị lỗi.`}
        </p>
      )}

      <FeatureGuidanceCard
        tag="HƯỚNG DẪN KẾT NỐI"
        title="Kết nối một lần, đăng bài nhiều kênh"
        description="Nhập tài khoản trang mạng xã hội của cửa hàng. Hệ thống giữ phiên đăng nhập để bạn đăng bài sản phẩm lên nhiều kênh mà không phải đăng nhập lại mỗi lần."
        tips={[
          "Mật khẩu được mã hoá trước khi lưu và không hiện lại trên màn hình.",
          "Khi nền tảng yêu cầu xác minh hai bước, một cửa sổ đăng nhập sẽ mở để bạn hoàn tất.",
          "Bài viết soạn ở mục Nội dung có thể đăng ngay lên các kênh đã kết nối.",
          "Kênh bị đăng xuất ngoài ý muốn: bấm \"Đăng nhập ngay\" để kết nối lại.",
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms.map((platform) => (
          <PlatformAccountCard
            key={platform.id}
            platform={platform}
            account={accounts.find((a) => a.platform.toLowerCase() === platform.id.toLowerCase())}
            loadingAction={actionLoading}
            onConnect={(id) => openModal(id)}
            onLogin={(id) => void login(id)}
            onCheck={(id) => void check(id)}
            onEdit={(id, username) => openModal(id, username)}
            onDisconnect={(id) => void handleDisconnect(id)}
          />
        ))}
      </div>

      {activeModalConfig && (
        <ConnectAccountModal
          platformId={activeModalConfig.id}
          platformName={activeModalConfig.name}
          initialUsername={editingUsername}
          isOpen={!!modalPlatform}
          isLoading={actionLoading === modalPlatform}
          onClose={() => { setModalPlatform(null); setEditingUsername("") }}
          onSave={async (payload) => {
            setModalPlatform(null)
            await save(payload)
          }}
        />
      )}
      {confirmDialog}
    </div>
  )
}
