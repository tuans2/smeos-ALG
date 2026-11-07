"use client";

/**
 * Creative Handoff Modal — Chặng 5 CHOOSE (FloraOS Design System Standard).
 *
 * Hiển thị overlay modal trên /thi-truong và /tai-anh để user:
 * 1. Xem lại topic đã chọn từ Chặng 04 (tiêu đề, hook, CTA, nhãn nghiệp vụ Việt hóa chuẩn)
 * 2. Xác nhận sản phẩm từ Chặng 01-02
 * 3. Chọn mode sản xuất: Sáng tạo AI (CREATIVE) hoặc Mộc & Chân thật (AUTHENTIC)
 * 4. Chọn phân hệ đích đến trong Creative Studio: Kịch bản (B), Ảnh AI (D), Video (E), Gói chiến dịch (F)
 * 5. Chọn loại đầu vào (nếu có video): Ảnh, Video, Cả hai
 * 6. Chuyển sang Creative Studio với đầy đủ URL params + sessionStorage report
 *
 * Tuân thủ nghiêm ngặt:
 * - Anti-Keyword-Dumping: Tuyệt đối không render raw enum (PRODUCT_SHOWCASE, REELS_TIKTOK_9_16)
 * - Mộc Lan FloraOS Design System: Primary #7A2E42, Sage #52643F, Gold #C89B3C, Stone neutrals
 * - Hành trình 14 bước Product-to-Market SSOT: Chặng 05 CHOOSE
 */

import { Dialog } from "@/components/ui/dialog"
import React, { useState, useMemo, useEffect } from "react";
import { ProviderSelect } from "@/components/creative-studio/provider-select";
import { useRouter } from "next/navigation";
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Leaf } from "@/components/ui/icon-set/leaf"
import { Image as ImageIcon } from "@/components/ui/icon-set/image"
import { Video } from "@/components/ui/icon-set/video"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Quote } from "@/components/ui/icon-set/quote"
import { Target } from "@/components/ui/icon-set/target"
import { FileText } from "@/components/ui/icon-set/file-text"
import { Package } from "@/components/ui/icon-set/package"
import { Wand2 } from "@/components/ui/icon-set/wand2"
import { Check } from "@/components/ui/icon-set/check"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
;
import { Button } from "@/components/ui/button";
import { buildHandoffSearchParams } from "@/modules/creative-production/domain/build-handoff-url";
import {
  DEFAULT_PRODUCTION_SCOPE,
  ProductionScopePicker,
  type ProductionScope,
} from "@/components/creative-studio/production-scope-picker";
import { ProductionPlanPreview } from "@/components/creative-studio/production-plan-preview";
import {
  passportFromReport,
  RULE_PLAN_REF,
  writeScenePlan,
  type LoadedScenePlan,
} from "@/components/creative-studio/scene-plan-client";
import type {
  ConcreteTopic,
  ProductIntelligenceReport,
  TopicAngleCategory,
} from "@/modules/market-intelligence/domain/product-intelligence-types";
import { safeImageSrc } from "@/lib/safe-image-src"

export type ProductionMode = "CREATIVE" | "AUTHENTIC";
export type SourceType = "image" | "video" | "both";
export type CreativeTargetArea = "b" | "d" | "e" | "f";

export interface CreativeHandoffModalProps {
  /** Trạng thái mở modal */
  open: boolean;
  /** Callback đóng modal */
  onClose: () => void;

  // --- Dữ liệu carry-forward từ Chặng 1-4 ---
  /** Topic user đã chọn ở Chặng 04 */
  selectedTopic: ConcreteTopic;
  /** Tên sản phẩm (Chặng 02) */
  productName: string;
  /** URL ảnh sản phẩm (Chặng 01) */
  sourceImageUrl: string;
  /** Phân hệ đích đến mong muốn (b: Content, d: Image Studio, e: Video Studio, f: Campaign Package) */
  targetArea?: string | undefined;
  /** Asset ID (nếu có) */
  assetId?: string | undefined;
  /** Product ID (nếu có) */
  productId?: string | undefined;
  /** URL video gốc (nếu user upload) */
  sourceVideoUrl?: string | undefined;
  /** Report đầy đủ (Chặng 02-04) — serialize vào sessionStorage */
  report?: ProductIntelligenceReport | null | undefined;
  /** Phạm vi sản xuất đã chọn cuối Chặng 04 — sửa tiếp được ở đây (kèm `onScopeChange` = điều khiển từ ngoài). */
  initialScope?: ProductionScope | undefined;
  /** Báo phạm vi mới về Chặng 04 (giữ đồng bộ hai nơi). */
  onScopeChange?: ((scope: ProductionScope) => void) | undefined;
}

