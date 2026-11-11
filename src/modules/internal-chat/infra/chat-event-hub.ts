import Redis from "ioredis"
import { getRedis } from "@/core/cache/redis-client"
import { log } from "@/core/observability/log"
import { audienceOf, parseChatRoomEvent, type ChatRoomEvent } from "../domain/chat-room-event"

type Listener = (event: ChatRoomEvent) => void

const CHANNEL = "internal_chat:room_events"
/** Trần người nghe mỗi tổ chức trong một tiến trình — kết nối SSE luôn có giới hạn. */
const MAX_LISTENERS_PER_ORG = 500

/**
 * Bộ phát sự kiện phòng cho SSE (IC-7.1). Có `REDIS_URL`: phát qua Redis pub/sub để mọi instance nhận (kể cả chính
 * nó); không có hoặc Redis lỗi: phát trong bộ nhớ tiến trình. Kết nối nghe Redis tách riêng (ioredis ở chế độ
 * subscribe không chạy lệnh khác). Mọi lỗi chỉ ghi log — trình duyệt vẫn có đường hỏi lại dự phòng.
 */
export class ChatEventHub {
  private readonly listeners = new Map<string, Set<Listener>>()
  private subscriber: Redis | null = null
  private subscribing = false

  subscribe(organizationId: string, listener: Listener): () => void {
    this.ensureRedisSubscriber()
    const set = this.listeners.get(organizationId) ?? new Set<Listener>()
    if (set.size >= MAX_LISTENERS_PER_ORG) return () => undefined
    set.add(listener)
    this.listeners.set(organizationId, set)
    return () => {
      set.delete(listener)
      if (set.size === 0) this.listeners.delete(organizationId)
    }
  }

  async publish(event: ChatRoomEvent): Promise<void> {
    const redis = getRedis()
    if (redis) {
      try {
        await redis.publish(CHANNEL, JSON.stringify(event))
        return
      } catch (error) {
        log.warn("internal_chat.event_publish_failed", { organizationId: event.organizationId, error: error instanceof Error ? error.name : "unknown" })
      }
    }
    this.deliver(event)
  }

  /** Giao cho người nghe trong tiến trình này. */
  deliver(event: ChatRoomEvent): void {
    for (const org of audienceOf(event)) {
      for (const listener of this.listeners.get(org) ?? []) {
        try {
          listener(event)
        } catch {
          // Kết nối đã đóng — người nghe tự gỡ khi abort
        }
      }
    }
  }

  private ensureRedisSubscriber(): void {
    const url = process.env["REDIS_URL"]?.trim()
    if (!url || this.subscriber || this.subscribing) return
    this.subscribing = true
    const sub = new Redis(url, { maxRetriesPerRequest: null, connectTimeout: 2000 })
    sub.on("error", (error: Error) => log.warn("redis.error", { feature: "internal-chat-sse", message: error.message }))
    sub.on("message", (_channel: string, raw: string) => {
      const event = parseChatRoomEvent(raw)
      if (event) this.deliver(event)
    })
    sub.subscribe(CHANNEL).then(
      () => {
        this.subscriber = sub
        this.subscribing = false
      },
      () => {
        this.subscribing = false
        sub.disconnect()
      }
    )
  }
}

const globalForHub = globalThis as unknown as { __internalChatEventHub?: ChatEventHub }

/** Một bộ phát cho cả tiến trình (giữ qua hot reload ở dev). */
export function getChatEventHub(): ChatEventHub {
  globalForHub.__internalChatEventHub ??= new ChatEventHub()
  return globalForHub.__internalChatEventHub
}
