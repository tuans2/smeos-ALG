"use client"

import "@/lib/brand-storage-migration"

import { useEffect, useRef, useState } from "react"

const PREFIX = "alg:brochure:"
const LEGACY_PREFIX = "floraos:brochure:"
const TTL_MS = 7 * 86_400_000

/** Đọc/ghi localStorage an toàn (tab ẩn danh, bộ nhớ bị chặn → coi như không có). */
function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key) ?? window.localStorage.getItem(LEGACY_PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { at: number; value: T }
    if (Date.now() - parsed.at > TTL_MS) {
      window.localStorage.removeItem(PREFIX + key)
      window.localStorage.removeItem(LEGACY_PREFIX + key)
      return null
    }
    return parsed.value
  } catch {
    return null
  }
}

function write<T>(key: string, value: T | null): void {
  try {
    if (value === null) window.localStorage.removeItem(PREFIX + key)
    else window.localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), value }))
  } catch {
    // bộ nhớ trình duyệt bị chặn — bỏ qua, trang vẫn chạy bình thường
  }
}

/**
 * State nhớ trên chính máy khách theo trang đang mở (giữ 7 ngày): khách đóng tab rồi
 * mở lại link vẫn thấy mẫu đã thích / thông tin đang điền dở. Không gửi lên máy chủ.
 */
export function useSavedState<T>(
  name: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void, () => void, boolean] {
  const keyRef = useRef<string | null>(null)
  const restored = useRef(false)
  const [value, setValue] = useState<T>(initial)
  // `true` sau khi đã đọc xong bộ nhớ máy khách — trước đó `value` mới chỉ là giá trị khởi tạo
  const [ready, setReady] = useState(false)

  // Lượt ghi chạy ngay sau khi khôi phục vẫn mang giá trị khởi tạo — bỏ qua, kẻo đè mất giá trị đã lưu
  // trước khi phần khác của trang kịp đọc (vd. mẫu đang chọn khi khôi phục bước)
  const skipWrite = useRef(false)

  useEffect(() => {
    keyRef.current = `${window.location.pathname}:${name}`
    const saved = read<T>(keyRef.current)
    if (saved !== null) setValue(saved)
    restored.current = true
    skipWrite.current = true
    setReady(true)
  }, [name])

  // Ghi sau mỗi lần đổi (bỏ qua lần dựng đầu, trước khi khôi phục)
  useEffect(() => {
    if (skipWrite.current) {
      skipWrite.current = false
      return
    }
    if (restored.current && keyRef.current) write(keyRef.current, value)
  }, [value])

  const clear = () => {
    restored.current = false
    if (keyRef.current) write(keyRef.current, null)
  }
  return [value, setValue, clear, ready]
}

/** Sửa một giá trị đã lưu của trang đang mở khi component sở hữu nó không còn hiện (vd. gắn mã đơn). */
export function updateSavedState<T>(name: string, update: (prev: T) => T): void {
  const key = `${window.location.pathname}:${name}`
  const prev = read<T>(key)
  if (prev !== null) write(key, update(prev))
}

/** Đọc / ghi thẳng một giá trị đã lưu của trang đang mở (không qua state React). */
export function readSavedState<T>(name: string): T | null {
  return read<T>(`${window.location.pathname}:${name}`)
}

export function writeSavedState<T>(name: string, value: T | null): void {
  write(`${window.location.pathname}:${name}`, value)
}
