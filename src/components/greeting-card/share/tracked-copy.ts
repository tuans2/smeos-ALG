"use client"

import { apiSend } from "@/components/greeting-card/greeting-api"

/** Máy chủ không trả được link (vd. hồ sơ tiệm còn là thông tin mẫu) — `message` là lời báo của máy chủ. */
export class LinkProduceError extends Error {
  readonly name = "LinkProduceError"
}

export const CLIPBOARD_BLOCKED_MESSAGE = "Trình duyệt chặn sao chép. Hãy bôi đen link và chép thủ công."

/** Trình duyệt không cho ghi vào bộ nhớ tạm; `text` là link đã có (nếu có) để hiện ra cho chép tay. */
export class ClipboardBlockedError extends Error {
  readonly name = "ClipboardBlockedError"
  constructor(readonly text: string | null) {
    super(CLIPBOARD_BLOCKED_MESSAGE)
  }
}

/** Chép một chuỗi có sẵn; trình duyệt chặn → `ClipboardBlockedError` kèm chính chuỗi đó. */
export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    throw new ClipboardBlockedError(text)
  }
}

/**
 * Chép một link phải lấy từ máy chủ trước (link mang tên người bấm). Safari/iPhone chỉ cho chép
 * trong chính lần bấm, nên dùng `ClipboardItem` nhận Promise; trình duyệt cũ chép sau khi có link.
 * Tách hai loại lỗi để không báo nhầm: máy chủ từ chối → `LinkProduceError` (lời báo của máy chủ);
 * trình duyệt chặn chép → `ClipboardBlockedError` (kèm link đã lấy được).
 */
export async function copyFromServer(produce: () => Promise<string>): Promise<string> {
  const textPromise = Promise.resolve()
    .then(produce)
    .catch((err: unknown) => {
      throw new LinkProduceError(err instanceof Error && err.message ? err.message : "Không tạo được link")
    })
  textPromise.catch(() => undefined) // lỗi được xử lý ở dưới — tránh báo "unhandled rejection"
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      const blob = textPromise.then((t) => new Blob([t], { type: "text/plain" }))
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })])
      return await textPromise
    } catch {
      // Ghi thất bại: nếu do máy chủ thì ném lỗi máy chủ (await bên dưới), còn lại là trình duyệt chặn
      throw new ClipboardBlockedError(await textPromise)
    }
  }
  const text = await textPromise
  await copyText(text)
  return text
}

/** Link bộ sưu tập mang tên người đang đăng nhập (`/s/<mã>`), dạng đầy đủ để gửi khách. */
export async function createShareUrl(catalogId: string, channel?: string | null): Promise<string> {
  const res = await apiSend<{ data: { path: string } }>("/api/v1/greeting-card/share-links", "POST", { catalog_id: catalogId, channel: channel || null }, "Không tạo được link")
  return `${window.location.origin}${res.data.path}`
}

/** Ghi mốc sao chép link riêng (bắt đầu tính "khách chưa mở"); lỗi mạng không chặn việc chép. */
export function markPersonalLinkCopied(sendCode: string): void {
  void apiSend(`/api/v1/greeting-card/send-links/${encodeURIComponent(sendCode)}/copied`, "POST", {}, "").catch(() => undefined)
}
