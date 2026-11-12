/**
 * Lời gọi API của Bước 4 "Đăng tự động" — module `social-publishing` của ALG (không còn qua proxy SocialFlow).
 * Mọi lỗi ném `Error` với câu tiếng Việt cho user.
 */
import type { PendingPage } from "@/modules/social-publishing/use-cases/connect-channel"
import type { ChannelStatusView } from "@/modules/social-publishing/use-cases/manage-posts"
import type { SocialPostView } from "@/modules/social-publishing/use-cases/post-view"

export type { ChannelStatusView, PendingPage, SocialPostView }

async function call<T>(url: string, init: RequestInit | undefined, fallback: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } })
  } catch {
    throw new Error("Mất kết nối mạng — kiểm tra mạng rồi thử lại")
  }
  if (res.status === 204) return undefined as T
  const body = (await res.json().catch(() => null)) as { data?: unknown; error?: { message?: string; details?: Record<string, unknown> } } | null
  if (!res.ok) {
    if (res.status === 403) throw new Error("Tài khoản của bạn chưa được cấp quyền cho thao tác này")
    const detail = body?.error?.details ? Object.values(body.error.details).find((v): v is string => typeof v === "string") : undefined
    throw new Error(detail || body?.error?.message || fallback)
  }
  return body as T
}

export async function fetchChannels(): Promise<ChannelStatusView[]> {
  return (await call<{ data: ChannelStatusView[] }>("/api/v1/social-publishing/channels", undefined, "Chưa tải được trạng thái kênh")).data
}

/** Bắt đầu kết nối: trả link trang đồng ý của nền tảng — giao diện chuyển trình duyệt sang đó. */
export async function connectUrl(channel: string): Promise<string> {
  const r = await call<{ data: { authorize_url: string } }>(`/api/v1/social-publishing/channels/${encodeURIComponent(channel)}/connect`, { method: "POST", body: "{}" }, "Chưa mở được trang kết nối")
  return r.data.authorize_url
}

export async function disconnectChannel(channel: string): Promise<void> {
  await call(`/api/v1/social-publishing/channels/${encodeURIComponent(channel)}/disconnect`, { method: "POST", body: "{}" }, "Chưa ngắt được kết nối")
}

export async function fetchPendingPages(): Promise<PendingPage[]> {
  return (await call<{ data: PendingPage[] }>("/api/v1/social-publishing/facebook-pages", undefined, "Chưa tải được danh sách Trang")).data
}

export async function choosePage(pageId: string): Promise<void> {
  await call("/api/v1/social-publishing/facebook-pages", { method: "POST", body: JSON.stringify({ page_id: pageId }) }, "Chưa chọn được Trang")
}

export type PublishMode = "NOW" | "AUTO" | "AT"

export async function schedulePosts(input: { generationId: string; channels: readonly string[]; mode: PublishMode; scheduledAt: string | null; idempotencyKey: string }): Promise<SocialPostView[]> {
  const r = await call<{ data: SocialPostView[] }>("/api/v1/social-publishing/posts", {
    method: "POST",
    headers: { "Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify({
      content_generation_id: input.generationId, channels: input.channels, mode: input.mode,
      ...(input.mode === "AT" && input.scheduledAt ? { scheduled_at: input.scheduledAt } : {}),
    }),
  }, "Chưa lên lịch được bài đăng")
  return r.data
}

export async function fetchPosts(generationId: string): Promise<SocialPostView[]> {
  const q = new URLSearchParams({ content_generation_id: generationId, limit: "50" })
  return (await call<{ data: SocialPostView[] }>(`/api/v1/social-publishing/posts?${q.toString()}`, undefined, "Chưa tải được danh sách bài đăng")).data
}

export async function cancelPost(id: string): Promise<void> {
  await call(`/api/v1/social-publishing/posts/${encodeURIComponent(id)}/cancel`, { method: "POST", body: "{}" }, "Chưa huỷ được bài")
}

export async function retryPost(id: string): Promise<void> {
  await call(`/api/v1/social-publishing/posts/${encodeURIComponent(id)}/retry`, { method: "POST", body: "{}" }, "Chưa thử lại được bài")
}
