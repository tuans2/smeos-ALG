"use client"

import "@/lib/brand-storage-migration"

import { useEffect, useState } from "react"
import { familyResumeTarget, type FamilyMember } from "@/modules/greeting-card/domain/order-family"

const KEY = "alg:order-family:"
const LEGACY_KEY = "floraos:order-family:"
/** Khách chủ động mở trang này (Đặt thêm đơn / Lịch sử đơn hàng) → không tự chuyển đi nơi khác. */
const CHOSEN_PARAM = "chon"

/** Đường dẫn mở một đơn trong nhóm theo lựa chọn của khách. */
export function familyHref(sendCode: string): string {
  return `/b/${encodeURIComponent(sendCode)}?${CHOSEN_PARAM}=1`
}

function readPosition(root: string): string | null {
  try {
    return window.localStorage.getItem(KEY + root) ?? window.localStorage.getItem(LEGACY_KEY + root)
  } catch {
    return null
  }
}

function writePosition(root: string, sendCode: string): void {
  try {
    window.localStorage.setItem(KEY + root, sendCode)
  } catch {
    // bộ nhớ trình duyệt bị chặn — bỏ qua, khách vẫn về đơn mới nhất
  }
}

/**
 * Nhóm đơn của khách trên link này + tự về đúng đơn đang làm dở: mở lại link cũ (từ Zalo…) sau khi đã
 * "Đặt thêm đơn" thì chuyển sang đơn khách đứng lần trước trên máy này (không có thì đơn mới nhất).
 * Ghi chỗ đứng TRƯỚC khi chuyển để trang đích không chuyển ngược lại (không vòng lặp).
 */
export function useOrderFamily(sendCode: string, enabled: boolean): { members: FamilyMember[]; redirecting: boolean } {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const url = new URL(window.location.href)
    const chosen = url.searchParams.has(CHOSEN_PARAM)
    if (chosen) {
      // Bỏ dấu "đã chọn" khỏi địa chỉ: lần mở sau (tải lại / mở từ lịch sử trình duyệt) lại theo chỗ đứng đã nhớ
      url.searchParams.delete(CHOSEN_PARAM)
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`)
    }
    void fetch(`/api/v1/public/brochure/${encodeURIComponent(sendCode)}/history`)
      .then((res) => (res.ok ? (res.json() as Promise<{ data: { rootSendCode: string; members: FamilyMember[] } }>) : null))
      .then((body) => {
        if (cancelled || !body) return
        const { rootSendCode, members: list } = body.data
        setMembers(list)
        const target = chosen ? null : familyResumeTarget(list, sendCode, readPosition(rootSendCode))
        if (target) {
          writePosition(rootSendCode, target)
          setRedirecting(true)
          window.location.replace(`/b/${encodeURIComponent(target)}`)
          return
        }
        writePosition(rootSendCode, sendCode)
      })
      .catch(() => {
        // Mất mạng: ở yên trang hiện tại, không hiện lịch sử
      })
    return () => {
      cancelled = true
    }
  }, [sendCode, enabled])

  return { members, redirecting }
}