// Bảng ánh xạ nhãn góc tiếp cận sang tiếng Việt thanh lịch (Anti-Keyword-Dumping)
const ANGLE_LABELS: Record<string, { label: string; colorClass: string }> = {
  PRODUCT_SHOWCASE: {
    label: "Giới thiệu sản phẩm & Giá",
    colorClass: "bg-info-bg text-info-text border-info-border",
  },
  EDUCATIONAL: {
    label: "Chia sẻ bí quyết & Cẩm nang",
    colorClass: "bg-success-bg text-success-text border-success-border",
  },
  PROBLEM_SOLUTION: {
    label: "Gỡ rối tình huống tặng quà",
    colorClass: "bg-warning-bg text-warning-text border-warning-border",
  },
  EMOTIONAL: {
    label: "Chạm cảm xúc & Tình cảm",
    colorClass: "bg-primary-muted text-primary border-primary-border",
  },
  TREND: {
    label: "Bắt sóng trào lưu thịnh hành",
    colorClass: "bg-accent-bg text-accent-text border-accent-border",
  },
  PRICE_VALUE: {
    label: "Phân khúc giá & Giá trị",
    colorClass: "bg-info-bg text-info-text border-info-border",
  },
};

// Bảng ánh xạ định dạng nội dung sang tiếng Việt dễ hiểu
const FORMAT_LABELS: Record<string, string> = {
  REELS_TIKTOK_9_16: "Video dọc 9:16 (TikTok/Reels)",
  CAROUSEL_PHOTO_1_1: "Bộ ảnh vuông 1:1 (Carousel)",
  STORY_DAILY: "Tin hàng ngày (Story 24h)",
};

const MODE_OPTIONS: Array<{
  value: ProductionMode;
  label: string;
  badge: string;
  icon: typeof Sparkles;
  tagline: string;
  description: string;
  activeBorder: string;
  activeBg: string;
  badgeClass: string;
}> = [
  {
    value: "CREATIVE",
    label: "Sáng tạo AI",
    badge: "✨ AI Biến hóa",
    icon: Sparkles,
    tagline: "Đột phá & Lan tỏa",
    description: "Ghép bối cảnh Studio AI, cung kịch bản 5 nhịp, video viral tự động",
    activeBorder: "border-primary ring-2 ring-primary/15",
    activeBg: "bg-gradient-to-br from-primary-muted/80 to-white",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
  },
  {
    value: "AUTHENTIC",
    label: "Mộc & Chân thật",
    badge: "🌿 Giữ nguyên vẹn",
    icon: Leaf,
    tagline: "Tự nhiên & Thật thà",
    description: "Giữ 100% ảnh chụp gốc xưởng hoa, giọng đọc mộc mạc, trải nghiệm thật",
    activeBorder: "border-[var(--color-secondary-text)] ring-2 ring-[var(--color-secondary-text)]/15",
    activeBg: "bg-gradient-to-br from-[var(--color-sage-bg)] to-white",
    badgeClass: "bg-[var(--color-success-bg)] text-[var(--color-secondary-text)] border-[var(--color-secondary-text)]/20",
  },
];

const TARGET_AREAS: Array<{
  id: CreativeTargetArea;
  label: string;
  icon: typeof FileText;
  description: string;
}> = [
  { id: "b", label: "Kịch bản & Bài viết", icon: FileText, description: "Viết kịch bản và bài đăng" },
  { id: "d", label: "Studio Ảnh AI", icon: Wand2, description: "Tạo ảnh sản phẩm bằng AI" },
  { id: "e", label: "Studio Video", icon: Video, description: "Dựng video ngắn" },
  { id: "f", label: "Gói Chiến dịch", icon: Package, description: "Gói nội dung cho cả chiến dịch" },
];

