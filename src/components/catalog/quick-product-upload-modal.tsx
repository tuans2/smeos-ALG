"use client"

import { NativeSelect } from "@/components/ui/select"
import React, { useState, useRef } from "react"
import { UploadCloud, Sparkles, Check, Image as ImageIcon, Flower2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { readApiError } from "@/components/greeting-card/api-error"
import type { CatalogProduct } from "./catalog-management-tab"
import { uploadProductImage, type UploadedImage } from "./quick-product-media"
import { QuickProductAiFields } from "./quick-product-ai-fields"
import { LocalImagePreview } from "@/components/upload/local-image-preview"
import {
  AI_FIELDS, CATEGORY_OPTIONS, fillEmptyFields, visionToFields,
  type AiField, type AiFieldValues, type VisionResult,
} from "./vision-suggestions"

interface QuickProductUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onProductCreated: (product: CatalogProduct) => void
  defaultOccasion?: string
}

const EMPTY_FIELDS = Object.fromEntries(AI_FIELDS.map((f) => [f, ""])) as AiFieldValues

export function QuickProductUploadModal({
  isOpen,
  onClose,
  onProductCreated,
  defaultOccasion = "20-10",
}: QuickProductUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  // Ảnh đã lên kho (khi bấm Phân tích) — lưu sản phẩm dùng lại, không tải lần hai
  const [uploaded, setUploaded] = useState<UploadedImage | null>(null)
  const [code, setCode] = useState("")
  const [price, setPrice] = useState<number | "">("")
  const [fields, setFields] = useState<AiFieldValues>({ ...EMPTY_FIELDS, occasion: defaultOccasion })
  const [touched, setTouched] = useState<Set<AiField>>(new Set())
  const [aiFilled, setAiFilled] = useState<Set<AiField>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  // Ảnh hiện tại đã có kết quả phân tích → bấm lại phải xác nhận (phân tích mới tốn credit)
  const [analyzed, setAnalyzed] = useState(false)

  if (!isOpen) return null

  function setField(field: AiField, value: string) {
    setFields((f) => ({ ...f, [field]: value }))
    setTouched((t) => new Set(t).add(field))
    setAiFilled((s) => { const n = new Set(s); n.delete(field); return n })
  }

  const handleFileChange = (file: File) => {
    setSelectedFile(file)
    setUploaded(null)
    setAnalyzed(false)
    if (!code) setCode(`FL-${Date.now().toString().slice(-6)}`)
  }

  async function ensureUploaded(): Promise<UploadedImage | null> {
    if (uploaded) return uploaded
    if (!selectedFile) return null
    const result = await uploadProductImage(selectedFile)
    setUploaded(result)
    return result
  }

  /**
   * Chỉ chạy khi người dùng bấm. Lần đầu: dùng lại kết quả cũ của ảnh nếu có (miễn phí).
   * Bấm lại trên ảnh đã có kết quả: phân tích mới và trừ credit — chi phí ghi sẵn trên nút "Phân tích lại (1 credit)"
   * nên không hỏi thêm bằng confirm() (03c UX-015: R2 báo chi phí tại chỗ, không chặn bằng hộp thoại).
   */
  const handleVisionAnalyze = async () => {
    if (!selectedFile) return
    const again = analyzed
    setIsAnalyzing(true)
    setErrorMessage(null)
    setNotice(null)
    try {
      const image = await ensureUploaded()
      if (!image) return
      const res = await fetch("/api/v1/market-intelligence/vision-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: image.assetId, ...(again ? { reanalyze_key: crypto.randomUUID() } : {}) }),
      })
      if (!res.ok) throw new Error(await readApiError(res, "AI chưa phân tích được ảnh này"))
      const vision = (await res.json()) as VisionResult & { reused?: boolean; usage?: { cost_credit: number } }
      // Phân tích lại được thay các ô AI điền lần trước (người dùng chưa sửa); ô người dùng gõ vẫn giữ
      const base = again ? { ...fields, ...Object.fromEntries([...aiFilled].map((f) => [f, ""])) } : fields
      const patch = fillEmptyFields(base, visionToFields(vision), touched)
      const filled = Object.keys(patch) as AiField[]
      setFields((f) => ({ ...f, ...patch }))
      setAiFilled(new Set(filled))
      setAnalyzed(true)
      const cost = vision.reused
        ? " · dùng kết quả phân tích trước, không tốn credit"
        : vision.usage?.cost_credit ? ` · đã dùng ${vision.usage.cost_credit} credit` : ""
      setNotice(filled.length > 0
        ? `AI đã điền ${filled.length} ô — kiểm tra lại trước khi lưu${cost}.`
        : `Các ô đã có nội dung, AI không ghi đè${cost}.`)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "AI chưa phân tích được ảnh này. Bạn có thể nhập tay.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fields.name.trim()) {
      setErrorMessage("Vui lòng nhập tên sản phẩm hoa.")
      return
    }
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      const image = await ensureUploaded()
      let productCode = code.trim() || `FL-${Date.now().toString().slice(-6)}`
      const priceValue = typeof price === "number" && price > 0 ? price : null
      const payload = {
        name: fields.name.trim(),
        category: fields.category || undefined,
        status: "ACTIVE" as const,
        attributes: {
          ...(image ? { imageUrl: image.viewUrl, image_asset_id: image.assetId } : {}),
          // Không nhập giá → không ghi giá: khách thấy "Liên hệ", không có giá bịa
          ...(priceValue !== null ? { price: priceValue } : {}),
          occasion_code: fields.occasion.trim() || undefined,
          components: fields.components.trim() || undefined,
          colors: fields.colors.trim() || undefined,
          style: fields.style.trim() || undefined,
          packaging: fields.packaging.trim() || undefined,
          description: fields.description.trim() || undefined,
        },
      }
      const post = (c: string) =>
        fetch("/api/v1/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: c, ...payload }) })
      let res = await post(productCode)
      if (res.status === 409) {
        productCode = `${productCode}-${Date.now().toString().slice(-4)}`
        res = await post(productCode)
      }
      if (!res.ok) throw new Error(await readApiError(res, "Không lưu được sản phẩm"))
      const json = (await res.json()) as { data?: { id: string; code?: string; name?: string; category?: string | null } }
      if (!json.data?.id) throw new Error("Không lưu được sản phẩm")
      onProductCreated({
        id: json.data.id,
        code: json.data.code || productCode,
        name: json.data.name || fields.name.trim(),
        price: priceValue,
        imageUrl: image?.viewUrl ?? null,
        category: json.data.category ?? (fields.category || null),
        occasion_code: fields.occasion.trim() || null,
        status: "ACTIVE",
      })
      onClose()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Lỗi khi lưu sản phẩm hoa mới")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !isSubmitting) onClose() }} size="md"
      title={<span className="flex items-center gap-2"><Flower2 size={16} className="text-primary" aria-hidden="true" />Thêm nhanh sản phẩm</span>}
      description="Chụp ảnh, điền thông tin — AI có thể giúp điền phần mô tả">
      <div className="flex flex-col">
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && <div role="alert" className="p-3 rounded-xl bg-danger-bg text-danger text-caption">{errorMessage}</div>}
          {notice && <div role="status" className="p-3 rounded-xl bg-primary/5 text-primary text-caption">{notice}</div>}

          <div>
            <p className="text-caption font-bold text-text mb-1.5 flex items-center gap-1.5">
              <ImageIcon size={13} className="text-primary" aria-hidden="true" />
              Ảnh chụp sản phẩm hoa
            </p>
            {selectedFile ? (
              <div className="relative aspect-16/9 rounded-2xl overflow-hidden border border-border group bg-surface-alt">
                <LocalImagePreview file={selectedFile} label="Xem trước" width={640} height={360} className="w-full h-full" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="h-8 text-caption bg-white text-text">
                    Chọn ảnh khác
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-auto text-[length:inherit] font-[inherit] w-full relative aspect-16/9 rounded-2xl border-2 border-dashed border-border hover:border-primary/60 bg-surface-alt flex flex-col items-center justify-center gap-2 cursor-pointer p-4 text-center transition-colors hover:bg-surface-alt"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <UploadCloud size={20} aria-hidden="true" />
                </div>
                <div className="text-caption font-bold text-text">Bấm vào đây để chọn ảnh chụp sản phẩm</div>
                <div className="text-caption text-text-muted">Hỗ trợ JPG, PNG, WEBP từ điện thoại hoặc máy tính</div>
              </Button>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f) }} />
            {selectedFile && (
              <Button type="button" variant="outline" onClick={() => void handleVisionAnalyze()} disabled={isAnalyzing || isSubmitting} className="mt-2 h-9 w-full text-caption font-bold gap-1.5">
                <Sparkles size={14} className="text-primary" aria-hidden="true" />
                {isAnalyzing ? "AI đang phân tích ảnh..." : analyzed ? "Phân tích lại (1 credit)" : "Phân tích ảnh bằng AI (1 credit)"}
              </Button>
            )}
            {selectedFile && (
              <p className="mt-1 text-caption text-text-muted">AI chỉ điền các ô còn trống về hoa; không đụng mã, giá hay ảnh.</p>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="qp-name" className="block text-caption font-bold text-text mb-1">
                Tên sản phẩm *{aiFilled.has("name") && <span className="ml-1 text-caption font-medium text-primary">· AI gợi ý</span>}
              </label>
              <Input id="qp-name" value={fields.name} onChange={(e) => setField("name", e.target.value)} placeholder="VD: Bó Hồng Đỏ Ecuador 15 Cành" className="h-9 text-caption" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="qp-code" className="block text-caption font-bold text-text mb-1">Mã sản phẩm</label>
                <Input id="qp-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="VD: FL-2026" className="h-9 text-caption font-mono" />
              </div>
              <div>
                <label htmlFor="qp-price" className="block text-caption font-bold text-text mb-1">Giá bán (đồng)</label>
                <Input id="qp-price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : "")} placeholder="Để trống = Liên hệ" className="h-9 text-caption" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="qp-category" className="block text-caption font-bold text-text mb-1">
                  Phân loại{aiFilled.has("category") && <span className="ml-1 text-caption font-medium text-primary">· AI gợi ý</span>}
                </label>
                <NativeSelect id="qp-category" value={fields.category} onChange={(e) => setField("category", e.target.value)} className="w-full h-9 rounded-xl border border-border bg-surface px-3 text-caption text-text focus:outline-none focus:border-primary">
                  <option value="">Chọn phân loại</option>
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </NativeSelect>
              </div>
              <div>
                <label htmlFor="qp-occasion" className="block text-caption font-bold text-text mb-1">
                  Dịp phù hợp{aiFilled.has("occasion") && <span className="ml-1 text-caption font-medium text-primary">· AI gợi ý</span>}
                </label>
                <Input id="qp-occasion" value={fields.occasion} onChange={(e) => setField("occasion", e.target.value)} placeholder="VD: 20-10, Sinh nhật..." className="h-9 text-caption" />
              </div>
            </div>
            <QuickProductAiFields values={fields} aiFilled={aiFilled} onChange={setField} />
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} className="h-9 text-caption">Hủy</Button>
            <Button type="submit" disabled={isSubmitting || isAnalyzing || !fields.name.trim()} className="h-9 text-caption bg-primary text-white hover:bg-primary-dark font-bold gap-1.5">
              <Check size={14} aria-hidden="true" />
              <span>{isSubmitting ? "Đang lưu..." : "Thêm sản phẩm"}</span>
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  )
}
