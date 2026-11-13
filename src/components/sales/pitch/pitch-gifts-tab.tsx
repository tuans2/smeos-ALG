"use client"

import React from "react"
import { Gift } from "@/components/ui/icon-set/gift"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface PitchGiftsTabProps {
  freeGifts: string[]
  setFreeGifts: React.Dispatch<React.SetStateAction<string[]>>
  removeGiftItem: (idx: number) => void
  newGift: string
  setNewGift: (val: string) => void
  addGiftItem: () => void
  guarantees: string[]
  setGuarantees: React.Dispatch<React.SetStateAction<string[]>>
  removeGuaranteeItem: (idx: number) => void
  newGuarantee: string
  setNewGuarantee: (val: string) => void
  addGuaranteeItem: () => void
}

export function PitchGiftsTab({
  freeGifts,
  setFreeGifts,
  removeGiftItem,
  newGift,
  setNewGift,
  addGiftItem,
  guarantees,
  setGuarantees,
  removeGuaranteeItem,
  newGuarantee,
  setNewGuarantee,
  addGuaranteeItem,
}: PitchGiftsTabProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Quà tặng */}
      <div>
        <span className="text-caption font-bold text-text block mb-2">🎁 Quà tặng kèm theo cho khách</span>
        <div className="flex flex-col gap-2 mb-2">
          {freeGifts.map((gift, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-surface-alt px-3 py-2 rounded-xl border border-border text-caption">
              <Gift size={14} className="text-primary flex-shrink-0" />
              <Input
                type="text"
                value={gift}
                onChange={(e) => {
                  const val = e.target.value
                  setFreeGifts((prev) => prev.map((g, i) => (i === idx ? val : g)))
                }}
                className="flex-1 bg-transparent border-none outline-none font-medium text-caption"
              />
              <Button
                aria-label="Xóa quà tặng"
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeGiftItem(idx)}
                className="p-1 h-auto text-text-muted hover:text-danger"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={newGift}
            onChange={(e) => setNewGift(e.target.value)}
            placeholder="+ Thêm quà tặng (VD: Tặng thiệp viết tay...)"
            className="flex-1 text-caption"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addGiftItem()
              }
            }}
          />
          <Button size="sm" variant="outline" onClick={addGiftItem} className="text-caption">
            Thêm
          </Button>
        </div>
      </div>

      {/* Cam kết */}
      <div>
        <span className="text-caption font-bold text-text block mb-2">🛡️ Cam kết dịch vụ từ Shop</span>
        <div className="flex flex-col gap-2 mb-2">
          {guarantees.map((gua, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-surface-alt px-3 py-2 rounded-xl border border-border text-caption">
              <ShieldCheck size={14} className="text-success flex-shrink-0" />
              <Input
                type="text"
                value={gua}
                onChange={(e) => {
                  const val = e.target.value
                  setGuarantees((prev) => prev.map((g, i) => (i === idx ? val : g)))
                }}
                className="flex-1 bg-transparent border-none outline-none font-medium text-caption"
              />
              <Button
                aria-label="Xóa cam kết"
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeGuaranteeItem(idx)}
                className="p-1 h-auto text-text-muted hover:text-danger"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={newGuarantee}
            onChange={(e) => setNewGuarantee(e.target.value)}
            placeholder="+ Thêm cam kết (VD: Chụp hình trước khi giao...)"
            className="flex-1 text-caption"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addGuaranteeItem()
              }
            }}
          />
          <Button size="sm" variant="outline" onClick={addGuaranteeItem} className="text-caption">
            Thêm
          </Button>
        </div>
      </div>
    </div>
  )
}
