"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { InternalChatConversation, InternalChatMessage } from "@/modules/internal-chat/domain/chat-entities"

export type LoadState = "loading" | "ready" | "error" | "forbidden"

// Không có luồng đẩy (SSE): hỏi lại dày; có luồng đẩy: hỏi lại thưa — chỉ để cập nhật trạng thái thẻ đơn gia công
const LIST_POLL_MS = { push: 60_000, poll: 15_000 }
const THREAD_POLL_MS = { push: 30_000, poll: 5_000 }
const API = "/api/v1/internal-chat/conversations"

/** Đường dẫn mở thẳng phòng: ?doi-tac= (chuỗi) · ?chuoi= (cửa hàng) · ?chi-nhanh= — tạo lần đầu nếu chưa có. */
function requestedRoomTarget(): Record<string, string> | null {
  const q = new URLSearchParams(window.location.search)
  const pick = (k: string) => q.get(k)
  if (pick("doi-tac")) return { partnerOrgId: pick("doi-tac")! }
  if (pick("chuoi")) return { chainOrgId: pick("chuoi")! }
  if (pick("chi-nhanh")) return { branchId: pick("chi-nhanh")! }
  return null
}

/**
 * Dữ liệu màn Trao đổi nội bộ: danh sách phòng, phòng đang mở, tin của phòng. Hỏi lại theo chu kỳ chỉ khi tab đang
 * hiển thị (đọc tin = đánh dấu đã đọc, không đánh dấu khi người dùng không nhìn). Theo dõi mất mạng để báo đúng.
 */
