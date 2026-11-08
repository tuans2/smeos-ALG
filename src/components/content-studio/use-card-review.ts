"use client"

import { useCallback, useEffect, useState } from "react"
import type { ResultFieldItem } from "@/components/result/result-card"
import { errorText } from "@/lib/error-text"
import { applyFieldAdd, applyFieldChange, applyFieldRemove, applyItemChange, type AnalysisData } from "@/modules/products/domain/analysis-field-edits"
import {
  approveCard, approveCopy, fetchContentProduct, generateCopy, rejectCard, saveCardDraft, saveCopyDraft, type ScanResult,
} from "./content-api"

type Json = Record<string, unknown>

const LIST_ID_PREFIX: Record<string, string> = { suggested_tags: "tag", suggested_occasions: "occ", key_selling_points: "usp" }

export type ReviewStage = "card" | "writing" | "copy" | "finished"

/**
 * Duyệt một Thẻ sản phẩm rồi Bài giới thiệu của nó (Bước 1): sửa trường → lưu nháp / duyệt; duyệt Thẻ thì hệ thống
 * tạo sản phẩm trong Kho và viết ngay Bài giới thiệu; duyệt Bài giới thiệu là xong Bước 1 cho sản phẩm đó.
 * Mở lại một thẻ đã duyệt → đi tiếp từ chỗ dừng (đọc dữ liệu thật của sản phẩm, không đoán).
 */
export function useCardReview(result: ScanResult, onProductReady: (productId: string) => Promise<void>) {
  // Nơi gọi gắn `key={result.id}` — mỗi thẻ một state mới, không cần đặt lại trong effect
  const resume = result.approval_state === "APPROVED" && result.product_id !== null
  const [stage, setStage] = useState<ReviewStage>(resume ? "writing" : "card")
  const [card, setCard] = useState<AnalysisData | null>(result.data)
  const [productId, setProductId] = useState<string | null>(result.product_id)
  const [copyId, setCopyId] = useState<string | null>(null)
  const [copy, setCopy] = useState<Json | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const run = useCallback(async (label: string, fn: () => Promise<void>) => {
    setBusy(label)
    setError(null)
    try { await fn() } catch (e) { setError(errorText(e) || "Chưa thực hiện được — thử lại") } finally { setBusy(null) }
  }, [])

  const writeCopy = useCallback(async (analysisId: string, pid: string) => {
    setStage("writing")
    try {
      const r = await generateCopy(analysisId, pid)
      setCopyId(r.copyId)
      setCopy(r.data)
      setStage("copy")
    } catch (e) {
      setStage("card")
      throw e
    }
  }, [])

  // Thẻ đã duyệt → đọc sản phẩm để biết Bài giới thiệu đang ở đâu (chỉ cập nhật state trong callback)
  useEffect(() => {
    if (!resume || !result.product_id) return
    const pid = result.product_id
    let alive = true
    fetchContentProduct(pid)
      .then(async (view) => {
        if (!alive) return
        if (view.copy?.approval_state === "APPROVED") { setStage("finished"); return }
        if (view.copy?.approval_state === "PENDING") { setCopyId(view.copy.id); setCopy(view.copy.data); setStage("copy"); return }
        await writeCopy(result.id, pid)
      })
      .catch((e: unknown) => { if (alive) { setStage("card"); setError(errorText(e) || "Chưa mở được sản phẩm") } })
    return () => { alive = false }
  }, [resume, result.id, result.product_id, writeCopy])

  const cardEdits = {
    onFieldChange: (k: string, v: string | number | string[]) => setCard((p) => (p ? applyFieldChange(p, k, v) : p)),
    onFieldAdd: (k: string, item: ResultFieldItem) => setCard((p) => (p ? applyFieldAdd(p, k, item) : p)),
    onFieldRemove: (k: string, id: string) => setCard((p) => (p ? applyFieldRemove(p, k, id) : p)),
    onItemChange: (k: string, id: string, item: ResultFieldItem) => setCard((p) => (p ? applyItemChange(p, k, id, item) : p)),
  }

  const listOf = (k: string): string[] => (Array.isArray(copy?.[k]) ? (copy?.[k] as unknown[]).map(String) : [])
  const copyEdits = {
    onFieldChange: (k: string, v: string | number | string[]) => setCopy((p) => ({ ...(p ?? {}), [k]: v })),
    onFieldAdd: (k: string, item: ResultFieldItem) => { if (item.value) setCopy((p) => ({ ...(p ?? {}), [k]: [...listOf(k), item.value] })) },
    // Mã dòng do `mapProductCopyToFields` đặt: tag-i / occ-i / usp-i
    onFieldRemove: (k: string, id: string) => {
      const prefix = LIST_ID_PREFIX[k] ?? k
      setCopy((p) => ({ ...(p ?? {}), [k]: listOf(k).filter((v, i) => `${prefix}-${i}` !== id && v !== id) }))
    },
  }

  const saveCard = () => run("Đang lưu…", async () => {
    if (!card) return
    await saveCardDraft(result.id, card)
    setSavedAt(Date.now())
  })

  const approveCardAndWrite = () => run("Đang duyệt Thẻ sản phẩm…", async () => {
    if (!card) return
    await saveCardDraft(result.id, card)
    const pid = await approveCard(result.id)
    setProductId(pid)
    await writeCopy(result.id, pid)
  })

  const discardCard = () => run("Đang bỏ thẻ…", async () => {
    await rejectCard(result.id)
    setStage("finished")
  })

  const saveCopy = () => run("Đang lưu…", async () => {
    if (!copyId || !copy) return
    await saveCopyDraft(copyId, copy)
    setSavedAt(Date.now())
  })

  const approveCopyAndFinish = () => run("Đang duyệt Bài giới thiệu…", async () => {
    if (!copyId || !copy || !productId) return
    await saveCopyDraft(copyId, copy)
    await approveCopy(copyId)
    setStage("finished")
    await onProductReady(productId)
  })

  return { stage, card, copy, productId, busy, error, savedAt, cardEdits, copyEdits, saveCard, approveCardAndWrite, discardCard, saveCopy, approveCopyAndFinish }
}
