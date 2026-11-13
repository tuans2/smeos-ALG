"use client"

import React, { useRef } from "react"
import { Camera, ImageUp } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"

interface PhotoSourcePickerProps {
  hint: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onOpen?: () => void
}

/**
 * Hai nút chọn nguồn ảnh: chụp bằng camera hoặc tải từ thư viện ảnh của máy.
 * Một input dùng `capture` (mở camera trên di động), input còn lại không có `capture`
 * để hệ điều hành cho phép chọn ảnh có sẵn.
 */
export function PhotoSourcePicker({ hint, onChange, onOpen }: PhotoSourcePickerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  function open(ref: React.RefObject<HTMLInputElement | null>) {
    onOpen?.()
    ref.current?.click()
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e)
    // Cho phép chọn lại cùng một ảnh sau khi hủy xem trước
    e.target.value = ""
  }

  const buttonClass =
    "h-20 border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all text-primary font-bold text-body-sm"

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => open(cameraInputRef)} className={buttonClass}>
          <Camera size={20} />
          <span>Chụp ảnh</span>
        </Button>
        <Button variant="outline" onClick={() => open(galleryInputRef)} className={buttonClass}>
          <ImageUp size={20} />
          <span>Tải ảnh từ máy</span>
        </Button>
      </div>
      <p className="text-caption text-text-muted text-center">{hint}</p>
    </div>
  )
}
