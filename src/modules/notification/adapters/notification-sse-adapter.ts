/**
 * NOTIFICATION SSE ADAPTER
 *
 * Quản lý kết nối Server-Sent Events (SSE) để đẩy tin thông báo thời gian thực
 * tới trình duyệt người dùng khi có tin mới trong App Inbox.
 *
 * @module notification/adapters
 */
import { log } from "@/core/observability/log"

export interface SseNotificationEvent {
  id: string
  eventKey: string
  title: string
  message: string
  deepLink?: string | null
  priority: string
  createdAt: string
}

type SseListener = (event: SseNotificationEvent) => void

class SseNotificationHub {
  private userListeners: Map<string, Set<SseListener>> = new Map()

  subscribe(userId: string, listener: SseListener): () => void {
    if (!this.userListeners.has(userId)) {
      this.userListeners.set(userId, new Set())
    }
    const listeners = this.userListeners.get(userId)!
    listeners.add(listener)

    log.debug("SSE subscriber registered", { userId, activeCount: listeners.size })

    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) {
        this.userListeners.delete(userId)
      }
    }
  }

  broadcastToUser(userId: string, event: SseNotificationEvent): void {
    const listeners = this.userListeners.get(userId)
    if (!listeners || listeners.size === 0) {
      return
    }

    for (const listener of listeners) {
      try {
        listener(event)
      } catch (err) {
        log.warn("Lỗi gửi event tới SSE listener", {
          userId,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }
}

export const sseNotificationHub = new SseNotificationHub()
