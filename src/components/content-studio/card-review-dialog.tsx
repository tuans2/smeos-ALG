"use client"

import { AnalysisResultCard, CommercialContentCard } from "@/components/templates/product-analysis"
import { Button } from "@/components/ui/button"
import { CostPreview } from "@/components/ui/cost-preview"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Dialog } from "@/components/ui/dialog"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useI18n } from "@/lib/i18n"
import { useSession } from "@/lib/session"
import { mapAnalysisFromSchema } from "@/modules/products/domain/analysis-schema-mapper"
import { mapProductCopyToFields } from "@/modules/products/domain/product-copy-fields"
import { costCreditForFeature } from "@/modules/usage/domain/pricing"
import type { ScanResult } from "./content-api"
import { useCardReview } from "./use-card-review"

const STAGE_HINT = {
  card: "Kiểm tra từng trường máy đã đọc từ ảnh, sửa nếu cần rồi duyệt.",
  copy: "Bài giới thiệu viết từ Thẻ sản phẩm đã duyệt — sửa câu chữ rồi duyệt.",
} as const

const STAGE_TITLE = {
  card: "Duyệt Thẻ sản phẩm",
  writing: "Đang viết Bài giới thiệu",
  copy: "Duyệt Bài giới thiệu sản phẩm",
  finished: "Đã xong",
} as const

function confidenceOf(card: Record<string, unknown> | null): number | null {
  const c = card?.confidence
  return typeof c === "number" ? c : null
}

/**
 * Hộp duyệt một sản phẩm ở Bước 1: Thẻ sản phẩm (kết quả quét) → Bài giới thiệu. Dùng lại 2 thẻ kết quả chuẩn của
 * Template SSOT; quyền theo mã năng lực (H2 sửa, H3 duyệt thẻ, H5 viết bài, H6 duyệt bài) — thiếu quyền thì nói rõ.
 */
export function CardReviewDialog({
  result, onClose, onProductReady, onDiscarded,
}: {
  result: ScanResult | null
  onClose: () => void
  onProductReady: (productId: string) => Promise<void>
  onDiscarded: () => void
}) {
  return (
    <Dialog open={result !== null} onOpenChange={(open) => { if (!open) onClose() }} size="lg" title="Duyệt sản phẩm">
      {result && <CardReviewBody key={result.id} result={result} onClose={onClose} onProductReady={onProductReady} onDiscarded={onDiscarded} />}
    </Dialog>
  )
}

function CardReviewBody({
  result, onClose, onProductReady, onDiscarded,
}: {
  result: ScanResult
  onClose: () => void
  onProductReady: (productId: string) => Promise<void>
  onDiscarded: () => void
}) {
  const { industryKey } = useI18n()
  const session = useSession()
  const r = useCardReview(result, onProductReady)
  const canEdit = session.can("H2")
  const canApproveCard = session.can("H3") && session.can("H5")
  const canApproveCopy = session.can("H6")
  const confidence = confidenceOf(r.card)

  const missing = r.stage === "card" && !canApproveCard
    ? "Bạn chưa có quyền duyệt Thẻ sản phẩm — nhờ quản lý cửa hàng duyệt giúp."
    : r.stage === "copy" && !canApproveCopy ? "Bạn chưa có quyền duyệt Bài giới thiệu — nhờ quản lý cửa hàng duyệt giúp." : null

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-title-sm font-bold text-text">{STAGE_TITLE[r.stage]}</h3>
        {r.stage !== "writing" && r.stage !== "finished" && <p className="text-caption text-text-muted">{STAGE_HINT[r.stage]}</p>}
      </div>
      {r.error && <InlineError message={r.error} />}
      {missing && <p className="rounded-xl border border-warning-border bg-warning-bg px-4 py-3 text-body-sm text-warning-text">{missing}</p>}
      {r.busy && <p className="text-caption text-text-muted" aria-live="polite">{r.busy}</p>}
      {r.savedAt && !r.busy && <p className="text-caption text-success-text" aria-live="polite">Đã lưu nháp</p>}

      {r.stage === "card" && r.card && (
        <>
          <AnalysisResultCard
            stepNumber="Bước 1 · Thẻ sản phẩm"
            headerTitle="Đặc điểm nhận diện"
            imageUrl={result.image_url ?? null}
            fields={mapAnalysisFromSchema(r.card, industryKey)}
            confidence={confidence}
            qualityLabel={confidence === null ? "Kiểm tra lại các trường trước khi duyệt" : confidence >= 80 ? "Máy đọc khá chắc chắn" : "Máy chưa chắc chắn — xem kỹ từng trường"}
            disabled={!canEdit || Boolean(r.busy)}
            {...r.cardEdits}
            {...(canEdit ? { onSaveDraft: () => void r.saveCard() } : {})}
            {...(canApproveCard ? { onApprove: () => void r.approveCardAndWrite(), onReject: () => void r.discardCard() } : {})}
          />
          <div>
            <p className="text-caption text-text-muted">Duyệt thẻ sẽ lưu sản phẩm vào Kho sản phẩm và viết ngay Bài giới thiệu.</p>
            <CostPreview cost={costCreditForFeature("product.copy.generate")} estimated />
          </div>
        </>
      )}

      {r.stage === "writing" && <SkeletonBlock lines={6} label="Đang viết Bài giới thiệu sản phẩm" />}

      {r.stage === "copy" && r.copy && (
        <CommercialContentCard
          fields={mapProductCopyToFields(r.copy, r.card)}
          imageUrl={result.image_url ?? null}
          disabled={!canEdit || Boolean(r.busy)}
          {...r.copyEdits}
          {...(canEdit ? { onSaveDraft: () => void r.saveCopy() } : {})}
          {...(canApproveCopy ? { onApprove: () => void r.approveCopyAndFinish() } : {})}
        />
      )}

      {r.stage === "finished" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 size={36} className="text-success" aria-hidden />
          <p className="text-body font-semibold text-text">
            {r.productId ? "Thẻ sản phẩm và Bài giới thiệu đã được duyệt, sản phẩm đã có trong Kho." : "Đã bỏ thẻ này."}
          </p>
          <Button type="button" onClick={() => { if (!r.productId) onDiscarded(); onClose() }}>Đóng</Button>
        </div>
      )}
    </div>
  )
}
