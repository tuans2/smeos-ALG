"use client"

/**
 * Thêm tài nguyên mới hoặc phiên bản mới cho tài nguyên có sẵn.
 * Loại "tệp" tải ảnh qua luồng tài sản chung (upload-url → PUT → đăng ký);
 * loại "văn bản" nhập nội dung. Kiểm lại ở máy chủ.
 */
import { useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect } from "@/components/ui/select"
import { InlineError } from "@/components/ui/inline-error"
import { apiSend } from "@/components/greeting-card/greeting-api"
import {
  BRAND_LIBRARY_CATEGORIES, BRAND_LIBRARY_IMAGE_MIMES, CATEGORY_LABEL, LIMITS, isFileCategory,
  type BrandLibraryCategory, type BrandLibraryItemView,
} from "@/modules/profiles/domain/brand-library"

const TEXT_HINT: Partial<Record<BrandLibraryCategory, string>> = {
  COLOR: "Mã màu dạng #RRGGBB, cách nhau bởi dấu phẩy. Ví dụ: #2F6F4E, #F4EDE4",
  FONT: "Tên phông chữ và cách dùng. Ví dụ: tiêu đề dùng phông đậm, nội dung dùng phông thường",
  GUIDELINE: "Quy định dùng logo, màu, khoảng cách, những điều không được làm",
  COPY: "Khẩu hiệu, câu giới thiệu, lời chào chuẩn của thương hiệu",
}

async function uploadImage(file: File): Promise<string> {
  if (!(BRAND_LIBRARY_IMAGE_MIMES as readonly string[]).includes(file.type)) throw new Error("Chỉ nhận ảnh JPG, PNG hoặc WebP")
  const slot = await apiSend<{ upload_url: string; asset_id: string; storage_key: string }>(
    "/api/v1/assets/upload-url", "POST", { mime_type: file.type }, "Không chuẩn bị được chỗ tải ảnh"
  )
  const put = await fetch(slot.upload_url, { method: "PUT", headers: { "Content-Type": file.type }, body: file })
  if (!put.ok) throw new Error("Tải ảnh lên không thành công")
  await apiSend("/api/v1/assets", "POST", {
    asset_id: slot.asset_id, kind: "ORIGINAL", storage_key: slot.storage_key, mime_type: file.type, file_size: file.size,
  }, "Không lưu được ảnh")
  return slot.asset_id
}

export function BrandLibraryEditorDialog({
  open, onOpenChange, item, onSaved,
}: { open: boolean; onOpenChange: (o: boolean) => void; item: BrandLibraryItemView | null; onSaved: () => void }) {
  const isNewVersion = item !== null
  const [category, setCategory] = useState<BrandLibraryCategory>(item?.category ?? "LOGO")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [text, setText] = useState(item?.latest?.text_value ?? "")
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileMode = isFileCategory(category)
  const field = "w-full min-h-10 px-3 rounded-lg border border-border bg-surface text-body-sm text-text"

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const assetId = fileMode ? (file ? await uploadImage(file) : null) : null
      if (fileMode && !assetId) throw new Error("Cần chọn tệp ảnh")
      const content = { asset_id: assetId, text_value: fileMode ? null : text, note: note || null }
      if (isNewVersion) {
        await apiSend(`/api/v1/brand-library/${item.id}/versions`, "POST", content, "Không lưu được phiên bản mới")
      } else {
        await apiSend("/api/v1/brand-library", "POST", { ...content, title, category, description: description || null }, "Không thêm được tài nguyên")
      }
      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thao tác không thành công")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isNewVersion ? `Phiên bản mới: ${item.title}` : "Thêm tài nguyên thương hiệu"}
      description={isNewVersion ? `Phiên bản ${item.current_version} vẫn được giữ để xem lại.` : undefined}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button type="submit" form="brand-library-form" disabled={busy}>
            {busy ? "Đang lưu..." : isNewVersion ? "Lưu phiên bản" : "Thêm vào thư viện"}
          </Button>
        </div>
      }
    >
      <form id="brand-library-form" onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        {!isNewVersion && (
          <>
            <div className="flex flex-col gap-1">
              <label htmlFor="bl-category" className="text-caption font-semibold text-text">Loại tài nguyên</label>
              <NativeSelect id="bl-category" value={category} onChange={(e) => setCategory(e.target.value as BrandLibraryCategory)}>
                {BRAND_LIBRARY_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="bl-title" className="text-caption font-semibold text-text">Tên</label>
              <Input id="bl-title" required maxLength={LIMITS.title} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </>
        )}

        {fileMode ? (
          <div className="flex flex-col gap-1">
            <span className="text-caption font-semibold text-text">Tệp ảnh (JPG, PNG, WebP)</span>
            <div className="flex items-center gap-3">
              {/* Ô chọn tệp gốc của trình duyệt hiện chữ theo ngôn ngữ máy — ẩn đi, dùng nhãn tiếng Việt */}
              <label htmlFor="bl-file" className="shrink-0 inline-flex items-center min-h-10 px-4 rounded-lg border border-border text-body-sm font-semibold text-text cursor-pointer hover:border-primary focus-within:ring-2 focus-within:ring-primary">
                Chọn ảnh
                <input id="bl-file" type="file" accept={BRAND_LIBRARY_IMAGE_MIMES.join(",")} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="sr-only" />
              </label>
              <span className="min-w-0 truncate text-caption text-text-muted" aria-live="polite">{file ? file.name : "Chưa chọn ảnh"}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label htmlFor="bl-text" className="text-caption font-semibold text-text">Nội dung</label>
            <Textarea id="bl-text" required rows={4} maxLength={LIMITS.text} value={text} onChange={(e) => setText(e.target.value)} aria-describedby="bl-text-hint" />
            {TEXT_HINT[category] && <p id="bl-text-hint" className="text-caption text-text-muted">{TEXT_HINT[category]}</p>}
          </div>
        )}

        {!isNewVersion && (
          <div className="flex flex-col gap-1">
            <label htmlFor="bl-desc" className="text-caption font-semibold text-text">Mô tả cách dùng (không bắt buộc)</label>
            <Input id="bl-desc" maxLength={LIMITS.description} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="bl-note" className="text-caption font-semibold text-text">Ghi chú thay đổi (không bắt buộc)</label>
          <Input id="bl-note" maxLength={LIMITS.note} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {error && <InlineError message={error} />}
      </form>
    </Dialog>
  )
}
