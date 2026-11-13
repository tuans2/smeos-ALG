"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAnnounce } from "@/components/ui/live-region"
import { ClipboardBlockedError, copyFromServer, copyText } from "@/components/greeting-card/share/tracked-copy"

/** Sao chép link vào clipboard; trả về khóa vừa chép để hiện trạng thái "Đã chép". */
export function useCopyLink() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [copyError, setCopyError] = useState<string | null>(null)
  /** Link để khách chép tay khi trình duyệt chặn chép (ô có link hiện sẵn thì không cần). */
  const [copyFallback, setCopyFallback] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { announce } = useAnnounce()

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  /** `text` là chuỗi có sẵn, hoặc hàm lấy link từ máy chủ (link mang tên người bấm). */
  const copy = useCallback(
    async (key: string, text: string | (() => Promise<string>)) => {
      try {
        if (typeof text === "string") await copyText(text)
        else await copyFromServer(text)
        setCopyError(null)
        setCopyFallback(null)
        setCopiedKey(key)
        announce("Đã sao chép link")
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setCopiedKey(null), 2500)
      } catch (err) {
        // Máy chủ từ chối (vd. hồ sơ tiệm còn là thông tin mẫu) → hiện đúng lý do, không đổ cho trình duyệt
        setCopyError(err instanceof Error && err.message ? err.message : "Không sao chép được link")
        setCopyFallback(err instanceof ClipboardBlockedError ? err.text : null)
      }
    },
    [announce],
  )

  return { copy, copiedKey, copyError, copyFallback }
}
