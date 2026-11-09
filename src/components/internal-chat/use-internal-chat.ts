"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { InternalChatConversation, InternalChatMessage } from "@/modules/internal-chat/domain/chat-entities"

export type LoadState = "loading" | "ready" | "error" | "forbidden"

const LIST_POLL_MS = 15_000
const THREAD_POLL_MS = 5_000
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
      setMessages(json.data)
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
    const timer = setInterval(fetchConversations, LIST_POLL_MS)
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      clearInterval(timer)
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [fetchConversations])

  useEffect(() => {
    activeId.current = activeConv?.id ?? null
    if (!activeConv) return
    const id = activeConv.id
    void Promise.resolve().then(() => {
      setMessages([])
      setThreadState("loading")
      return fetchMessages(id)
    })
    const timer = setInterval(() => fetchMessages(id), THREAD_POLL_MS)
    return () => clearInterval(timer)
  }, [activeConv, fetchMessages])

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

  return {
    conversations, listState, activeConv, setActiveConv, messages, threadState, online, sendError, sendMessage,
    reload: () => (activeConv ? fetchMessages(activeConv.id) : fetchConversations()),
  }
}
