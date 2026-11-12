// Trang "Kho Templates" — 18/09, theo yêu cầu "Xây dựng 1 tab Kho templates
// vào thành sidebar home". Phạm vi đã chốt với anh Tony: thư viện XEM TRƯỚC
// trực quan, chỉ đọc (không chỉnh sửa/quản lý override ở đây — phần đó đã có
// riêng ở /ho-so), hiển thị cho MỌI người dùng có tài khoản (không gate theo
// capability). Nội dung 11 chức năng × 50 template lấy đúng theo
// docs/kien-truc/ALG_TEMPLATE_SYSTEM_SSOT.md mục 3 — không tự bịa mô tả.
//
// Lưu ý đã đối chiếu thật với hệ thống file trước khi dùng: SSOT ghi màn
// hình của Chức năng 10 (Analytics & Governance) là `/bao-cao`, nhưng thư
// mục đó không tồn tại trên máy — route thật đang chạy là `/so-lieu`. Trang
// này dùng route thật (`/so-lieu`) thay vì route đã lỗi thời trong tài liệu,
// để nút "Mở màn hình" không bao giờ dẫn tới trang 404.

"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { LayoutTemplate } from "@/components/ui/icon-set/layout-template"
import { Search } from "@/components/ui/icon-set/search"
import { Camera } from "@/components/ui/icon-set/camera"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Video } from "@/components/ui/icon-set/video"
import { Megaphone } from "@/components/ui/icon-set/megaphone"
import { Share2 } from "@/components/ui/icon-set/share2"
import { Globe } from "@/components/ui/icon-set/globe"
import { Users } from "@/components/ui/icon-set/users"
import { ShoppingBag } from "@/components/ui/icon-set/shopping-bag"
import { Bot } from "@/components/ui/icon-set/bot"
import { BarChart3 } from "@/components/ui/icon-set/bar-chart3"
import { Plug } from "@/components/ui/icon-set/plug"
import { ArrowUpRight } from "@/components/ui/icon-set/arrow-up-right"
import { Eye } from "@/components/ui/icon-set/eye"
import { X } from "@/components/ui/icon-set/x"
import { FeatureGuidanceCard } from "@/components/templates/shared/feature-guidance-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TemplatePreviewModal } from "./template-preview-modal"
import { TEMPLATE_PREVIEW_REGISTRY, SELF_MODAL_TEMPLATE_FILES } from "./preview-registry"
import { useI18n } from "@/lib/i18n/context"
import { PageHeader } from "@/components/ui/page-header"

type TemplateFile = {
  file: string
  type: string
  purpose: string
}

type TemplateCategory = {
  id: string
  code: string
  title: string
  route: string
  icon: typeof LayoutTemplate
  description: string
  files: TemplateFile[]
}

