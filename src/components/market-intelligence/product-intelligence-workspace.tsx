"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, CheckCircle2, ArrowRight, Layers, Flame, Video, AlertCircle } from "@/components/ui/icons";
import { ProductUploadCard } from "./product-upload-card";
import { ProductConfirmationCard } from "./product-confirmation-card";
import { CommercialPassportCard } from "./commercial-passport-card";
import { ProductTrendFitMatrix } from "./product-trend-fit-matrix";
import { ProductImprovementCard } from "./product-improvement-card";
import { ProductTopicsList } from "./product-topics-list";
import { CreativeHandoffModal } from "./creative-handoff-modal";
import { ProductReadinessCard } from "./product-readiness-card";
import { StageGateApprovalBar } from "@/components/ui/stage-gate-approval-bar";
import {
  DEFAULT_PRODUCTION_SCOPE,
  ProductionScopePicker,
  type ProductionScope,
} from "@/components/creative-studio/production-scope-picker";
import type {
  ProductFlowerComponent,
  ProductVisualAttributes,
  ProductPackaging,
  ProductInferredContext,
  ProductIntelligenceReport,
  ConcreteTopic,
  CommercialPassport,
} from "@/modules/market-intelligence/domain/product-intelligence-types";

const EMPTY_ATTRIBUTES: ProductVisualAttributes = { mainColors: [], secondaryColors: [], style: "", shape: "", sizeEstimate: "" };
const EMPTY_PACKAGING: ProductPackaging = { wrappingMaterial: "", wrappingColor: "", ribbon: "", accessories: [] };
const EMPTY_CONTEXT: ProductInferredContext = { likelyOccasions: [], likelyAudience: "", suggestedPrice: 0, confidence: 0 };

