import React from "react"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Layers } from "@/components/ui/icon-set/layers"
import type { PartnerStoreProduction } from "@/modules/platform/domain/partner-marketplace.types"

interface MarketplaceCraftTabProps {
  production: PartnerStoreProduction
}

export function MarketplaceCraftTab({ production }: MarketplaceCraftTabProps) {
  return (
    <div className="space-y-6">
      {/* Main product line banner */}
      {production.mainProductLine && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <div>
              <div className="text-caption font-bold uppercase tracking-wider text-primary">
                Dòng Sản Phẩm Chủ Lực / Thế Mạnh Nhất
              </div>
              <div className="text-body-sm font-bold text-text mt-0.5">{production.mainProductLine}</div>
            </div>
          </div>
        </div>
      )}

      {/* Product Lines List */}
      <div className="rounded-xl border border-border p-4 space-y-3 bg-surface-alt/30">
        <h4 className="font-bold text-caption uppercase tracking-wider text-primary flex items-center gap-1.5">
          <Layers className="h-4 w-4" /> Các Dòng Sản Phẩm Hiện Đang Sản Xuất ({production.productLines.length})
        </h4>
        <div className="flex flex-wrap gap-2">
          {production.productLines.length > 0 ? (
            production.productLines.map((line, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-border text-caption font-medium text-text shadow-2xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" /> {line}
              </span>
            ))
          ) : (
            <span className="text-text-muted text-caption">Đang cập nhật danh mục sản phẩm</span>
          )}
        </div>
      </div>

      {/* Team, Capacity & Handling */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left column: Florist Team & Production Capacity */}
        <div className="rounded-xl border border-border p-4 space-y-3 bg-surface-alt/30">
          <h4 className="font-bold text-caption uppercase tracking-wider text-primary">
            Đội Ngũ Thợ Cắm & Năng Suất Sản Xuất
          </h4>
          <div className="space-y-2 text-caption">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-text-muted">Số lượng thợ / nhân sự:</span>
              <span className="font-bold text-text">{production.floristCount || "Chưa rõ"} người</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-text-muted">Kinh nghiệm thợ chính:</span>
              <span className="font-medium text-text">{production.leadFloristExperience || "---"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-text-muted">Công suất ngày thường:</span>
              <span className="font-medium text-text">{production.maxCapacityNormal || "---"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-text-muted">Công suất dịp lễ / cao điểm:</span>
              <span className="font-medium text-text">{production.maxCapacityPeak || "---"}</span>
            </div>
            <div className="py-1">
              <span className="text-text-muted block mb-0.5">Xử lý hoa cận date / tồn kho:</span>
              <span className="font-medium text-text">{production.nearExpireHandling || "---"}</span>
            </div>
          </div>
        </div>

        {/* Right column: Flower Sourcing & Storage Quality */}
        <div className="rounded-xl border border-border p-4 space-y-3 bg-surface-alt/30">
          <h4 className="font-bold text-caption uppercase tracking-wider text-primary">
            Nguồn Cung Ứng & Quy Trình Bảo Quản
          </h4>
          <div className="space-y-2 text-caption">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-text-muted">Nguồn cung cấp chính:</span>
              <span className="font-medium text-text">
                {production.mainFlowerSource || production.flowerSupply || "---"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-text-muted">Tần suất nhập hàng / nguyên liệu:</span>
              <span className="font-medium text-text">{production.importFrequency || "---"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-text-muted">Khả năng nhập hoa hiếm/theo yêu cầu:</span>
              <span className="font-medium text-text">{production.rareFlowerAbility || "Có thể"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-text-muted">Thời gian giữ độ tươi của hoa:</span>
              <span className="font-medium text-text">{production.freshnessDuration || "---"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-text-muted">Tỷ lệ hao hụt ước tính:</span>
              <span className="font-semibold text-warning-text">
                {production.lossRateEstimate || "---"}
              </span>
            </div>
            <div className="py-1">
              <span className="text-text-muted block mb-0.5">Quy trình kiểm tra hoa đầu vào:</span>
              <span className="font-medium text-text">{production.inboundProcess || "Kiểm tra trực tiếp khi giao"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

