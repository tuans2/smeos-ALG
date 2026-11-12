"use client";

import { Button } from "@/components/ui/button"
import React from "react";
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { Video } from "@/components/ui/icon-set/video"
import { Image as ImageIcon } from "@/components/ui/icon-set/image"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Send } from "@/components/ui/icon-set/send"
;
import type { ProductContentReadiness } from "@/modules/market-intelligence/domain/product-intelligence-types";

interface ProductReadinessCardProps {
  readiness: ProductContentReadiness;
  onGoToVideo: () => void;
  onGoToMedia: () => void;
}

export function ProductReadinessCard({
  readiness,
  onGoToVideo,
  onGoToMedia,
}: ProductReadinessCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-text via-text to-text text-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-text/60 pb-3">
        <div>
          <h3 className="text-body-sm font-bold text-white flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            6. Đánh giá mức độ sẵn sàng tiếp thị
          </h3>
          <p className="text-caption text-text-muted">
            Hệ thống đã kiểm duyệt các tiêu chí kỹ thuật và định vị để sẵn sàng chuyển giao sang các xưởng sáng tạo
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 bg-success/20 text-success border border-success/30 px-3 py-1 rounded-full text-caption font-bold self-start sm:self-auto">
          <CheckCircle2 size={14} />
          Đủ điều kiện xuất bản
        </div>
      </div>

      {/* Grid Tiêu chí */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-caption">
        <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-center space-y-1">
          <span className="text-caption text-text-muted block">Nhận diện hoa</span>
          <span className="font-bold text-success flex items-center justify-center gap-1">
            <CheckCircle2 size={13} /> Hoàn tất
          </span>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-center space-y-1">
          <span className="text-caption text-text-muted block">Khớp xu hướng</span>
          <span className="font-bold text-success flex items-center justify-center gap-1">
            <CheckCircle2 size={13} /> Trend Fit Cao
          </span>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-center space-y-1">
          <span className="text-caption text-text-muted block">Khách hàng mục tiêu</span>
          <span className="font-bold text-success flex items-center justify-center gap-1">
            <CheckCircle2 size={13} /> Đã xác lập
          </span>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-center space-y-1">
          <span className="text-caption text-text-muted block">Định vị & Dịp tặng</span>
          <span className="font-bold text-success flex items-center justify-center gap-1">
            <CheckCircle2 size={13} /> Đã chuẩn hóa
          </span>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-center space-y-1">
          <span className="text-caption text-text-muted block">Chất lượng ảnh</span>
          <span className="font-bold text-success flex items-center justify-center gap-1">
            <CheckCircle2 size={13} /> Sắc nét (HD)
          </span>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-center space-y-1">
          <span className="text-caption text-text-muted block">Tiềm năng Video</span>
          <span className="font-bold text-success flex items-center justify-center gap-1">
            <CheckCircle2 size={13} /> Rất cao
          </span>
        </div>
      </div>

      {/* Action Handoffs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <span className="text-caption text-text-muted font-medium">
          🚀 Chuyển giao ngay sang các công cụ sáng tạo nội dung của ALG:
        </span>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline"
            type="button"
            onClick={onGoToMedia}
            className="h-auto flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-caption font-bold border border-white/15 transition"
          >
            <ImageIcon size={14} />
            Tạo ảnh biến thể marketing
          </Button>

          <Button variant="primary"
            type="button"
            onClick={onGoToVideo}
            className="h-auto flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-caption font-bold shadow-md transition"
          >
            <Video size={14} />
            Dựng video marketing tự động
          </Button>
        </div>
      </div>
    </div>
  );
}