const CATEGORIES: TemplateCategory[] = [
  {
    id: "product-analysis",
    code: "M01",
    title: "Phân tích Ảnh Sản phẩm",
    route: "/tai-anh",
    icon: Camera,
    description:
      "Tải ảnh hoa, AI nhận diện cấu phần & sinh nội dung bán hàng, tạo thẻ chào khách A6 và kịch bản tư vấn Zalo.",
    files: [
      { file: "m01a-guidance-card.tsx", type: "Guidance", purpose: "Hướng dẫn tải ảnh chụp sản phẩm & nhận diện cấu phần nguyên liệu." },
      { file: "m01b-guidance-card.tsx", type: "Guidance", purpose: "Hướng dẫn sinh tên thương mại & mô tả SEO." },
      { file: "m01c-guidance-card.tsx", type: "Guidance", purpose: "Hướng dẫn tạo thẻ chào khách A6 & kịch bản Zalo." },
      { file: "analysis-result-card.tsx", type: "Kết quả", purpose: "Thẻ kết quả phân tích cấu phần, độ tin cậy AI, danh sách nguyên liệu, duyệt/từ chối." },
      { file: "commercial-content-card.tsx", type: "Nội dung", purpose: "Thẻ nội dung bán hàng: tên gợi ý, câu chuyện hoa, phân khúc giá, lưu kho đã duyệt." },
      { file: "sales-pitch-card-a6.tsx", type: "Thẻ in A6", purpose: "Thẻ chào khách chuẩn A6 (105×148mm) tối ưu in ấn & chia sẻ, kèm bảng giá và quà tặng." },
      { file: "zalo-script-box.tsx", type: "Tư vấn", purpose: "Hộp kịch bản tư vấn Zalo sao chép 1-chạm, kèm cấu phần chi tiết." },
    ],
  },
  {
    id: "creative-studio",
    code: "M04",
    title: "Studio Sáng tạo Ảnh",
    route: "/creative-studio",
    icon: Sparkles,
    description:
      "Tách nền ảnh xưởng hoa, ghép bối cảnh studio AI, chọn nhà cung cấp & chế độ tối ưu ảnh sản phẩm.",
    files: [
      { file: "creative-guidance-card.tsx", type: "Guidance", purpose: "Hướng dẫn tách nền xưởng hoa và ghép bối cảnh studio." },
      { file: "before-after-preview-card.tsx", type: "Preview", purpose: "Thẻ so sánh trực quan ảnh gốc chụp xưởng và ảnh đã tối ưu AI." },
      { file: "studio-variant-card.tsx", type: "Chọn phối cảnh", purpose: "Thẻ chọn phối cảnh: bàn tiệc cưới, phòng khách, cầm tay." },
      { file: "studio-scene-selector.tsx", type: "Chọn phông nền", purpose: "Chọn 1 trong 5 phông nền dựng sẵn: xám ấm Hàn Quốc, trắng kem TMĐT, mộc chân thực, gỗ ấm vintage, bokeh." },
      { file: "enhancer-provider-selector.tsx", type: "Chọn nhà cung cấp", purpose: "Chọn nhà cung cấp tách nền/nâng cấp ảnh AI trong 5 lựa chọn." },
      { file: "optimization-mode-selector.tsx", type: "Chọn chế độ", purpose: "Chuyển giữa chế độ Tự động và Tuỳ chỉnh, chọn từng năng lực tối ưu cụ thể." },
      { file: "applied-changes-breakdown.tsx", type: "Tóm tắt", purpose: "Liệt kê các thay đổi AI đã áp dụng lên ảnh: tách nền, xoá watermark, nâng nét, cân sáng." },
    ],
  },
  {
    id: "video-studio",
    code: "M05",
    title: "Studio Video Ngắn",
    route: "/video",
    icon: Video,
    description:
      "Dựng video dọc chuẩn TikTok/Reels/Shorts từ ảnh sản phẩm: kịch bản phân cảnh, phát video và tải MP4.",
    files: [
      { file: "video-guidance-card.tsx", type: "Guidance", purpose: "Hướng dẫn tạo video ngắn dọc chuẩn TikTok/Reels/Shorts." },
      { file: "storyboard-script-card.tsx", type: "Kịch bản", purpose: "Thẻ hiển thị kịch bản phân cảnh: số cảnh, thời lượng, lời thoại, tông nhạc." },
      { file: "video-player-card.tsx", type: "Trình phát", purpose: "Khung chiếu video dọc 9:16 kèm phụ đề bán hàng và tải MP4." },
    ],
  },
  {
    id: "content-engine",
    code: "M07",
    title: "Cỗ máy Nội dung Đa kênh",
    route: "/noi-dung",
    icon: Megaphone,
    description:
      "Sinh bài viết tiếp thị đa kênh & đa góc độ bằng AI (Facebook, TikTok, Instagram, Zalo, LinkedIn), xem trước như feed thật.",
    files: [
      { file: "content-guidance-card.tsx", type: "Guidance", purpose: "Hướng dẫn tạo bài viết tiếp thị đa kênh & đa góc độ." },
      { file: "multichannel-post-card.tsx", type: "Bài đăng", purpose: "Thẻ bài đăng chia tab Facebook, TikTok, Instagram, Zalo kèm sao chép." },
      { file: "angle-selector-card.tsx", type: "Chọn góc độ", purpose: "Chọn góc tiếp cận bài viết: cảm xúc, kỹ thuật tay nghề, hay ưu đãi chốt đơn." },
      { file: "model-selector-card.tsx", type: "Chọn mô hình AI", purpose: "Chọn mô hình AI sinh nội dung (Qwen local, GPT-4o, Gemini Flash), hiển thị độ trễ & chi phí." },
      { file: "social-post-preview.tsx", type: "Xem trước feed", purpose: "Mô phỏng giao diện bài đăng thật trên Facebook/Instagram/TikTok/Zalo." },
      { file: "linkedin-post-preview.tsx", type: "Xem trước feed", purpose: "Mô phỏng giao diện bài đăng B2B trên LinkedIn Feed (quà tặng doanh nghiệp)." },
    ],
  },
  {
    id: "social-publishing",
    code: "M07",
    title: "Đăng bài Mạng xã hội",
    route: "/lich-dang",
    icon: Share2,
    description:
      "Lập lịch xuất bản, duyệt hàng đợi bài chờ đăng, kiểm tra kết nối kênh và báo cáo trạng thái từng bài.",
    files: [
      { file: "publishing-guidance-card.tsx", type: "Guidance", purpose: "Hướng dẫn lập lịch xuất bản và các khung giờ vàng tương tác." },
      { file: "schedule-calendar-card.tsx", type: "Lịch", purpose: "Thẻ lịch trình phân phối nội dung, giờ phát và trạng thái bài." },
      { file: "channel-status-card.tsx", type: "Kết nối", purpose: "Thẻ kiểm tra trạng thái kết nối token Fanpage / Zalo OA." },
      { file: "schedule-queue-tab.tsx", type: "Hàng đợi", purpose: "Tab duyệt hàng đợi bài chờ đăng, chọn hàng loạt, lên lịch, chuyển sang Content Engine." },
      { file: "schedule-post-item-card.tsx", type: "Dòng bài", purpose: "Một dòng bài trong hàng đợi lịch đăng, kèm checkbox chọn và nút thử lại." },
      { file: "platform-feed-preview.tsx", type: "Xem trước feed", purpose: "Xem trước bài đăng thật trên nền tảng đã chọn, phân rã Headline/Body/Hashtag/CTA." },
      { file: "schedule-confirm-modal.tsx", type: "Xác nhận", purpose: "Modal xác nhận thời điểm đăng: ngay, giờ trưa, giờ tối, hoặc tuỳ chỉnh." },
      { file: "post-status-report-card.tsx", type: "Báo cáo", purpose: "Thẻ báo cáo trạng thái một bài đã đăng/lên lịch/lỗi, kèm chỉ số tương tác." },
      { file: "auto-approve-panel.tsx", type: "Cài đặt", purpose: "Bật/tắt tự động duyệt bài trước khi xuất bản." },
      { file: "smart-repost-tab.tsx", type: "Gợi ý", purpose: "Gợi ý đăng lại các bài đã xuất bản thành công có hiệu quả cao." },
    ],
  },
  {
    id: "catalog",
    code: "M02/M03",
    title: "Danh mục & Báo giá Thông minh",
    route: "/catalog",
    icon: Globe,
    description:
      "Catalog sản phẩm chuẩn mobile, bảng tính giá cấu thành và chia sẻ link catalog trực tuyến cho khách.",
    files: [
      { file: "catalog-guidance-card.tsx", type: "Guidance", purpose: "Hướng dẫn thiết lập giá động và chia sẻ link catalog trực tuyến." },
      { file: "product-detail-card.tsx", type: "Thẻ catalog", purpose: "Thẻ chi tiết sản phẩm catalog chuẩn mobile, kèm nút tạo đơn & chia sẻ." },
      { file: "quote-summary-card.tsx", type: "Bảng giá", purpose: "Thẻ bảng tính giá cấu thành: hoa, lá, công thợ, bao bì, biên lợi nhuận." },
    ],
  },
  {
    id: "crm",
    code: "M08",
    title: "Khách hàng & Chăm sóc Tự động",
    route: "/khach-hang",
    icon: Users,
    description:
      "Hồ sơ khách hàng VIP, gu màu sắc & lịch sử mua, nhắc ngày sinh nhật/kỷ niệm để chăm sóc chủ động.",
    files: [
      { file: "crm-guidance-card.tsx", type: "Guidance", purpose: "Hướng dẫn quản lý sở thích khách hàng và ngày kỷ niệm." },
      { file: "customer-profile-card.tsx", type: "Hồ sơ", purpose: "Thẻ hồ sơ khách hàng VIP: gu màu sắc, sản phẩm ưa thích, lịch sử mua." },
      { file: "event-reminder-card.tsx", type: "Nhắc lịch", purpose: "Thẻ nhắc ngày sinh nhật / kỷ niệm sắp tới kèm nút nhắn Zalo chăm sóc." },
    ],
  },
  {
    id: "orders",
    code: "M09",
    title: "Đơn hàng & Lệnh Xưởng hoa",
    route: "/don-hang",
    icon: ShoppingBag,
    description:
      "Phiếu lệnh gia công sản phẩm cho thợ và phiếu giao hàng A6 cho shipper, chuẩn hoá bàn giao từ đơn tới tận tay khách.",
    files: [
      { file: "order-guidance-card.tsx", type: "Guidance", purpose: "Hướng dẫn quy trình xử lý đơn hàng và bàn giao lệnh xưởng." },
      { file: "florist-ticket-card.tsx", type: "Phiếu xưởng", purpose: "Phiếu lệnh gia công sản phẩm cho thợ: định lượng nguyên liệu bắt buộc, ảnh mẫu, hạn giao." },
      { file: "delivery-receipt-card.tsx", type: "Phiếu in A6", purpose: "Phiếu giao hàng A6 cho shipper kèm thiệp chúc mừng in hoa mỹ." },
    ],
  },
  {
    id: "chat-assistant",
    code: "M10",
    title: "Trợ lý AI Chat Đa kênh",
    route: "/hoi-thoai",
    icon: Bot,
    description:
      "AI tự động tư vấn sản phẩm và chốt đơn 24/7, kèm cảnh báo chuyển nhân viên xử lý khi khách khiếu nại.",
    files: [
      { file: "chat-guidance-card.tsx", type: "Guidance", purpose: "Hướng dẫn trợ lý AI tự động tư vấn sản phẩm và chốt đơn 24/7." },
      { file: "chat-thread-card.tsx", type: "Hội thoại", purpose: "Khung hiển thị hội thoại khách - AI kèm thẻ gợi ý sản phẩm và nhập liệu." },
      { file: "human-takeover-banner.tsx", type: "Cảnh báo", purpose: "Banner cảnh báo nhân viên can thiệp xử lý khi khách khiếu nại." },
    ],
  },
  {
    id: "analytics",
    code: "M11",
    title: "Báo cáo Vận hành & Giám sát AI",
    route: "/so-lieu",
    icon: BarChart3,
    description:
      "Bảng chỉ số kinh doanh vàng (doanh thu, đơn hàng, tỷ lệ chuyển đổi, AOV) và giám sát ngân sách AI theo tháng.",
    files: [
      { file: "analytics-guidance-card.tsx", type: "Guidance", purpose: "Hướng dẫn giám sát chỉ số kinh doanh và kiểm soát ngân sách AI." },
      { file: "kpi-summary-card.tsx", type: "Chỉ số", purpose: "Thẻ tóm tắt 4 chỉ số vàng: doanh thu, đơn hàng, tỷ lệ chuyển đổi, AOV." },
      { file: "ai-credit-usage-card.tsx", type: "Giám sát", purpose: "Thẻ giám sát hạn mức tín dụng AI, cảnh báo khi vượt 80% hạn mức tháng." },
    ],
  },
  {
    id: "platform-connections",
    code: "P-Fix-5",
    title: "Kết nối Nền tảng",
    route: "/ket-noi",
    icon: Plug,
    description:
      "Quản lý kết nối tài khoản các nền tảng mạng xã hội: đăng nhập, kiểm tra, sửa hoặc ngắt kết nối.",
    files: [
      { file: "platform-account-card.tsx", type: "Thẻ kết nối", purpose: "Thẻ hiển thị 1 tài khoản nền tảng — trạng thái đăng nhập, lần đăng nhập gần nhất, nút kết nối/kiểm tra/sửa/ngắt kết nối." },
      { file: "connect-account-modal.tsx", type: "Modal", purpose: "Modal nhập thông tin đăng nhập/token để kết nối một nền tảng mới." },
    ],
  },
]

