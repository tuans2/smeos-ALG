"use client"

import React, { useState } from "react"
import { HelpCircle, BookOpen, Shield, Users, Sparkles } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"

type RoleGuideTab = "admin" | "sales" | "coordinator"

export function BrochureUserGuideModal() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<RoleGuideTab>("admin")
  const { ti } = useI18n()

  return (
    <>
      <Button variant="outline"
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className={cn(
          "inline-flex h-11 items-center gap-1.5 rounded-xl border px-3 text-caption font-bold transition-all",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          open
            ? "border-border bg-surface text-primary shadow-xs"
            : "border-border bg-surface-alt text-text-muted hover:bg-surface hover:text-text active:bg-surface active:text-primary",
        )}
        title="Hướng dẫn dùng bộ sưu tập riêng"
      >
        <HelpCircle size={16} className={open ? "text-primary" : "text-text-muted"} aria-hidden="true" />
        <span className="hidden sm:inline">Hướng dẫn</span>
      </Button>

      {open && (
        <Dialog open onOpenChange={(o) => { if (!o) setOpen(false) }} size="lg"
          title={<span className="flex items-center gap-2"><BookOpen size={20} className="text-primary" />Hướng dẫn Bộ sưu tập riêng</span>}>
          <div className="-m-5 sm:-m-6 flex flex-col">
            {/* Role Tabs */}
            <div className="flex border-b border-border bg-surface-alt px-5 pt-2">
              <Button variant="ghost"
                type="button"
                onClick={() => setActiveTab("admin")}
                className={`h-auto flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-body-sm font-bold transition-colors ${
                  activeTab === "admin"
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                <Shield size={16} />
                <span>Điều hành và kế toán</span>
              </Button>
              <Button variant="ghost"
                type="button"
                onClick={() => setActiveTab("sales")}
                className={`h-auto flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-body-sm font-bold transition-colors ${
                  activeTab === "sales"
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                <Users size={16} />
                <span>Nhân viên bán hàng</span>
              </Button>
              <Button variant="ghost"
                type="button"
                onClick={() => setActiveTab("coordinator")}
                className={`h-auto flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-body-sm font-bold transition-colors ${
                  activeTab === "coordinator"
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                <Sparkles size={16} />
                <span>Điều phối & {ti("makerTitle")}</span>
              </Button>
            </div>

            {/* Nội dung chi tiết theo tab */}
            <div className="flex-1 overflow-y-auto p-5 text-body-sm text-text space-y-4">
              {activeTab === "admin" && (
                <div className="flex flex-col gap-3">
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-1.5">
                    <h4 className="font-extrabold text-primary flex items-center gap-1.5">
                      <Shield size={16} /> Quản trị tài chính & Kiểm soát thanh toán
                    </h4>
                    <p className="text-caption text-text-muted leading-relaxed">
                      Cổng thanh toán là chốt chặn cứng: Khi khách gửi đơn và báo chuyển khoản, nút &quot;Theo dõi tiến độ&quot; trên màn hình khách sẽ ở trạng thái vô hiệu hóa. Chỉ khi Điều hành kiểm tra tài khoản và bấm <strong>&quot;Xác nhận tiền về&quot;</strong>, nút này mới được kích hoạt sáng lên cho khách.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-surface-alt p-4 flex flex-col gap-2">
                    <h4 className="font-extrabold text-text">Quy trình Điều hành cần nắm:</h4>
                    <ul className="list-disc list-inside space-y-1.5 text-caption sm:text-body-sm text-text-muted">
                      <li><strong>Duyệt thanh toán tiền về:</strong> Vào tab Điều hành để đối soát các đơn khách báo chuyển khoản. Bấm xác nhận để đơn tự động chuyển vào hàng đợi {ti("makerAction").toLowerCase()} của xưởng.</li>
                      <li><strong>Xử lý đề xuất Hủy / Hoàn tiền:</strong> Sale hoặc Điều phối chỉ có quyền đề xuất; Điều hành là người quyết định cuối cùng (Approve/Reject). Hệ thống lưu vết đầy đủ lý do và người duyệt.</li>
                      <li><strong>Giải quyết tranh chấp nhờ Lịch sử đơn hàng:</strong> Nhấp vào bất kỳ đơn hàng nào để mở cửa sổ chi tiết → chọn tab <em>&quot;Lịch sử đơn hàng&quot;</em>. Tại đây có đủ thời điểm khách chọn mẫu, chấp nhận thỏa thuận, ảnh thành phẩm khách duyệt, ảnh giao nhận tận tay. Bấm <em>&quot;Sao chép tóm tắt đối soát&quot;</em> để gửi khách qua Zalo.</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === "sales" && (
                <div className="flex flex-col gap-3">
                  <div className="rounded-2xl border border-info/20 bg-info-bg/10 p-4 flex flex-col gap-1.5">
                    <h4 className="font-extrabold text-info flex items-center gap-1.5">
                      <Users size={16} /> Quy trình Sale & Theo dõi khách hàng 9 bước
                    </h4>
                    <p className="text-caption text-text-muted leading-relaxed">
                      Bảng Kanban của Sale đồng bộ 100% với 9 bước chuẩn của tab Theo dõi tiến độ. Mọi link chào do bạn sao chép gửi khách sẽ tự động gắn <strong>Mã nhân viên phụ trách</strong> của bạn để tính hoa hồng doanh số.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-surface-alt p-4 flex flex-col gap-2">
                    <h4 className="font-extrabold text-text">Kỹ năng vận hành cho Sale:</h4>
                    <ul className="list-disc list-inside space-y-1.5 text-caption sm:text-body-sm text-text-muted">
                      <li><strong>Xem nhanh mốc giờ giao hàng:</strong> Mỗi thẻ đơn trên Kanban hiển thị khung giờ giao to, đậm (ví dụ: <em>10:00 - 12:00</em>) và được sắp xếp ưu tiên đơn giao sớm nhất lên đầu để bạn dễ theo sát.</li>
                      <li><strong>Click vào thẻ đơn để xem toàn bộ thông tin:</strong> Xem người đặt, người nhận, số điện thoại, địa chỉ cụ thể, lời nhắn và {ti("sampleProduct").toLowerCase()} đã chọn mà không cần hỏi lại khách.</li>
                      <li><strong>Chủ động gỡ kẹt:</strong> Thẻ có huy hiệu đỏ &quot;Cần bạn&quot; (khách mở link chưa chọn, bỏ dở điền form, chưa chuyển khoản) cần bạn bấm nút <em>Gọi</em> hoặc <em>Zalo</em> ngay trên thẻ để hỗ trợ khách kịp thời.</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === "coordinator" && (
                <div className="flex flex-col gap-3">
                  <div className="rounded-2xl border border-success/20 bg-success-bg/10 p-4 flex flex-col gap-1.5">
                    <h4 className="font-extrabold text-success flex items-center gap-1.5">
                      <Sparkles size={16} /> Vận hành chế tác & Nghiệm thu chất lượng
                    </h4>
                    <p className="text-caption text-text-muted leading-relaxed">
                      Bảng Kanban Điều phối phân nhóm 6 cột công đoạn xưởng, tự động sắp xếp đơn có giờ giao sớm nhất lên đầu để thợ ưu tiên hoàn thiện kịp hẹn cho khách.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-surface-alt p-4 flex flex-col gap-2">
                    <h4 className="font-extrabold text-text">Quy trình xưởng & Bàn giao:</h4>
                    <ul className="list-disc list-inside space-y-1.5 text-caption sm:text-body-sm text-text-muted">
                      <li><strong>Xem chi tiết {ti("productRecipe").toLowerCase()}:</strong> Click vào thẻ đơn hàng trên Kanban để xem ảnh {ti("sampleProduct").toLowerCase()} to rõ, ghi chú đơn và lời nhắn để chuẩn bị đúng quy cách và phụ liệu.</li>
                      <li><strong>Nghiệm thu ảnh & Đồng hồ đếm ngược:</strong> Khi {ti("makerAction").toLowerCase()} xong, tải {ti("completedProductPhoto").toLowerCase()} lên hệ thống. Khách có 10 phút đếm ngược trực tiếp trên link để duyệt ảnh. Hết 10 phút hệ thống tự động xác nhận để bạn bàn giao cho shipper kịp giờ.</li>
                      <li><strong>Xử lý khẩn cấp (Giao gấp):</strong> Trường hợp khách cần gấp hoặc sự kiện diễn ra ngay, Điều phối có thể bấm <em>&quot;Bỏ qua ảnh&quot;</em> để chuyển thẳng sang giao hàng. Hệ thống sẽ ghi nhận trạng thái &quot;Skipped&quot; minh bạch.</li>
                      <li><strong>Hoàn tất & Màn hình Cảm ơn:</strong> Khi shipper giao hàng thành công và tải ảnh người nhận, đơn chuyển sang trạng thái Hoàn tất. Khách hàng sẽ thấy Màn hình Cảm ơn với các nút Xem lại đơn, Xem bằng chứng tiến độ và Đặt đơn mới.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="flex items-center justify-between border-t border-border bg-surface-alt p-4">
              <span className="text-caption text-text-muted">
                Hệ thống Ấn phẩm & {ti("sampleProduct")} · Chuẩn hóa quy trình ALG
              </span>
              <Button type="button" onClick={() => setOpen(false)} className="h-9 px-5 text-caption font-bold">
                Đã hiểu
              </Button>
            </footer>
          </div>
        </Dialog>
      )}
    </>
  )
}
