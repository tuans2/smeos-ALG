"use client"

import { InfoTip } from "@/components/ui/info-tip"
import React from "react"
import { Layers } from "@/components/ui/icon-set/layers"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getDesignFieldsConfig } from "./create-product-types"
import { MultiSelectDropdown } from "./multi-select-dropdown"
import { SingleSelectCustom } from "./single-select-custom"

interface CreateDesignCardProps {
  industryKey?: string
  shape: string
  setShape: (v: string) => void
  facing: string
  setFacing: (v: string) => void
  container: string
  setContainer: (v: string) => void
  primaryColor: string
  setPrimaryColor: (v: string) => void
}

export function CreateDesignCard({
  industryKey,
  shape,
  setShape,
  facing,
  setFacing,
  container,
  setContainer,
  primaryColor,
  setPrimaryColor,
}: CreateDesignCardProps) {
  const cfg = getDesignFieldsConfig(industryKey)

  return (
    <Card className="p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-title-sm font-bold text-text">
            <Layers size={18} className="text-primary" />
            <span>{cfg.cardTitle}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-bold bg-danger-bg text-danger-text border border-danger/30">
              <ShieldCheck size={10} />
              Đặc điểm niêm yết cam kết *
            </span>
            <InfoTip label="Đặc điểm niêm yết">Hiển thị công khai cho khách — phải khớp chính xác với sản phẩm bàn giao thực tế.</InfoTip>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
        {/* Shape — single select tuỳ biến */}
        <div className="space-y-1">
          <label className="block text-caption font-semibold text-text">
            {cfg.shapeLabel}
          </label>
          <SingleSelectCustom
            ariaLabel={cfg.shapeLabel}
            options={cfg.shapeOptions}
            value={shape}
            onChange={setShape}
            placeholder={`Chọn ${cfg.shapeLabel.toLowerCase()}...`}
            customPlaceholder="Nhập loại hình khác..."
          />
        </div>

        {/* Facing — single hoặc multi-select */}
        <div className="space-y-1">
          <label className="block text-caption font-semibold text-text">
            {cfg.facingLabel}
            {cfg.facingMultiple && (
              <span className="ml-1 text-primary font-normal">(chọn nhiều)</span>
            )}
          </label>
          {cfg.facingMultiple ? (
            <MultiSelectDropdown
              ariaLabel={cfg.facingLabel}
              options={cfg.facingOptions}
              value={facing}
              onChange={setFacing}
              placeholder="Chọn hướng nhìn..."
              customPlaceholder="Nhập hướng view khác..."
            />
          ) : (
            <SingleSelectCustom
              ariaLabel={cfg.facingLabel}
              options={cfg.facingOptions}
              value={facing}
              onChange={setFacing}
              placeholder="Chọn hướng nhìn..."
              customPlaceholder="Nhập hướng view khác..."
            />
          )}
        </div>

        {/* Container — single select, multi-select hoặc free-text */}
        <div className="space-y-1">
          <label className="block text-caption font-semibold text-text">
            {cfg.containerLabel}
            {cfg.containerMultiple && (
              <span className="ml-1 text-primary font-normal">(chọn nhiều)</span>
            )}
          </label>
          {cfg.containerOptions && cfg.containerMultiple ? (
            <MultiSelectDropdown
              ariaLabel={cfg.containerLabel}
              options={cfg.containerOptions}
              value={container}
              onChange={setContainer}
              placeholder={cfg.containerPlaceholder}
              customPlaceholder="Nhập tiện nghi / chất liệu khác..."
            />
          ) : cfg.containerOptions ? (
            <SingleSelectCustom
              ariaLabel={cfg.containerLabel}
              options={cfg.containerOptions}
              value={container}
              onChange={setContainer}
              placeholder={cfg.containerPlaceholder}
              customPlaceholder="Nhập loại bao bì / chất liệu khác..."
            />
          ) : (
            // free-text fallback
            <Input
              type="text"
              value={container}
              onChange={(e) => setContainer(e.target.value)}
              placeholder={cfg.containerPlaceholder}
              className="h-10 text-body-sm"
            />
          )}
        </div>

        {/* Tông màu chủ đạo — luôn free-text */}
        <div className="space-y-1">
          <label className="block text-caption font-semibold text-text">
            Tông màu chủ đạo
          </label>
          <Input
            type="text"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            placeholder="Đỏ, Pastel, Trắng kem..."
            className="h-10 text-body-sm"
          />
        </div>
      </div>
    </Card>
  )
}
