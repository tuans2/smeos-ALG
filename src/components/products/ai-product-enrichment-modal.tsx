"use client"

import React, { useState, useEffect } from "react"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { X } from "@/components/ui/icon-set/x"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { AiProductModalFooter, type SubmitMode } from "./ai-product-modal-footer"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { useI18n } from "@/lib/i18n"
import { useSession } from "@/lib/session"
import { isPendingProposal } from "@/modules/products/domain/product-proposal"
import { driveThumbProxySrc } from "@/components/greeting-card/drive-thumb-image"
import {
  type ProductFormValues,
  uploadImageFile,
  callVisionExtract,
  callContentEngineMarketing,
  applyVisionToForm,
  buildProductPatchPayload,
} from "./ai-product-helpers"
import { getDesignFieldsConfig } from "./create-product-types"
import { AiProductFormFields } from "./ai-product-form-fields"
import { extractInitialFormValues, type InitialProductInput } from "./ai-product-initial"
import { buildSaveAsPayload, createProductCopy, type CreatedProduct } from "./ai-product-save-as"

interface AiProductEnrichmentModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  initialProduct: InitialProductInput
  onSuccess: () => void
  /** Sau "Lưu thành mẫu mới": nơi gọi mở mẫu vừa tạo. */
  onSavedAsNew?: (created: CreatedProduct) => void
}

