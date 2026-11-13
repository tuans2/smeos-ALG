"use client"

import React from "react"
import { Plus } from "@/components/ui/icon-set/plus"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { SalesPitchItem } from "@/modules/products/domain/sales-pitch-template"

export interface PitchBomTabProps {
  mainFlowers: SalesPitchItem[]
  addFlower: () => void
  updateFlower: (idx: number, field: keyof SalesPitchItem, value: string | number) => void
  removeFlower: (idx: number) => void
  foliageItems: SalesPitchItem[]
  addFoliage: () => void
  updateFoliage: (idx: number, field: keyof SalesPitchItem, value: string | number) => void
  removeFoliage: (idx: number) => void
  container: string
  setContainer: (val: string) => void
  wrapping: string
  setWrapping: (val: string) => void
  heightCm: number | string
  setHeightCm: (val: number | string) => void
  widthCm: number | string
  setWidthCm: (val: number | string) => void
}

export function PitchBomTab({
  mainFlowers,
  addFlower,
  updateFlower,
  removeFlower,
  foliageItems,
  addFoliage,
  updateFoliage,
  removeFoliage,
  container,
  setContainer,
  wrapping,
  setWrapping,
  heightCm,
  setHeightCm,
  widthCm,
  setWidthCm,
}: PitchBomTabProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Hoa chính */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-caption font-bold text-text flex items-center gap-1.5">
            🌺 Hoa chính ({mainFlowers.length} loại)
          </span>
          <Button variant="outline" size="sm" onClick={addFlower} className="h-7 text-caption gap-1">
            <Plus size={13} /> Thêm nguyên liệu
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {mainFlowers.map((flower, idx) => (
            <div
              key={flower.id ?? idx}
              className="grid grid-cols-12 gap-2 items-center bg-surface-alt p-2.5 rounded-xl border border-border text-caption"
            >
              <div className="col-span-4">
                <Input
                  type="text"
                  value={flower.name}
                  onChange={(e) => updateFlower(idx, "name", e.target.value)}
                  placeholder="Tên hoa (VD: Tulip)"
                  className="w-full h-8 text-caption font-semibold"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  value={flower.quantity ?? ""}
                  onChange={(e) => updateFlower(idx, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Số lượng"
                  className="w-full h-8 text-caption font-bold text-center"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="text"
                  value={flower.unit}
                  onChange={(e) => updateFlower(idx, "unit", e.target.value)}
                  placeholder="ĐVT (cành/bông)"
                  className="w-full h-8 text-caption"
                />
              </div>
              <div className="col-span-3">
                <Input
                  type="text"
                  value={flower.color ?? ""}
                  onChange={(e) => updateFlower(idx, "color", e.target.value)}
                  placeholder="Tone màu (Vàng/Đỏ...)"
                  className="w-full h-8 text-caption"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFlower(idx)}
                  className="p-1 h-auto text-text-muted hover:text-danger transition-colors"
                  aria-label="Xóa dòng hoa này"
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lá phụ & đệm */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-caption font-bold text-text flex items-center gap-1.5">
            🌿 Lá đệm ({foliageItems.length} loại)
          </span>
          <Button variant="outline" size="sm" onClick={addFoliage} className="h-7 text-caption gap-1">
            <Plus size={13} /> Thêm lá đệm
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {foliageItems.map((foliage, idx) => (
            <div
              key={foliage.id ?? idx}
              className="grid grid-cols-12 gap-2 items-center bg-surface-alt p-2 rounded-xl border border-border text-caption"
            >
              <div className="col-span-5">
                <Input
                  type="text"
                  value={foliage.name}
                  onChange={(e) => updateFoliage(idx, "name", e.target.value)}
                  placeholder="Tên lá (Lá chanh, lá bạc...)"
                  className="w-full h-8 text-caption font-medium"
                />
              </div>
              <div className="col-span-3">
                <Input
                  type="number"
                  value={foliage.quantity ?? ""}
                  onChange={(e) => updateFoliage(idx, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Số lượng"
                  className="w-full h-8 text-caption text-center"
                />
              </div>
              <div className="col-span-3">
                <Input
                  type="text"
                  value={foliage.unit}
                  onChange={(e) => updateFoliage(idx, "unit", e.target.value)}
                  placeholder="Đơn vị"
                  className="w-full h-8 text-caption"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFoliage(idx)}
                  className="p-1 h-auto text-text-muted hover:text-danger"
                  aria-label="Xóa dòng lá đệm này"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vật chứa, Giấy gói & Kích thước */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-3 border-t border-border">
        <div>
          <label className="text-caption font-bold text-text-muted block mb-1">Vật chứa (Bình/Giỏ/Bó)</label>
          <Input
            type="text"
            value={container}
            onChange={(e) => setContainer(e.target.value)}
            className="w-full"
            placeholder="Bình gốm, Giỏ mây, Sản phẩm..."
          />
        </div>

        <div>
          <label className="text-caption font-bold text-text-muted block mb-1">Chất liệu giấy gói / Nơ</label>
          <Input
            type="text"
            value={wrapping}
            onChange={(e) => setWrapping(e.target.value)}
            className="w-full"
            placeholder="Giấy lụa, Giấy xi măng..."
          />
        </div>

        <div>
          <label className="text-caption font-bold text-text-muted block mb-1">Chiều cao ước tính (cm)</label>
          <Input
            type="number"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            className="w-full"
            placeholder="55"
          />
        </div>

        <div>
          <label className="text-caption font-bold text-text-muted block mb-1">Chiều rộng ước tính (cm)</label>
          <Input
            type="number"
            value={widthCm}
            onChange={(e) => setWidthCm(e.target.value)}
            className="w-full"
            placeholder="40"
          />
        </div>
      </div>
    </div>
  )
}