export function ProductIntelligenceWorkspace() {
  const router = useRouter();

  // State Chặng 01: Ảnh & Tên
  // Không chọn sẵn ảnh/dữ liệu mẫu (25/09/2026): bấm "Bóc tách" là một lượt Vision
  // AI thu credit, và các giá trị bịa sẵn ("Hoa hồng kem dâu 12 cành", giá
  // 599.000đ, 94%) đi thẳng vào Chặng 03–05 như thể là số đo.
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>();
  // Phạm vi sản xuất (PO 24/09/2026): chọn cuối Chặng 04, sửa tiếp ở đầu Chặng 05.
  // Mặc định mỗi lần mở: TikTok + Reels 9:16, đủ 4 loại kết quả.
  const [productionScope, setProductionScope] = useState<ProductionScope>(DEFAULT_PRODUCTION_SCOPE);
  const [productTitle, setProductTitle] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // State Chặng 02: Xác nhận thuộc tính Vision bóc tách
  const [hasExtracted, setHasExtracted] = useState(false);
  const [isSubmittingMatch, setIsSubmittingMatch] = useState(false);

  const [components, setComponents] = useState<ProductFlowerComponent[]>([]);
  const [attributes, setAttributes] = useState<ProductVisualAttributes>(EMPTY_ATTRIBUTES);
  const [packaging, setPackaging] = useState<ProductPackaging>(EMPTY_PACKAGING);
  const [context, setContext] = useState<ProductInferredContext>(EMPTY_CONTEXT);

  // State Chặng 03+: Báo cáo Product Intelligence
  const [report, setReport] = useState<ProductIntelligenceReport | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [approvedStage3, setApprovedStage3] = useState(false);

  // State Chặng 05: Modal CHOOSE (Chọn định hướng sáng tạo)
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [handoffTopic, setHandoffTopic] = useState<ConcreteTopic | null>(null);
  const [handoffArea, setHandoffArea] = useState<string>("b");

  // Chặng 02: Kích hoạt Vision AI trích xuất thực tế qua API route
  const handleAnalyzeVision = async () => {
    setIsAnalyzing(true);
    setExtractError(null);
    try {
      const res = await fetch("/api/v1/market-intelligence/vision-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: selectedImage,
          asset_id: selectedAssetId,
          product_title: productTitle,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || "Không thể bóc tách ảnh bằng Vision AI");
      }

      const data = await res.json();
      if (data.productName) setProductTitle(data.productName);
      if (data.components) setComponents(data.components);
      if (data.attributes) setAttributes(data.attributes);
      if (data.packaging) setPackaging(data.packaging);
      if (data.context) setContext(data.context);

      setHasExtracted(true);
      setTimeout(() => {
        const el = document.getElementById("confirmation-step-section");
        el?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    } catch (err: unknown) {
      setExtractError(err instanceof Error ? err.message : "Lỗi khi chạy Vision AI bóc tách sản phẩm");
      // Đường nhập tay (thiết kế PO): mở form với các ô TRỐNG để chủ tiệm tự điền
      // — không đi tiếp bằng dữ liệu bịa của lượt trước hay giá trị mặc định.
      setComponents([]);
      setAttributes(EMPTY_ATTRIBUTES);
      setPackaging(EMPTY_PACKAGING);
      setContext(EMPTY_CONTEXT);
      setHasExtracted(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Chặng 03: Chuyển dữ liệu Vision xác nhận sang Research Engine đối soát xu hướng
  const handleConfirmAndMatch = async (data: {
    components: ProductFlowerComponent[];
    attributes: ProductVisualAttributes;
    packaging: ProductPackaging;
    context: ProductInferredContext;
    commercialPassport?: CommercialPassport;
  }) => {
    setMatchError(null);

    let activeAssetId = selectedAssetId;
    if (!activeAssetId || !activeAssetId.trim()) {
      try {
        setIsSubmittingMatch(true);
        const imgRes = await fetch(selectedImage);
        if (imgRes.ok) {
          const blob = await imgRes.blob();
          const file = new File([blob], "product-flower.jpg", { type: blob.type || "image/jpeg" });
          const upRes = await fetch("/api/v1/assets/upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mime_type: file.type || "image/jpeg" }),
          });
          if (upRes.ok) {
            const { upload_url, asset_id, storage_key } = await upRes.json();
            // 23/09/2026: kiểm từng bước — trước đây PUT/đăng ký lỗi vẫn gán
            // assetId, sinh asset trỏ tới tệp không tồn tại trong kho.
            const putRes = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": file.type || "image/jpeg" }, body: file });
            if (!putRes.ok) throw new Error(`Tải ảnh lên kho thất bại (HTTP ${putRes.status})`);
            const regRes = await fetch("/api/v1/assets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ asset_id, kind: "ORIGINAL", storage_key, mime_type: file.type, file_size: file.size }),
            });
            if (!regRes.ok) throw new Error(`Đăng ký ảnh vào kho thất bại (HTTP ${regRes.status})`);
            activeAssetId = asset_id;
            setSelectedAssetId(asset_id);
          }
        }
      } catch (e) {
        setIsSubmittingMatch(false);
        setMatchError(e instanceof Error ? e.message : "Không lưu được ảnh vào kho — vui lòng tải lại ảnh.");
        return;
      }
    }

    if (!activeAssetId || !activeAssetId.trim()) {
      setIsSubmittingMatch(false);
      setMatchError("Ảnh chưa được lưu vào kho — vui lòng tải lại ảnh ở bước 1 trước khi đối soát thị trường.");
      return;
    }

    try {
      setIsSubmittingMatch(true);
      const res = await fetch("/api/v1/market-intelligence/product-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: productTitle,
          image_url: selectedImage,
          asset_id: activeAssetId,
          components: data.components,
          attributes: data.attributes,
          packaging: data.packaging,
          context: data.context,
          commercial_passport: data.commercialPassport,
        }),
      });

      if (res.ok) {
        const result: ProductIntelligenceReport = await res.json();
        setReport(result);
        setTimeout(() => {
          const el = document.getElementById("product-report-results");
          el?.scrollIntoView({ behavior: "smooth" });
        }, 200);
      } else {
        const body = await res.json().catch(() => null);
        setMatchError(body?.error?.message || "Không thể đối soát thị trường — vui lòng thử lại.");
      }
    } catch (err) {
      console.error("Lỗi đối soát Product Intelligence:", err);
      setMatchError("Lỗi kết nối khi đối soát thị trường — vui lòng thử lại.");
    } finally {
      setIsSubmittingMatch(false);
    }
  };

  // Pipeline Steps Indicator (5 chặng trên workspace này)
  const currentStep = report ? (approvedStage3 ? (handoffTopic ? 5 : 4) : 3) : hasExtracted ? 2 : 1;

  return (
    <div className="space-y-6">
      {/* Visual Pipeline Header Indicator — 5 Chặng tuần tự */}
      <div className="rounded-2xl border border-border bg-white p-3.5 shadow-xs">
        <div tabIndex={0} role="group" aria-label="Các bước quét theo ảnh" className="flex items-center justify-between text-caption font-bold overflow-x-auto gap-2 focus-visible:outline-2 focus-visible:outline-primary">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${currentStep >= 1 ? "bg-primary-muted text-primary font-extrabold" : "text-text-muted"}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-caption ${currentStep >= 2 ? "bg-success text-white" : "bg-primary text-white"}`}>
              {currentStep >= 2 ? "✓" : "1"}
            </span>
            <span>01. Tải ảnh (BRING)</span>
          </div>
          <ArrowRight size={14} className="text-text-muted shrink-0" />
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${currentStep >= 2 ? "bg-primary-muted text-primary font-extrabold" : "text-text-muted"}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-caption ${currentStep >= 3 ? "bg-success text-white" : "bg-primary text-white"}`}>
              {currentStep >= 3 ? "✓" : "2"}
            </span>
            <span>02. Vision AI bóc tách (UNDERSTAND)</span>
          </div>
          <ArrowRight size={14} className="text-text-muted shrink-0" />
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${currentStep >= 3 ? "bg-primary-muted text-primary font-extrabold" : "text-text-muted"}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-caption ${currentStep >= 4 ? "bg-success text-white" : "bg-primary text-white"}`}>
              {currentStep >= 4 ? "✓" : "3"}
            </span>
            <span>03. Trend Fit (DISCOVER)</span>
          </div>
          <ArrowRight size={14} className="text-text-muted shrink-0" />
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${currentStep >= 4 ? "bg-primary-muted text-primary font-extrabold" : "text-text-muted"}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-caption ${currentStep >= 5 ? "bg-success text-white" : "bg-primary text-white"}`}>
              {currentStep >= 5 ? "✓" : "4"}
            </span>
            <span>04. 10 Chủ đề & Video (IDEATE)</span>
          </div>
          <ArrowRight size={14} className="text-text-muted shrink-0" />
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${currentStep >= 5 ? "bg-accent-bg text-accent-text font-extrabold" : "text-text-muted"}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white text-caption">5</span>
            <span>05. Chọn định hướng (CHOOSE)</span>
          </div>
        </div>
      </div>

      {extractError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-warning-bg border border-warning-border text-caption text-warning-text">
          <AlertCircle size={16} className="text-warning-text shrink-0" />
          <span>{extractError} (Đã chuyển sang cấu hình chỉnh sửa thủ công nguyên tử).</span>
        </div>
      )}

      {/* 1. Upload & Chọn ảnh (Chặng 01 BRING) */}
      <ProductUploadCard
        selectedImage={selectedImage}
        selectedAssetId={selectedAssetId}
        productTitle={productTitle}
        onUpdateProductTitle={setProductTitle}
        onSelectImage={(url, name, assetId) => {
          setSelectedImage(url);
          setProductTitle(name);
          setSelectedAssetId(assetId);
          setHasExtracted(false);
          setReport(null);
          setApprovedStage3(false);
        }}
        onAnalyze={handleAnalyzeVision}
        isAnalyzing={isAnalyzing}
      />

      {/* 2. Màn hình xác nhận thuộc tính bóc tách & Hồ sơ thương mại (Chặng 02 UNDERSTAND) */}
      {hasExtracted && (
        <div id="confirmation-step-section">
          {matchError && (
            <div className="flex items-center gap-2 p-3 mb-3 rounded-xl bg-danger-bg border border-danger-border text-caption text-danger-text">
              <AlertCircle size={16} className="text-danger-text shrink-0" />
              <span>{matchError}</span>
            </div>
          )}
          <ProductConfirmationCard
            productTitle={productTitle}
            components={components}
            attributes={attributes}
            packaging={packaging}
            context={context}
            onConfirm={handleConfirmAndMatch}
            isSubmitting={isSubmittingMatch}
          />
        </div>
      )}

      {/* 3. Báo cáo Product Intelligence khi có kết quả (Chặng 03 DISCOVER & Chặng 04 IDEATE) */}
      {report && (
        <div id="product-report-results" className="space-y-6 pt-2">
          {/* Hồ sơ thương mại đã duyệt */}
          {report.commercialPassport && (
            <CommercialPassportCard passport={report.commercialPassport} readOnly />
          )}

          {/* Ma trận đối soát thị trường */}
          <ProductTrendFitMatrix
            matrix={report.trendFitMatrix}
            trendFitScore={report.trendFitScore}
            audienceFitScore={report.audienceFitScore}
            contentFitScore={report.contentFitScore}
            overallFit={report.overallFit}
          />

          {/* Khuyến nghị cải tiến sản phẩm KEEP / IMPROVE / TEST */}
          <ProductImprovementCard
            improvements={report.improvements}
            onCreateVariation={() => {
              const theme = report.improvements.test[0] || "Dark Mood";
              router.push(`/tai-anh?topic=${encodeURIComponent(productTitle)}&theme=${encodeURIComponent(theme)}` as never);
            }}
          />

          {/* CỔNG PHÊ DUYỆT CHẶNG 03 (STAGE-GATE APPROVAL) */}
          <StageGateApprovalBar
            stageCode="Chặng 03 — DISCOVER"
            title="Xác nhận Kết quả Đối soát Thị trường & Trend Fit"
            description={`AI đã đối soát dữ liệu thị trường sản phẩm: Điểm Trend Fit ${report.trendFitScore}/100, Audience Fit ${report.audienceFitScore}/100, xác định ${report.improvements.keep.length} điểm GIỮ và ${report.improvements.improve.length} điểm CẢI TIẾN. Chủ shop xác nhận kết quả để mở khóa Chặng 04.`}
            isApproved={approvedStage3}
            approveLabel="Phê duyệt Trend Fit & Mở khóa Chặng 04 (10 Chủ đề tiếp thị)"
            onApprove={() => {
              setApprovedStage3(true);
              setTimeout(() => {
                const el = document.getElementById("ideate-step-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }, 150);
            }}
            metrics={[
              { label: "Trend Fit", value: `${report.trendFitScore}/100` },
              { label: "Audience Fit", value: `${report.audienceFitScore}/100` },
              { label: "Khuyến nghị", value: `${report.improvements.keep.length} Giữ · ${report.improvements.improve.length} Cải tiến` },
            ]}
          />

          {/* Khối Chặng 04 (IDEATE): Chỉ mở ra khi Chặng 03 đã được duyệt */}
          {!approvedStage3 ? (
            <div className="rounded-2xl border-2 border-dashed border-border bg-bg/70 p-6 text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-border/80 text-text text-caption font-bold uppercase tracking-wider">
                🔒 Chặng 04 — IDEATE (10 Chủ đề Tiếp thị & Dẫn chứng Video Kép)
              </div>
              <p className="text-caption text-text-muted max-w-md mx-auto">
                Chặng 04 đang tạm khóa. Vui lòng bấm <strong>“Phê duyệt Trend Fit & Mở khóa Chặng 04”</strong> ở thanh phía trên để AI hiển thị 10 chủ đề tiếp thị và video dẫn chứng.
              </p>
            </div>
          ) : (
            <div id="ideate-step-section" className="space-y-6 pt-2">
              {/* Top 10 chủ đề nội dung cụ thể kèm Dẫn chứng Video Kép */}
              <ProductTopicsList
                topics={report.topics}
                onOpenCreativeStudio={(topic) => {
                  setHandoffTopic(topic);
                  setHandoffArea("b");
                  setShowHandoffModal(true);
                }}
              />

              {/* Thước đo sẵn sàng & Nút hành động */}
              <ProductReadinessCard
                readiness={report.readiness}
                onGoToMedia={() => {
                  setHandoffTopic(report.topics[0] || null);
                  setHandoffArea("d");
                  setShowHandoffModal(true);
                }}
                onGoToVideo={() => {
                  setHandoffTopic(report.topics[0] || null);
                  setHandoffArea("e");
                  setShowHandoffModal(true);
                }}
              />

              {/* Phạm vi sản xuất — nền tảng đăng + loại kết quả (cuối Chặng 04) */}
              <ProductionScopePicker value={productionScope} onChange={setProductionScope} />

              {/* CỔNG PHÊ DUYỆT CHẶNG 04 (STAGE-GATE APPROVAL) */}
              <StageGateApprovalBar
                stageCode="Chặng 04 — IDEATE"
                title="Phê duyệt Danh sách 10 Chủ đề Tiếp thị & Chọn Chủ đề Trọng tâm"
                description={
                  handoffTopic
                    ? `Bạn đã chọn chủ đề "${handoffTopic.title}". Bấm tiếp tục để thiết lập định hướng và chế độ sản xuất (Chặng 05 CHOOSE).`
                    : "Nhấp vào nút 'Chọn chủ đề này' ở một trong 10 thẻ phía trên để chốt định hướng và tiến đến Chặng 05 CHOOSE."
                }
                isApproved={!!handoffTopic}
                approveLabel={
                  handoffTopic
                    ? `Chốt chủ đề "${handoffTopic.title.slice(0, 28)}..." & Tiếp tục Chặng 05`
                    : "Chọn 1 chủ đề ở trên để tiếp tục Chặng 05"
                }
                onApprove={() => {
                  const target = handoffTopic || report.topics[0];
                  if (target) {
                    setHandoffTopic(target);
                    setHandoffArea("b");
                    setShowHandoffModal(true);
                  }
                }}
                metrics={[
                  { label: "Tổng chủ đề", value: report.topics.length },
                  { label: "Dẫn chứng video", value: `${report.topics.length * 2} video (TikTok + YouTube)` },
                ]}
              />
            </div>
          )}
        </div>
      )}

      {/* Modal Chặng 5 CHOOSE — Chọn định hướng sáng tạo */}
      {handoffTopic && (
        <CreativeHandoffModal
          open={showHandoffModal}
          onClose={() => setShowHandoffModal(false)}
          selectedTopic={handoffTopic}
          productName={productTitle}
          sourceImageUrl={selectedImage}
          targetArea={handoffArea}
          assetId={selectedAssetId}
          report={report}
          initialScope={productionScope}
          onScopeChange={setProductionScope}
        />
      )}
    </div>
  );
}