export function AiProductEnrichmentModal({
  isOpen,
  onClose,
  productId,
  initialProduct,
  onSuccess,
  onSavedAsNew,
}: AiProductEnrichmentModalProps) {
  const { ti, industry } = useI18n()
  const { can } = useSession()
  // Máy chủ kiểm lại; ở đây chỉ ẩn nút người dùng chắc chắn bị từ chối.
  const canOverwrite = can("H3") || isPendingProposal(initialProduct.attributes as Record<string, unknown> | null)
  const designConfig = getDesignFieldsConfig(industry.identity.key)
  const defaultCategory = industry.taxonomy.defaultCategories[0]?.label || ""
  const defaultShape = designConfig.shapeOptions[0] || ""
  const defaultFacing = designConfig.facingMultiple ? "" : (designConfig.facingOptions[0] || "")

  const [values, setValues] = useState<ProductFormValues>({
    name: "",
    code: "",
    category: defaultCategory,
    shape: defaultShape,
    facing: defaultFacing,
    container: "",
    priceVnd: "",
    primaryColor: "",
    description: "",
    status: "ACTIVE",
    flowers: [],
  })

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGeneratingContent, setIsGeneratingContent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState<false | SubmitMode>(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [contentSuggestions, setContentSuggestions] = useState<string[]>([])

  useEffect(() => {
    if (!isOpen) return
    const { values: initValues, previewUrl } = extractInitialFormValues(
      initialProduct,
      defaultCategory,
      defaultShape,
      defaultFacing
    )
    setValues(initValues)
    setImagePreview(previewUrl)
    setImageFile(null)
    setNotice(null)
    setErrorMsg(null)
    setContentSuggestions([])
  }, [isOpen, initialProduct, defaultCategory, defaultShape, defaultFacing])

  if (!isOpen) return null

  const handleFieldChange = <K extends keyof ProductFormValues>(field: K, val: ProductFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: val }))
  }

  const handleImageFileSelected = (file: File) => {
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    handleFieldChange("imageAssetId", null)
    handleFieldChange("imageUrl", null)
    handleFieldChange("driveLink", null)
  }

  const handleRunAiAnalysis = async () => {
    setIsAnalyzing(true)
    setErrorMsg(null)
    setNotice(null)
    try {
      let assetId = values.imageAssetId
      if (imageFile) {
        setUploadingImage(true)
        const uploaded = await uploadImageFile(imageFile)
        assetId = uploaded.assetId
        handleFieldChange("imageAssetId", uploaded.assetId)
        handleFieldChange("imageUrl", uploaded.viewUrl)
        setUploadingImage(false)
      } else if (!assetId && (values.imageUrl || values.driveLink)) {
        setUploadingImage(true)
        const fetchUrl = values.imageUrl || (values.driveLink ? driveThumbProxySrc(values.driveLink) : null)
        if (fetchUrl) {
          try {
            const res = await fetch(fetchUrl)
            if (res.ok) {
              const blob = await res.blob()
              const file = new File([blob], `${values.code || "product"}.jpg`, {
                type: blob.type || "image/jpeg",
              })
              const uploaded = await uploadImageFile(file)
              assetId = uploaded.assetId
              handleFieldChange("imageAssetId", uploaded.assetId)
              handleFieldChange("imageUrl", uploaded.viewUrl)
            }
          } catch {
            /* bỏ qua nếu tải lỗi */
          }
        }
        setUploadingImage(false)
      }

      if (!assetId) {
        throw new Error(`Vui lòng tải ảnh lên hoặc chọn ${ti("sampleProduct").toLowerCase()} có ảnh trước khi bấm Phân tích AI.`)
      }

      const vision = await callVisionExtract(assetId)
      const { updated, filledFieldsCount } = applyVisionToForm(vision, values)
      setValues(updated)

      setIsGeneratingContent(true)
      const itemsList = updated.flowers.filter((f) => f.name.trim()).map((f) => f.name).join(", ")
      const summaryContext = `${ti("sampleProduct")} ${updated.name || updated.category}, cấu thành từ ${itemsList || "vật liệu tuyển chọn"}. Tông màu ${updated.primaryColor || "hài hòa"}. Quy cách ${updated.shape}.`
      const suggestions = await callContentEngineMarketing(summaryContext, "luxurious")
      setContentSuggestions(suggestions)
      if (suggestions[0] && !updated.description.trim()) {
        setValues((v) => ({ ...v, description: suggestions[0] ?? "" }))
      }

      setNotice(
        `Phân tích AI thành công! Đã tự động cập nhật ${filledFieldsCount} trường dữ liệu và gợi ý mô tả phù hợp cho ${ti("sampleProduct").toLowerCase()}.`
      )
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Đã xảy ra lỗi khi phân tích AI.")
    } finally {
      setIsAnalyzing(false)
      setUploadingImage(false)
      setIsGeneratingContent(false)
    }
  }

  const handleCallContentEngine = async (style: "luxurious" | "sweet" | "creative" | "concise") => {
    setIsGeneratingContent(true)
    try {
      const itemsList = values.flowers.filter((f) => f.name.trim()).map((f) => f.name).join(", ")
      const baseText = values.description.trim() || `${ti("sampleProduct")} ${values.name || values.category}, gồm ${itemsList || "thành phần chọn lọc"}.`
      const suggestions = await callContentEngineMarketing(baseText, style)
      setContentSuggestions(suggestions)
      if (suggestions[0] && !values.description.trim()) {
        handleFieldChange("description", suggestions[0])
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Chưa tạo được gợi ý mô tả. Vui lòng thử lại.")
    } finally {
      setIsGeneratingContent(false)
    }
  }

  const handleSubmit = async (mode: SubmitMode) => {
    if (!values.name.trim()) {
      setErrorMsg(`Vui lòng nhập tên ${ti("sampleProduct").toLowerCase()}.`)
      return
    }
    if (!values.code.trim()) {
      setErrorMsg(`Vui lòng nhập mã ${ti("sampleProduct").toLowerCase()} (SKU).`)
      return
    }

    setIsSubmitting(mode)
    setErrorMsg(null)

    try {
      let finalAssetId = values.imageAssetId
      let finalImageUrl = values.imageUrl
      if (imageFile) {
        const uploaded = await uploadImageFile(imageFile)
        finalAssetId = uploaded.assetId
        finalImageUrl = uploaded.viewUrl
      }

      const currentAttrs = (initialProduct.attributes as Record<string, unknown> | null) ?? {}
      const patchData = buildProductPatchPayload(values, currentAttrs, finalAssetId, finalImageUrl)

      if (mode === "saveAs") {
        const created = await createProductCopy(
          buildSaveAsPayload(patchData, initialProduct),
          ti("sampleProduct").toLowerCase()
        )
        onSuccess()
        onSavedAsNew?.(created)
        if (!onSavedAsNew) onClose()
        return
      }

      // Không được ghi đè → gửi đề xuất sửa; bản đang bán giữ nguyên tới khi Điều hành duyệt.
      const res = await fetch(mode === "propose" ? `/api/v1/products/${productId}/change-requests` : `/api/v1/products/${productId}`, {
        method: mode === "propose" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      })

      const responseBody = await res.json().catch(() => null)

      if (!res.ok) {
        let msg = responseBody?.error?.message || `Không lưu được ${ti("sampleProduct").toLowerCase()}, vui lòng kiểm tra lại thông tin và thử lại`
        const issues = responseBody?.error?.details?.issues
        if (Array.isArray(issues) && issues.length > 0) {
          const issueMsgs = issues.map((it: { path?: string[]; message?: string }) => `${it.path?.join(".") || "trường"}: ${it.message || "không hợp lệ"}`).join(", ")
          msg = `${msg} (${issueMsgs})`
        }
        throw new Error(msg)
      }

      if (mode === "propose") {
        setNotice("Đã gửi đề xuất sửa. Mẫu đang bán giữ nguyên tới khi Điều hành duyệt.")
        return
      }
      await new Promise((r) => setTimeout(r, 400))

      onSuccess()
      onClose()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : `Đã xảy ra lỗi khi lưu ${ti("sampleProduct").toLowerCase()}.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={`Bảng thông số ${ti("sampleProduct").toLowerCase()} & Phân tích AI`}
    >
      <div className="relative w-full max-w-4xl rounded-2xl bg-surface border border-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-title-sm font-bold text-text">Bảng thông số {ti("sampleProduct").toLowerCase()} & Phân tích AI</h2>
              <p className="text-caption text-text-muted">Xem thông số và dùng AI để sinh đầy đủ nội dung còn thiếu</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isAnalyzing}
              onClick={handleRunAiAnalysis}
              className="flex items-center gap-1.5 border-primary/40 text-primary hover:bg-primary-muted font-bold"
            >
              {isAnalyzing ? (
                <Loader2 size={15} className="animate-spin motion-reduce:animate-none text-primary" />
              ) : (
                <Sparkles size={15} className="text-primary" />
              )}
              <span>{isAnalyzing ? "Đang phân tích..." : `Phân tích ${ti("sampleProduct").toLowerCase()} bằng AI`}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Đóng"
              className="h-8 w-8 rounded-full text-text-muted hover:bg-surface-alt"
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Thông báo */}
        {notice && (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-success-border bg-success-bg p-3 text-body-sm font-medium text-success">
            <CheckCircle2 size={16} className="flex-shrink-0" />
            <span>{notice}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-bg p-3 text-body-sm font-medium text-danger">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Thân Form */}
        <div className="flex-1 overflow-y-auto p-5">
          <AiProductFormFields
            ti={ti}
            industry={industry}
            values={values}
            onChange={handleFieldChange}
            onImageFileSelected={handleImageFileSelected}
            onRemoveImage={handleRemoveImage}
            imagePreview={imagePreview}
            uploadingImage={uploadingImage}
            onCallContentEngine={handleCallContentEngine}
            isGeneratingContent={isGeneratingContent}
            contentSuggestions={contentSuggestions}
            onSelectSuggestion={(txt) => handleFieldChange("description", txt)}
          />
        </div>

        <AiProductModalFooter canOverwrite={canOverwrite} submitting={isSubmitting} onCancel={onClose} onSubmit={(mode) => void handleSubmit(mode)} />
      </div>
    </Dialog>
  )
}
