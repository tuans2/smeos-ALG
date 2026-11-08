"use client"

import { useCallback, useEffect, useState } from "react"
import type { Route } from "next"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { errorText } from "@/lib/error-text"
import {
  CONTENT_STEPS, contentLockedReason, contentStepStatuses, currentContentStep, toContentFlags, type ContentStep,
} from "@/modules/content-studio/domain/content-journey"
import { fetchContentProduct, type ContentProductView } from "./content-api"

/** Khoá URL: nhóm đang mở trên /cong-cu và sản phẩm đang làm — tải lại trang vẫn đúng chỗ. */
export const MODULE_PARAM = "muc"
export const PRODUCT_PARAM = "sp"

/**
 * Điều khiển hành trình Tạo nội dung: "sản phẩm đang làm" (giữ trên URL), dữ liệu đã duyệt của nó, bước đang mở và
 * khoá bước (cùng luật `contentLockedReason` máy chủ dùng).
 */
export function useContentJourney() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const productId = params.get(PRODUCT_PARAM)
  const [view, setView] = useState<ContentProductView | null>(null)
  const [failed, setFailed] = useState<{ id: string; message: string } | null>(null)
  const [picked, setPicked] = useState<ContentStep | null>(null)

  const apply = useCallback((id: string, p: Promise<ContentProductView>) =>
    p.then((v) => { setView(v); setFailed(null); return v })
      .catch((e: unknown) => { setFailed({ id, message: errorText(e) || "Chưa tải được sản phẩm đang làm" }); return null }), [])

  /** Tải lại sau khi ghi (duyệt, chốt thẻ…) — gọi từ thao tác của user. */
  const reload = useCallback(async (): Promise<ContentProductView | null> => {
    if (!productId) return null
    return apply(productId, fetchContentProduct(productId))
  }, [productId, apply])

  useEffect(() => {
    if (productId) void apply(productId, fetchContentProduct(productId))
  }, [productId, apply])

  const error = failed && failed.id === productId ? failed.message : null
  const loading = Boolean(productId) && view?.product.id !== productId && error === null

  const flags = view && view.product.id === productId ? toContentFlags(view.flags) : null
  const statuses = contentStepStatuses(flags)
  const isOpen = (k: ContentStep) => contentLockedReason(k, flags) === null
  const step: ContentStep = picked && isOpen(picked) ? picked : currentContentStep(flags)
  const nextLocked = CONTENT_STEPS.find((k) => !isOpen(k)) ?? null

  /** Đổi sản phẩm đang làm (hoặc bỏ chọn) — ghi lên URL, giữ nhóm "Tạo nội dung" đang mở. */
  const setProduct = useCallback((id: string | null, openStep?: ContentStep) => {
    const q = new URLSearchParams(params.toString())
    q.set(MODULE_PARAM, "content")
    if (id) q.set(PRODUCT_PARAM, id)
    else q.delete(PRODUCT_PARAM)
    setPicked(openStep ?? null)
    router.replace(`${pathname}?${q.toString()}` as Route, { scroll: false })
  }, [params, pathname, router])

  const go = (k: ContentStep) => { if (isOpen(k)) setPicked(k) }

  return { productId, view: flags ? view : null, flags, loading, error, statuses, step, nextLocked, go, setProduct, reload, setPicked }
}

export type ContentJourney = ReturnType<typeof useContentJourney>