const SOURCE_OPTIONS: Array<{
  value: SourceType;
  label: string;
  icon: typeof ImageIcon;
}> = [
  { value: "image", label: "Ảnh sản phẩm", icon: ImageIcon },
  { value: "video", label: "Video sản phẩm", icon: Video },
  { value: "both", label: "Cả Ảnh & Video", icon: Sparkles },
];

export function CreativeHandoffModal({
  open,
  onClose,
  selectedTopic,
  productName,
  sourceImageUrl,
  targetArea: initialTargetArea,
  assetId,
  productId,
  sourceVideoUrl,
  report,
  initialScope,
  onScopeChange,
}: CreativeHandoffModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<ProductionMode>("CREATIVE");
  const [selectedArea, setSelectedArea] = useState<CreativeTargetArea>(() => {
    const a = initialTargetArea?.toLowerCase();
    if (a === "d" || a === "e" || a === "f") return a as CreativeTargetArea;
    return "b";
  });
  const [sourceType, setSourceType] = useState<SourceType>(
    sourceVideoUrl ? "both" : "image"
  );

  // Sync khi prop initialTargetArea thay đổi
  useEffect(() => {
    if (initialTargetArea) {
      const a = initialTargetArea.toLowerCase();
      if (a === "d" || a === "e" || a === "f" || a === "b") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ khu vực đích khi prop đổi
        setSelectedArea(a as CreativeTargetArea);
      }
    }
  }, [initialTargetArea]);

  // Đóng modal bằng phím ESC
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const hasVideo = Boolean(sourceVideoUrl);

  // Nhãn góc tiếp cận đã chuẩn hóa
  const angleInfo = useMemo(() => {
    const key = selectedTopic.angleCategory || "PRODUCT_SHOWCASE";
    return (
      ANGLE_LABELS[key] || {
        label: key.replace(/_/g, " "),
        colorClass: "bg-surface-alt text-text border-border",
      }
    );
  }, [selectedTopic.angleCategory]);

  // Nhãn định dạng đã chuẩn hóa
  const formatLabel = useMemo(() => {
    const key = selectedTopic.format || "REELS_TIKTOK_9_16";
    return FORMAT_LABELS[key] || key.replace(/_/g, " ");
  }, [selectedTopic.format]);

  // 22/09/2026 (nợ #118): không còn nhét ảnh/report vào query string hay
  // sessionStorage — sự cố gốc của nút "Bắt đầu sáng tạo". URL chỉ mang
  // `report.id` (nếu có, để Creative Studio tự tải lại report qua
  // `GET /api/v1/product-intelligence/:id`) và `assetId` (để tự ký lại URL
  // ảnh qua `GET /api/v1/assets/:id/view-url`). Xem `build-handoff-url.ts`.
  const [handoffError, setHandoffError] = useState<string | null>(null);
  // Bên viết kịch bản cho lượt này — "" = theo thứ tự nhà cung cấp của tiệm.
  const [contentProvider, setContentProvider] = useState<string>("");

  // Chặn cứng: không có assetId (ảnh chưa lưu vào kho) thì không có gì để
  // bàn giao an toàn — nút bên dưới bị khoá kèm lý do rõ ràng.
  const canStart = Boolean(assetId && assetId.trim());

  // 24/09/2026 (PO): kịch bản bối cảnh (Narrative Arc hình ảnh) sinh NGAY khi
  // chốt chủ đề ở Chặng 05 — Khu vực B/C/D/E đọc lại đúng kịch bản này qua
  // `scenePlanId`, không bắt người dùng viết lại ở từng khu vực. Khoá cố định
  // theo ảnh + chủ đề + mode: chọn lại cùng chủ đề không trừ credit lần hai.
  const [writingPlan, setWritingPlan] = useState(false);
  const [planFailed, setPlanFailed] = useState(false);
  // v2 (24/09/2026, PO): chọn NỀN TẢNG ĐĂNG → khung hình + khuôn video của cả
  // bộ tài sản; kịch bản sản xuất tổng hiện để xem/sửa TRƯỚC khi vào Studio.
  // PO 24/09/2026 tối: phạm vi (nền tảng + loại kết quả) chọn cuối Chặng 04,
  // sửa tiếp được ở đầu Chặng 05; chỉ sản xuất đúng những gì đã chọn.
  // Có `onScopeChange` = Chặng 04 giữ state (điều khiển từ ngoài); không có thì modal tự giữ.
  const [scopeState, setScopeState] = useState<ProductionScope>(initialScope ?? DEFAULT_PRODUCTION_SCOPE);
  const scope = onScopeChange && initialScope ? initialScope : scopeState;
  const setScope = (next: ProductionScope) => {
    if (onScopeChange) onScopeChange(next);
    else setScopeState(next);
  };
  const [preview, setPreview] = useState<LoadedScenePlan | null>(null);

  const goToStudio = (scenePlanId: string | null) => {
    const params = buildHandoffSearchParams({
        // report.id (đã được analyzeProductIntelligence ghi đè thành id thật
        // của product_analysis_runs khi lưu thành công) đóng vai "run id".
        // Không có report thì dùng chính selectedTopic.id (tương thích lối
        // vào không qua Product Intelligence).
        runOrTopicId: report?.id || selectedTopic.id,
        selectedTopicId: selectedTopic.id,
        mode,
        source: sourceType,
        assetId: assetId!,
        productName,
        productId,
        area: selectedArea,
        platforms: scope.platforms,
        outputs: scope.outputs,
      });
    if (scenePlanId) params.set("scenePlanId", scenePlanId);
    router.push(`/creative-studio?${params.toString()}` as never);
  };

  const handleStart = async (fresh = false) => {
    setHandoffError(null);
    setWritingPlan(true);
    try {
      // Trùng khoá (cùng ảnh + chủ đề + mode) trả kịch bản cũ; nếu phạm vi
      // khác thì `writeScenePlan` tự sửa phạm vi tại chỗ (miễn phí).
      const loaded = await writeScenePlan(
        {
          mode,
          productName,
          productId,
          assetId,
          selectedTopic,
          commercialPassport: passportFromReport(report),
          platforms: scope.platforms,
          outputs: scope.outputs,
        },
        planFailed || fresh,
        contentProvider || undefined
      );
      setPreview(loaded);
    } catch (err) {
      setPlanFailed(true);
      setHandoffError(
        `AI chưa viết được kịch bản bối cảnh: ${
          err instanceof Error ? err.message : "lỗi không xác định"
        }. Bấm lại để thử lần nữa, hoặc tiếp tục với kịch bản cơ bản (miễn phí).`
      );
    } finally {
      setWritingPlan(false);
    }
  };

  const handleStartWithRulePlan = () => {
    setHandoffError(null);
    try {
      goToStudio(RULE_PLAN_REF);
    } catch (err) {
      setHandoffError(err instanceof Error ? err.message : "Không thể chuyển sang Creative Studio — vui lòng thử lại.");
    }
  };

  if (!open) return null;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }} size="md"
      title="Chọn định hướng sáng tạo chiến dịch"
      description="Xác nhận chủ đề truyền thông & chế độ sản xuất trước khi vào Creative Studio">
      <div className="-m-5 sm:-m-6 flex flex-col">
        {/* ── Modal Body (Scrollable) ── */}
        <div className="px-6 py-4 flex flex-col gap-4 overflow-y-auto no-scrollbar">
          {preview ? (
            <ProductionPlanPreview loaded={preview} onChange={setPreview} />
          ) : (
          <>
          {/* 1. Thẻ Chủ Đề Đã Chọn */}
          <div className="rounded-xl border border-primary-border/80 bg-primary-muted/40 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-caption font-bold uppercase tracking-wider text-primary">
                Chủ đề đã chọn (Chặng 04)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-primary-border text-caption font-semibold text-primary shadow-xs">
                🎬 {formatLabel}
              </span>
            </div>

            <h3 className="text-body font-bold text-text leading-snug">
              {selectedTopic.title}
            </h3>

            {selectedTopic.hook && (
              <div className="flex items-start gap-2 rounded-lg bg-white/80 border border-primary-border p-2.5">
                <Quote size={13} className="text-primary/60 mt-0.5 flex-shrink-0" />
                <p className="text-meta italic text-text leading-relaxed">
                  &ldquo;{selectedTopic.hook}&rdquo;
                </p>
              </div>
            )}

            {/* Badges row — Clean phrasing */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md border text-caption font-semibold ${angleInfo.colorClass}`}
              >
                {angleInfo.label}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-border bg-bg text-text text-caption font-medium">
                {formatLabel}
              </span>
            </div>

            {selectedTopic.cta && (
              <div className="flex items-center gap-2 rounded-lg bg-[var(--color-sage-bg)] border border-[var(--color-secondary-text)]/20 px-3 py-1.5">
                <Target size={12} className="text-[var(--color-secondary-text)] flex-shrink-0" />
                <span className="text-caption font-semibold text-[var(--color-secondary-text)]">
                  CTA: {selectedTopic.cta}
                </span>
              </div>
            )}
          </div>

          {/* 2. Thẻ Sản Phẩm Liên Kết */}
          <div className="flex items-center gap-3.5 rounded-xl border border-border bg-bg/60 p-3">
            {sourceImageUrl ? (
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-white">
                <img
                  src={safeImageSrc(sourceImageUrl)}
                  alt={productName}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-surface-alt text-text-muted">
                <ImageIcon size={20} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-bold text-text truncate">
                {productName}
              </p>
              <p className="text-caption text-text-muted mt-0.5 flex items-center gap-1.5">
                <span>📸 Dữ liệu thị giác Chặng 01–02</span>
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-success-bg border border-success-border px-2 py-0.5">
              <CheckCircle2 size={11} className="text-success" />
              <span className="text-caption font-semibold text-success-text">Đã khớp</span>
            </div>
          </div>

          {/* 3. Loại Hình Sản Xuất */}
          <div>
            <label className="text-caption font-bold uppercase tracking-wider text-text block mb-2">
              Loại hình sản xuất
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {MODE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = mode === opt.value;
                return (
                  <Button variant="ghost"
                    key={opt.value}
                    type="button"
                    onClick={() => setMode(opt.value)}
                    className={`text-[length:inherit] relative flex h-auto flex-col items-stretch justify-start gap-0 font-[inherit] p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? `${opt.activeBorder} ${opt.activeBg} shadow-xs`
                        : "border-border bg-white hover:border-border hover:bg-bg/50"
                    }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                            isSelected ? "bg-white shadow-xs" : "bg-surface-alt"
                          }`}
                        >
                          <Icon
                            size={14}
                            className={isSelected ? "text-primary" : "text-text-muted"}
                          />
                        </div>
                        <span className="text-meta font-bold text-text">
                          {opt.label}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <span
                      className={`inline-block w-fit px-1.5 py-0.5 rounded text-caption font-bold border mb-1.5 ${opt.badgeClass}`}
                    >
                      {opt.badge}
                    </span>
                    <p className="text-caption text-text-muted leading-relaxed">
                      {opt.description}
                    </p>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* 3b. Phạm vi sản xuất — nền tảng + loại kết quả (PO 24/09/2026) */}
          <div>
            <label className="text-caption font-bold uppercase tracking-wider text-text block mb-2">
              Phạm vi sản xuất
            </label>
            <ProductionScopePicker value={scope} onChange={setScope} compact />
          </div>

          {/* 4. Chọn Phân Hệ Đích Đến (Direct Jump) */}
          <div>
            <label className="text-caption font-bold uppercase tracking-wider text-text block mb-2">
              Đích đến trực tiếp trong Creative Studio
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TARGET_AREAS.map((area) => {
                const Icon = area.icon;
                const isSelected = selectedArea === area.id;
                return (
                  <Button variant="outline"
                    key={area.id}
                    type="button"
                    onClick={() => setSelectedArea(area.id)}
                    className={`text-[length:inherit] h-auto gap-0 flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? "border-primary bg-primary-muted/70 text-primary font-bold ring-1 ring-primary/20 shadow-xs hover:bg-primary-muted/70"
                        : "border-border bg-white text-text hover:border-border hover:bg-bg"
                    }`}
                  >
                    <Icon size={16} className={isSelected ? "text-primary" : "text-text-muted"} />
                    <span className="text-caption mt-1 font-semibold leading-tight">
                      {area.label}
                    </span>
                    <span className="text-caption text-text-muted mt-0.5">
                      {area.description}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* 5. Đầu Vào Sáng Tạo (chỉ hiện khi có video) */}
          {hasVideo && (
            <div>
              <label className="text-caption font-bold uppercase tracking-wider text-text block mb-2">
                Nguồn media đầu vào
              </label>
              <div className="flex gap-2">
                {SOURCE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = sourceType === opt.value;
                  return (
                    <Button variant="outline"
                      key={opt.value}
                      type="button"
                      onClick={() => setSourceType(opt.value)}
                      className={`h-auto flex flex-1 items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-caption font-semibold transition ${
                        isSelected
                          ? "border-primary bg-primary text-white shadow-xs hover:bg-primary"
                          : "border-border bg-white text-text hover:bg-bg"
                      }`}
                    >
                      <Icon size={14} />
                      {opt.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
          </>
          )}
        </div>

        {/* ── Footer ── */}
        {(!canStart || handoffError) && (
          <div className="flex items-start gap-2 px-6 py-2.5 border-t border-warning-border bg-warning-bg/70 text-caption text-warning-text">
            <AlertTriangle size={14} className="text-warning-text mt-0.5 flex-shrink-0" />
            <span>
              {!canStart
                ? "Ảnh chưa được lưu vào kho — quay lại Chặng 01 và tải lại ảnh trước khi sáng tạo."
                : handoffError}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border bg-bg/80">
          <div className="flex items-center gap-2 text-caption text-text-muted">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-bg text-success-text">
              <CheckCircle2 size={12} />
            </span>
            <span className="font-semibold text-text">Chặng 01–04 hoàn tất</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline"
              type="button"
              onClick={onClose}
              className="h-auto gap-0 px-3 py-1.5 rounded-lg border border-border text-caption font-semibold text-text-muted hover:bg-white transition"
            >
              Hủy
            </Button>
            {preview ? (
              <>
                <Button variant="outline"
                  type="button"
                  onClick={() => setPreview(null)}
                  className="h-auto gap-0 px-3 py-1.5 rounded-lg border border-border text-caption font-semibold text-text hover:bg-white transition"
                >
                  ← Chỉnh lựa chọn
                </Button>
                <Button variant="outline"
                  type="button"
                  onClick={() => void handleStart(true)}
                  disabled={writingPlan}
                  className="h-auto gap-0 px-3 py-1.5 rounded-lg border border-border text-caption font-semibold text-text hover:bg-white transition disabled:opacity-50"
                >
                  {writingPlan ? "Đang viết lại..." : "↻ AI viết lại (1 credit)"}
                </Button>
                <Button
                  onClick={() => goToStudio(preview.jobId ?? RULE_PLAN_REF)}
                  className="gap-1.5 bg-primary hover:bg-primary-dark text-white text-caption font-bold px-4 py-2 shadow-xs"
                >
                  Dùng kịch bản này · vào Creative Studio
                  <ArrowRight size={14} />
                </Button>
              </>
            ) : (
              <>
            <div className="w-full sm:w-64">
              <ProviderSelect kind="content" value={contentProvider} onChange={setContentProvider} label="AI viết kịch bản" disabled={writingPlan} />
            </div>
                        {planFailed && (
              <Button variant="outline"
                type="button"
                onClick={handleStartWithRulePlan}
                disabled={!canStart || writingPlan}
                className="h-auto gap-0 px-3 py-1.5 rounded-lg border border-border text-caption font-semibold text-text hover:bg-white transition disabled:opacity-50"
              >
                Dùng kịch bản cơ bản
              </Button>
            )}
            <Button
              onClick={() => void handleStart()}
              disabled={!canStart || writingPlan}
              title="AI viết kịch bản bối cảnh cho chủ đề này (1 credit, chỉ tính lần đầu) rồi mở Creative Studio"
              className="gap-1.5 bg-primary hover:bg-primary-dark text-white text-caption font-bold px-4 py-2 shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {writingPlan ? "AI đang viết kịch bản sản xuất..." : "Lên kịch bản sản xuất · AI (1 credit)"}
              <ArrowRight size={14} />
            </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