export function useInternalChat() {
  const [conversations, setConversations] = useState<InternalChatConversation[]>([])
  const [listState, setListState] = useState<LoadState>("loading")
  const [activeConv, setActiveConv] = useState<InternalChatConversation | null>(null)
  const [messages, setMessages] = useState<InternalChatMessage[]>([])
  const [threadState, setThreadState] = useState<LoadState>("loading")
  const [online, setOnline] = useState(true)
  const [sendError, setSendError] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const activeId = useRef<string | null>(null)

  const fetchConversations = useCallback(async () => {
    if (document.visibilityState === "hidden") return
    try {
      const res = await fetch(API)
      if (res.status === 403) return setListState("forbidden")
      const json = await res.json()
      if (!json.success || !Array.isArray(json.data)) return setListState("error")
      const list = json.data as InternalChatConversation[]
      setConversations(list)
      setListState("ready")
      const wanted = new URLSearchParams(window.location.search).get("phong")
      if (list.length > 0) setActiveConv((prev) => prev ?? list.find((c) => c.id === wanted) ?? null)
    } catch {
      setListState((s) => (s === "ready" ? s : "error"))
    }
  }, [])

  const fetchMessages = useCallback(async (convId: string) => {
    if (document.visibilityState === "hidden") return
    try {
      const res = await fetch(`${API}/${convId}/messages`)
      if (activeId.current !== convId) return
      if (res.status === 404 || res.status === 403) return setThreadState("forbidden")
      const json = await res.json()
      if (!json.success || !Array.isArray(json.data)) return setThreadState("error")
      // Giữ nguyên tin ảnh đã tải: URL ký đổi mỗi lần đọc, thay vào sẽ làm ảnh tải lại 5 giây/lần
      const incoming = json.data as InternalChatMessage[]
      setMessages((prev) => {
        const known = new Map(prev.filter((m) => m.messageType === "IMAGE").map((m) => [m.id, m]))
        return incoming.map((m) => known.get(m.id) ?? m)
      })
      setThreadState("ready")
    } catch {
      setThreadState((s) => (s === "ready" ? s : "error"))
    }
  }, [])

  useEffect(() => {
    const openRequested = async () => {
      const target = requestedRoomTarget()
      if (!target) return
      try {
        const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(target) })
        const json = await res.json()
        if (json.success && json.data) setActiveConv(json.data)
      } catch {
        // Không mở được phòng: vẫn hiện danh sách
      }
    }
    void Promise.resolve().then(openRequested).then(fetchConversations)
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    // Luồng đẩy: chỉ báo mã phòng vừa có tin → đọc lại qua API đã kiểm quyền. EventSource tự nối lại khi rớt.
    const source = typeof EventSource === "undefined" ? null : new EventSource("/api/v1/internal-chat/stream")
    source?.addEventListener("connected", () => setLive(true))
    source?.addEventListener("error", () => setLive(false))
    source?.addEventListener("room", (e) => {
      let id: string | undefined
      try {
        id = (JSON.parse((e as MessageEvent<string>).data) as { conversationId?: string }).conversationId
      } catch {
        id = undefined
      }
      void fetchConversations()
      if (id && id === activeId.current) void fetchMessages(id)
    })
    return () => {
      source?.close()
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [fetchConversations, fetchMessages])

  useEffect(() => {
    const timer = setInterval(fetchConversations, live ? LIST_POLL_MS.push : LIST_POLL_MS.poll)
    return () => clearInterval(timer)
  }, [fetchConversations, live])

  useEffect(() => {
    activeId.current = activeConv?.id ?? null
    if (!activeConv) return
    const id = activeConv.id
    void Promise.resolve().then(() => {
      setMessages([])
      setThreadState("loading")
      return fetchMessages(id)
    })
  }, [activeConv, fetchMessages])

  useEffect(() => {
    if (!activeConv) return
    const id = activeConv.id
    const timer = setInterval(() => fetchMessages(id), live ? THREAD_POLL_MS.push : THREAD_POLL_MS.poll)
    return () => clearInterval(timer)
  }, [activeConv, fetchMessages, live])

  const sendMessage = useCallback(async (text: string): Promise<boolean> => {
    if (!activeConv) return false
    setSendError(null)
    try {
      const res = await fetch(`${API}/${activeConv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setMessages((prev) => [...prev, json.data])
        return true
      }
      setSendError(res.status === 404 ? "Bạn chỉ xem được phòng này, chưa gửi được tin." : "Chưa gửi được tin. Thử lại sau.")
    } catch {
      setSendError("Mất kết nối — tin chưa được gửi.")
    }
    return false
  }, [activeConv])

  /** Gửi ảnh (≤ 5, kèm chú thích) — xong thì đọc lại phòng để có URL ký. */
  const sendImages = useCallback(async (files: File[], caption: string): Promise<boolean> => {
    if (!activeConv || files.length === 0) return false
    setSendError(null)
    const form = new FormData()
    files.forEach((f) => form.append("files", f))
    form.append("caption", caption)
    try {
      const res = await fetch(`${API}/${activeConv.id}/images`, { method: "POST", body: form })
      if (res.ok) {
        await fetchMessages(activeConv.id)
        return true
      }
      const json = await res.json().catch(() => null)
      setSendError(res.status === 413 ? "Mỗi ảnh tối đa 10 MB." : json?.error?.message ?? "Chưa gửi được ảnh. Thử lại sau.")
    } catch {
      setSendError("Mất kết nối — ảnh chưa được gửi.")
    }
    return false
  }, [activeConv, fetchMessages])

  /** Tắt / bật thông báo tin nhắn của phòng đang mở cho chính mình. */
  const toggleMute = useCallback(async () => {
    if (!activeConv) return
    const muted = !activeConv.isMuted
    try {
      const res = await fetch(`${API}/${activeConv.id}/mute`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ muted }) })
      if (!res.ok) return setSendError("Chưa đổi được thông báo của phòng. Thử lại sau.")
      setActiveConv((c) => (c && c.id === activeConv.id ? { ...c, isMuted: muted } : c))
      setConversations((list) => list.map((c) => (c.id === activeConv.id ? { ...c, isMuted: muted } : c)))
    } catch {
      setSendError("Mất kết nối — chưa đổi được thông báo.")
    }
  }, [activeConv])

  return {
    conversations, listState, activeConv, setActiveConv, messages, threadState, online, sendError, sendMessage, sendImages, toggleMute,
    reload: () => (activeConv ? fetchMessages(activeConv.id) : fetchConversations()),
  }
}
