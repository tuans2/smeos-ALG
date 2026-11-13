"use client"

import { Button } from "@/components/ui/button"
import React, { useState } from "react"
import { Check, Copy } from "@/components/ui/icons"

/** Nút "Sao chép tin báo khách" — dán gửi khách qua Zalo khi tiệm chưa bật Zalo ZNS/SMS. */
export function CopyCustomerMessage({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button variant="outline"
      type="button"
      title={text}
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => setCopied(true), () => setCopied(false))
      }}
      className="py-0 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-success-border bg-surface px-3 text-caption font-bold text-success hover:bg-surface"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Đã chép tin" : "Sao chép tin báo khách"}
    </Button>
  )
}
