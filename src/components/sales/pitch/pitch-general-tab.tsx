"use client"

import React from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

export interface PitchGeneralTabProps {
  productName: string
  setProductName: (val: string) => void
  sku: string
  setSku: (val: string) => void
  style: string
  setStyle: (val: string) => void
  price: number | string
  setPrice: (val: number | string) => void
  originalPrice: number | string
  setOriginalPrice: (val: number | string) => void
  shopHotline: string
  setShopHotline: (val: string) => void
  shopName: string
  setShopName: (val: string) => void
  occasions: string[]
  removeOccasion: (idx: number) => void
  newOccasion: string
  setNewOccasion: (val: string) => void
  addOccasion: () => void
  description: string
  setDescription: (val: string) => void
  customNote: string
  setCustomNote: (val: string) => void
}

export function PitchGeneralTab({
  productName,
  setProductName,
  sku,
  setSku,
  style,
  setStyle,
  price,
  setPrice,
  originalPrice,
  setOriginalPrice,
  shopHotline,
  setShopHotline,
  shopName,
  setShopName,
  occasions,
  removeOccasion,
  newOccasion,
  setNewOccasion,
  addOccasion,
  description,
  setDescription,
  customNote,
  setCustomNote,
}: PitchGeneralTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="text-caption font-bold text-text-muted block mb-1">Tên sản phẩm</label>
          <Input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="w-full font-bold"
            placeholder="Ví dụ: Bó Tulip Vàng Nắng Hoàng Kim..."
          />
        </div>

        <div>
          <label className="text-caption font-bold text-text-muted block mb-1">Mã SKU / Tham chiếu</label>
          <Input
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="w-full font-mono"
            placeholder="TL-001"
          />
        </div>

        <div>
          <label className="text-caption font-bold text-text-muted block mb-1">Phong cách thiết kế</label>
          <Input
            type="text"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="w-full"
            placeholder="Hiện đại, Cổ điển, Hàn Quốc..."
          />
        </div>
      </div>

      {/* Pricing & Hotline */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 bg-primary/[0.03] p-3.5 rounded-xl border border-primary/20">
        <div>
          <label className="text-caption font-bold text-primary block mb-1">Giá chào ưu đãi (VND) *</label>
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full border-2 border-primary/60 font-bold text-primary"
            placeholder="850000"
          />
        </div>

        <div>
          <label className="text-caption font-bold text-text-muted block mb-1">Giá gốc niêm yết (nếu có)</label>
          <Input
            type="number"
            value={originalPrice}
            onChange={(e) => setOriginalPrice(e.target.value)}
            className="w-full"
            placeholder="1000000"
          />
        </div>

        <div>
          <label className="text-caption font-bold text-text-muted block mb-1">Hotline tư vấn</label>
          <Input
            type="text"
            value={shopHotline}
            onChange={(e) => setShopHotline(e.target.value)}
            className="w-full"
            placeholder="1900 xxxx hoặc 090..."
          />
        </div>

        <div>
          <label className="text-caption font-bold text-text-muted block mb-1">Tên cửa hàng / Thương hiệu</label>
          <Input
            type="text"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            className="w-full"
            placeholder="ALG Boutique"
          />
        </div>
      </div>

      {/* Dịp sử dụng (Tag pills) */}
      <div>
        <label className="text-caption font-bold text-text-muted block mb-1.5">Dịp phù hợp tặng hoa</label>
        <div className="flex flex-wrap items-center gap-2">
          {occasions.map((occ, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 rounded-lg bg-surface-alt px-2.5 py-1 text-caption font-semibold text-text border border-border"
            >
              {occ}
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => removeOccasion(idx)}
                className="h-auto p-0 text-text-muted hover:text-danger leading-none"
                aria-label={`Xóa dịp ${occ}`}
              >
                ×
              </Button>
            </span>
          ))}
          <div className="inline-flex items-center gap-1">
            <Input
              type="text"
              value={newOccasion}
              onChange={(e) => setNewOccasion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addOccasion()
                }
              }}
              placeholder="+ Thêm dịp..."
              className="h-7 w-28 text-caption"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOccasion}
              className="h-7 px-2 text-caption"
            >
              Thêm
            </Button>
          </div>
        </div>
      </div>

      {/* Mô tả cảm xúc */}
      <div>
        <label className="text-caption font-bold text-text-muted block mb-1">Mô tả cảm xúc & thông điệp chào hàng</label>
        <Textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full resize-none leading-relaxed"
          placeholder="Nhập thông điệp ý nghĩa dành cho khách hàng..."
        />
      </div>

      {/* Ghi chú riêng */}
      <div>
        <label className="text-caption font-bold text-text-muted block mb-1">Ghi chú riêng / Ưu đãi đặc biệt cho đợt chào này</label>
        <Input
          type="text"
          value={customNote}
          onChange={(e) => setCustomNote(e.target.value)}
          className="w-full"
          placeholder="Ví dụ: Giảm thêm 50k khi đặt trước 12h trưa nay..."
        />
      </div>
    </div>
  )
}