const TOTAL_FILES = CATEGORIES.reduce((sum, c) => sum + c.files.length, 0)

export default function KhoTemplatesPage() {
  const { ti } = useI18n()
  const [query, setQuery] = useState("")
  const [selectedFile, setSelectedFile] = useState<{ file: TemplateFile; category: TemplateCategory } | null>(null)

  // Override mô tả các category có thuật ngữ ngành
  const categoriesWithTerminology = useMemo(() => CATEGORIES.map((cat) => {
    if (cat.id === "product-analysis") {
      return {
        ...cat,
        description: `Tải ảnh ${ti("sampleProduct")}, AI nhận diện ${ti("rawMaterialItem")} & sinh nội dung bán hàng, tạo thẻ chào khách A6 và kịch bản tư vấn Zalo.`,
        files: cat.files.map((f) => {
          if (f.file === "m01a-guidance-card.tsx") return { ...f, purpose: `Hướng dẫn tải ảnh chụp ${ti("sampleProduct")} & nhận diện ${ti("rawMaterialItem")}.` }
          if (f.file === "commercial-content-card.tsx") return { ...f, purpose: `Thẻ nội dung bán hàng: tên gợi ý, câu chuyện ${ti("sampleProduct")}, phân khúc giá, lưu kho đã duyệt.` }
          return f
        }),
      }
    }
    if (cat.id === "creative-studio") {
      return {
        ...cat,
        description: `Tách nền ảnh ${ti("sampleProduct")}, ghép bối cảnh studio AI, chọn nhà cung cấp & chế độ tối ưu ảnh sản phẩm.`,
        files: cat.files.map((f) => {
          if (f.file === "creative-guidance-card.tsx") return { ...f, purpose: `Hướng dẫn tách nền ${ti("sampleProduct")} và ghép bối cảnh studio.` }
          return f
        }),
      }
    }
    return cat
  }), [ti])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return categoriesWithTerminology
    return categoriesWithTerminology.map((cat) => {
      const catMatches =
        cat.title.toLowerCase().includes(q) || cat.description.toLowerCase().includes(q)
      const files = catMatches
        ? cat.files
        : cat.files.filter(
            (f) =>
              f.file.toLowerCase().includes(q) ||
              f.purpose.toLowerCase().includes(q) ||
              f.type.toLowerCase().includes(q)
          )
      return { ...cat, files }
    }).filter((cat) => cat.files.length > 0)
  }, [query, categoriesWithTerminology])

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <LayoutTemplate size={22} strokeWidth={2} />
            </div>
            <div>
              <PageHeader
                title="Kho mẫu ấn phẩm"
                tip={<>Xem trước {TOTAL_FILES} mẫu trên {CATEGORIES.length} nhóm chức năng.</>}
              />
            </div>
          </div>

          <div className="relative sm:w-72">
            <Search
              size={15}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm template theo tên hoặc chức năng..."
              className="pl-9"
            />
          </div>
        </div>

        <FeatureGuidanceCard
          badgeLabel="Chỉ xem trước"
          icon={LayoutTemplate}
          title="Thư viện tra cứu trực quan — không chỉnh sửa tại đây"
          description="Mỗi thẻ dưới đây mô tả một khối giao diện (template) đang chạy thật trong hệ thống, xếp theo chức năng nghiệp vụ. Bấm “Mở màn hình” để dùng đúng template đó trong luồng nghiệp vụ thật."
          tips={["Chỉ xem, không chỉnh sửa được ở đây", "Nội dung lấy đúng theo tài liệu SSOT hệ thống"]}
        />

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface-alt/40 p-8 text-center text-body-sm text-text-muted">
            Không tìm thấy template nào khớp “{query}”.
          </div>
        )}

        <div className="space-y-8">
          {filtered.map((cat) => {
            const Icon = cat.icon
            return (
              <section key={cat.id} id={cat.id} className="scroll-mt-4">
                <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon size={19} strokeWidth={2} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-body font-bold text-text">{cat.title}</h2>
                        <span className="rounded-full bg-surface-alt px-2 py-0.5 text-caption font-semibold text-text-muted">
                          {cat.files.length} mẫu
                        </span>
                      </div>
                      <p className="mt-1 max-w-2xl text-meta leading-relaxed text-text-muted">
                        {cat.description}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={cat.route as never}
                    className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-primary px-3 py-2 text-meta font-bold text-white shadow-xs transition-colors hover:bg-primary/90 sm:self-center"
                  >
                    Mở màn hình
                    <ArrowUpRight size={14} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {cat.files.map((f) => {
                    const hasPreview = f.file in TEMPLATE_PREVIEW_REGISTRY
                    return (
                      <Button
                        key={f.file}
                        type="button"
                        variant="ghost"
                        onClick={() => hasPreview && setSelectedFile({ file: f, category: cat })}
                        disabled={!hasPreview}
                        className={`h-auto w-full rounded-xl border border-border bg-surface p-3 text-left justify-start items-stretch flex flex-col font-normal transition-colors ${
                          hasPreview
                            ? "cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02]"
                            : "cursor-default opacity-70 hover:bg-surface"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <code className="truncate text-caption font-bold text-text">{f.file}</code>
                          <span className="shrink-0 rounded-full bg-surface-alt px-1.5 py-0.5 text-caption font-bold tracking-wide text-text-muted uppercase">
                            {f.type}
                          </span>
                        </div>
                        <p className="mt-1.5 text-caption leading-relaxed text-text-muted">{f.purpose}</p>
                        {hasPreview && (
                          <div className="mt-2 flex items-center gap-1 text-caption font-semibold text-primary">
                            <Eye size={11} />
                            Xem trước mẫu
                          </div>
                        )}
                      </Button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </div>

      {selectedFile && SELF_MODAL_TEMPLATE_FILES.has(selectedFile.file.file) && (
        <>
          {TEMPLATE_PREVIEW_REGISTRY[selectedFile.file.file]}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setSelectedFile(null)}
            aria-label="Đóng xem trước"
            className="fixed right-5 top-5 z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-text shadow-lg transition-colors hover:bg-surface-alt"
          >
            <X size={18} />
          </Button>
        </>
      )}

      {selectedFile && !SELF_MODAL_TEMPLATE_FILES.has(selectedFile.file.file) && (
        <TemplatePreviewModal
          open={true}
          onClose={() => setSelectedFile(null)}
          fileName={selectedFile.file.file}
          fileType={selectedFile.file.type}
          purpose={selectedFile.file.purpose}
          wide={["schedule-calendar-card.tsx", "post-status-report-card.tsx", "multichannel-post-card.tsx", "platform-feed-preview.tsx"].includes(
            selectedFile.file.file
          )}
        >
          {TEMPLATE_PREVIEW_REGISTRY[selectedFile.file.file]}
        </TemplatePreviewModal>
      )}
    </div>
  )
}
