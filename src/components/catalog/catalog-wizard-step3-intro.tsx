"use client"

import { Textarea } from "@/components/ui/textarea"
import React from "react"
import { Wand2, Check } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface CatalogWizardStep3IntroProps {
  name: string
  setName: (name: string) => void
  desc: string
  setDesc: (desc: string) => void
  selectedCount: number
  sampleProductTerm: string
  styleName: string
  isAiGenerating: boolean
  onAiWriteIntro: () => void
}

export function CatalogWizardStep3Intro({
  name,
  setName,
  desc,
  setDesc,
  selectedCount,
  sampleProductTerm,
  styleName,
  isAiGenerating,
  onAiWriteIntro,
}: CatalogWizardStep3IntroProps) {
  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <h3 className="text-title font-bold text-text">Thông tin hiển thị & Lời chào khách</h3>
        <p className="text-body-sm text-text-muted mt-0.5">
          Đặt tên bộ sưu tập và để AI tạo lời tự sự giới thiệu chuyên nghiệp.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-caption font-bold text-text mb-1">
            Tên Catalog / Bộ sưu tập <span className="text-destructive">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`VD: Bộ sưu tập ${sampleProductTerm} Mới Về Hôm Nay...`}
            className="text-body-sm"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-caption font-bold text-text">Lời chào & Mô tả Catalog</label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!name.trim() || isAiGenerating}
              onClick={onAiWriteIntro}
              className="text-caption text-primary hover:bg-primary-muted/20 h-7 gap-1"
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span>{isAiGenerating ? "AI đang viết..." : "✨ AI Viết Lời Chào"}</span>
            </Button>
          </div>
          <Textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
            placeholder="Nhập lời chào khách khi mở link catalog..."
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="p-4 rounded-xl bg-surface-alt/70 border border-border flex items-center justify-between">
          <div>
            <div className="text-body-sm font-bold text-text">{name || "Chưa đặt tên Catalog"}</div>
            <div className="text-caption text-text-muted mt-0.5">
              Phong cách: <strong className="text-text">{styleName}</strong> • Gồm{" "}
              <strong className="text-primary">{selectedCount}</strong> {sampleProductTerm} tuyển chọn
            </div>
          </div>
          <div className="text-caption text-success font-semibold flex items-center gap-1">
            <Check className="h-4 w-4" /> Đã sẵn sàng xuất bản
          </div>
        </div>
      </div>
    </div>
  )
}
