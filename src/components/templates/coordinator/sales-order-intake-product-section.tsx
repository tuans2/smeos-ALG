"use client"

import { Input } from "@/components/ui/input"
import { safeImageSrc } from "@/lib/safe-image-src"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Flower2 } from "@/components/ui/icon-set/flower2"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Upload } from "@/components/ui/icon-set/upload"
import { Image as ImageIcon } from "@/components/ui/icon-set/image"
import { Camera } from "@/components/ui/icon-set/camera"
import { Eye } from "@/components/ui/icon-set/eye"
import { Button } from "@/components/ui/button"
import type { SalesOrderIntakeForm } from "./use-sales-order-intake-form"

/** Phần 2 (đầu): ảnh mẫu, tên/giá sản phẩm, tiền cọc. */
export function SalesOrderIntakeProductSection({ form }: { form: SalesOrderIntakeForm }) {
  const {
    productTitle, setProductTitle, unitPriceVnd, setUnitPriceVnd, depositVnd, setDepositVnd,
    sampleImageUrl, setSampleImageUrl, sampleAssetId, setSampleAssetId, isUploading, fileInputRef,
    handleFileUpload, masterProducts, handleSelectMasterProduct,
  } = form
  return (
    <>
      <span className="font-extrabold text-text text-body-sm flex items-center justify-between border-b border-border pb-1.5">
        <span className="flex items-center gap-1.5">
          <Flower2 size={16} className="text-danger-text" />
          2. Mẫu Sản Phẩm & Công Thức Cắm Hoa
        </span>
        <span className="text-caption font-bold text-danger-text bg-danger-bg border border-danger-border px-2 py-0.5 rounded-full">
          📸 Chuẩn Input Kỹ Thuật Đầu Vào
        </span>
      </span>

      {/* Khối Hiển Thị & Tải Ảnh Sản Phẩm Mẫu (Master Sample Image Spec) */}
      <div className="p-4 rounded-2xl border-2 border-danger-border bg-danger-bg/40 flex flex-col md:flex-row gap-4 items-start">
        {/* Cột Trái: Khung Preview Ảnh Mẫu */}
        <div className="flex flex-col items-center gap-2 shrink-0 w-full md:w-44">
          <div className="relative w-full aspect-square rounded-xl border border-danger-border bg-surface overflow-hidden shadow-sm flex items-center justify-center group">
            {sampleImageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={safeImageSrc(sampleImageUrl)}
                  alt="Ảnh mẫu sản phẩm đầu vào"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button variant="ghost"
                    type="button"
                    onClick={() => window.open(sampleImageUrl, "_blank")}
                    title="Xem ảnh gốc toàn màn hình"
                    className="h-auto gap-0 p-1.5 rounded-lg bg-surface/90 text-text hover:bg-white text-caption font-bold shadow cursor-pointer"
                  >
                    <Eye size={14} />
                  </Button>
                  <Button variant="ghost"
                    type="button"
                    onClick={() => setSampleImageUrl("")}
                    title="Xóa ảnh mẫu"
                    className="h-auto gap-0 p-1.5 rounded-lg bg-danger text-white hover:bg-danger-text text-caption font-bold shadow cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <span className="absolute bottom-1.5 left-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-caption font-bold text-white text-center backdrop-blur-xs truncate">
                  Ảnh mẫu cắm đối chiếu
                </span>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-3 text-center text-text-muted">
                <ImageIcon size={32} className="text-danger mb-1" />
                <span className="text-caption font-bold text-text">Chưa có ảnh mẫu</span>
                <span className="text-caption text-text-muted mt-0.5">Tải ảnh hoặc dán URL</span>
              </div>
            )}
          </div>

          {sampleImageUrl && (
            <div className="text-caption text-success-text font-bold flex items-center gap-1">
              <CheckCircle2 size={12} />
              <span>Đã nạp ảnh chuẩn đầu vào</span>
            </div>
          )}
        </div>

        {/* Cột Phải: Các tùy chọn Tải / Nhập / Dán link ảnh */}
        <div className="flex-1 flex flex-col gap-3 w-full">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-text text-caption flex items-center gap-1.5">
                <Camera size={13} className="text-danger-text" />
                <span>Ảnh Mẫu Sản Phẩm Tiêu Chuẩn Đầu Vào (Master Image Spec) *</span>
              </label>
              <span className="text-caption text-text-muted">Dùng cho AI QC đối chiếu Chặng 05</span>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Dán URL link ảnh mẫu sản phẩm (Zalo, Facebook, Web...)..."
                value={sampleAssetId ? "(ảnh đã tải lên kho của tiệm)" : sampleImageUrl}
                readOnly={Boolean(sampleAssetId)}
                onChange={(e) => {
                  setSampleImageUrl(e.target.value)
                  setSampleAssetId(null)
                }}
                className="flex-1 px-3 py-2 rounded-xl border border-border bg-surface text-text text-caption focus:outline-none focus:border-danger font-medium"
              />

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />

              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 h-auto text-caption font-bold gap-1.5 border-danger-border text-danger-text bg-danger-bg hover:bg-danger-bg shrink-0 cursor-pointer"
              >
                <Upload size={13} />
                <span>{isUploading ? "Đang tải…" : "Tải ảnh lên"}</span>
              </Button>
            </div>
          </div>

          {/* Chọn nhanh ảnh mẫu từ preset */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-dashed border-danger-border">
            <span className="text-caption font-bold text-text-muted flex items-center gap-1">
              <Sparkles size={11} className="text-warning-text" />
              <span>Ảnh mẫu từ Product Master của tiệm:</span>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {masterProducts.filter((p) => p.masterImageUrl).slice(0, 6).map((prod) => (
                <Button variant="outline"
                  key={prod.id}
                  type="button"
                  onClick={() => handleSelectMasterProduct(prod)}
                  className={`h-auto px-2 py-1 rounded-lg border text-caption font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    sampleImageUrl === prod.masterImageUrl
                      ? "border-danger bg-danger-bg/80 text-danger-text font-bold hover:bg-danger-bg/80"
                      : "border-border bg-surface hover:border-danger-border text-text hover:bg-surface"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={prod.masterImageUrl}
                    alt={prod.name}
                    className="w-4 h-4 rounded-full object-cover shrink-0"
                  />
                  <span className="truncate max-w-[120px]">{prod.name}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="p-2 rounded-lg bg-surface/80 border border-border text-caption text-text-muted leading-relaxed">
            💡 <strong>Tiêu chuẩn nghiệp vụ:</strong> Ảnh sản phẩm mẫu là căn cứ kỹ thuật bắt buộc của toàn bộ hành trình điều phối: làm tài liệu cho Thợ/Xưởng chế tác gia công đúng mẫu (Chặng 04), làm dữ liệu đối trọng để <strong>AI QC so sánh độ tương đồng thị giác (Visual Similarity Score)</strong> tại Chặng 05, và lưu vào hồ sơ bàn giao nghiệm thu.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="font-bold text-text block mb-1">Tên mẫu sản phẩm *</label>
          <Input
            type="text"
            required
            placeholder="Ví dụ: Sản phẩm thiết kế nghệ thuật cao cấp"
            value={productTitle}
            onChange={(e) => setProductTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-danger"
          />
        </div>

        <div>
          <label className="font-bold text-text block mb-1">Giá bán báo khách (VNĐ)</label>
          <Input
            type="number"
            value={unitPriceVnd}
            onChange={(e) => setUnitPriceVnd(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-danger"
          />
        </div>
      </div>

      {/* ĐP-4a.4 (26/09/2026, sổ thu §2.14): tuỳ chọn ghi cọc ngay lúc nhận đơn. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <div>
          <label className="font-bold text-text block mb-1">Khách trả trước (cọc, VNĐ)</label>
          <Input
            type="number"
            min={0}
            value={depositVnd || ""}
            onChange={(e) => setDepositVnd(Number(e.target.value) || 0)}
            placeholder="0 = chưa thu, ghi sau ở Sổ thu"
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-danger"
          />
        </div>
        <div className="sm:col-span-2 p-2.5 rounded-xl bg-surface-alt/60 border border-border text-caption flex items-center gap-3 flex-wrap">
          <span className="text-text-muted">
            Tổng <strong className="text-text">{(Number(unitPriceVnd) || 0).toLocaleString("vi-VN")}đ</strong>
          </span>
          <span className="text-text-muted">
            Đã thu <strong className="text-success-text">{(Number(depositVnd) || 0).toLocaleString("vi-VN")}đ</strong>
          </span>
          <span className="text-text-muted">
            Còn phải thu{" "}
            <strong className="text-danger-text">
              {Math.max(0, (Number(unitPriceVnd) || 0) - (Number(depositVnd) || 0)).toLocaleString("vi-VN")}đ
            </strong>
          </span>
        </div>
      </div>

    </>
  )
}
