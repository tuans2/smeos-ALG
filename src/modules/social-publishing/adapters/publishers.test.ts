import { beforeEach, describe, expect, it } from "vitest"

import { resetCircuitBreakers } from "@/core/http/circuit-breaker"
import { publisherFor } from "./index"
import type { FetchLike } from "./http-call"

type Call = { url: string; init: RequestInit }

/** HTTP giả: trả lần lượt các phản hồi, ghi lại lời gọi — không chạm mạng. */
function fakeFetch(responses: Array<{ status?: number; body: unknown } | Error>) {
  const calls: Call[] = []
  const fn: FetchLike = async (url, init) => {
    calls.push({ url, init })
    const next = responses.shift()
    if (!next) throw new Error("hết phản hồi giả")
    if (next instanceof Error) throw next
    return new Response(JSON.stringify(next.body), { status: next.status ?? 200, headers: { "content-type": "application/json" } })
  }
  return { fn, calls }
}

const cred = { accessToken: "tok-secret", accountId: "acc-1" }
const req = (n: number) => ({ caption: "Bó hồng #sinhnhat", title: "Bó hồng", imageUrls: Array.from({ length: n }, (_, i) => `https://kho.example/a${i}.jpg?sig=x`) })
const fields = (c: Call) => new URLSearchParams(String(c.init.body))

beforeEach(() => resetCircuitBreakers())

describe("Facebook Page (Graph)", () => {
  it("1 ảnh: một lời gọi /photos mang cả chữ và ảnh", async () => {
    const f = fakeFetch([{ body: { id: "ph1", post_id: "page_post1" } }])
    const r = await publisherFor("facebook", f.fn).publish(req(1), cred)
    expect(r).toEqual({ ok: true, externalId: "page_post1", url: "https://www.facebook.com/page_post1" })
    expect(f.calls[0]!.url).toMatch(/\/acc-1\/photos$/)
    expect(fields(f.calls[0]!).get("url")).toBe("https://kho.example/a0.jpg?sig=x")
    expect(fields(f.calls[0]!).get("caption")).toBe("Bó hồng #sinhnhat")
  })

  it("nhiều ảnh: tải từng ảnh ẩn rồi đăng MỘT bài gắn đủ ảnh", async () => {
    const f = fakeFetch([{ body: { id: "m1" } }, { body: { id: "m2" } }, { body: { id: "p_9" } }])
    const r = await publisherFor("facebook", f.fn).publish(req(2), cred)
    expect(r.ok).toBe(true)
    const feed = fields(f.calls[2]!)
    expect(f.calls[2]!.url).toMatch(/\/acc-1\/feed$/)
    expect(feed.get("attached_media[0]")).toBe('{"media_fbid":"m1"}')
    expect(feed.get("attached_media[1]")).toBe('{"media_fbid":"m2"}')
  })

  it("token hết hạn (190) → cần kết nối lại, không thử lại; quá tần suất (4) → thử lại", async () => {
    const expired = await publisherFor("facebook", fakeFetch([{ status: 400, body: { error: { code: 190, message: "x" } } }]).fn).publish(req(0), cred)
    expect(expired).toMatchObject({ ok: false, kind: "NEEDS_ACTION", code: "TOKEN_EXPIRED" })
    const limited = await publisherFor("facebook", fakeFetch([{ status: 400, body: { error: { code: 4 } } }]).fn).publish(req(0), cred)
    expect(limited).toMatchObject({ ok: false, kind: "RETRYABLE", code: "RATE_LIMIT" })
  })

  it("mất mạng / nền tảng 5xx → lỗi tạm thời; câu lỗi không chứa khoá", async () => {
    const net = await publisherFor("facebook", fakeFetch([new Error("ECONNRESET")]).fn).publish(req(0), cred)
    expect(net).toMatchObject({ ok: false, kind: "RETRYABLE", code: "NETWORK" })
    const down = await publisherFor("facebook", fakeFetch([{ status: 503, body: {} }]).fn).publish(req(0), cred)
    expect(down).toMatchObject({ ok: false, kind: "RETRYABLE", code: "HTTP_503" })
    expect(JSON.stringify([net, down])).not.toContain("tok-secret")
  })
})

describe("Instagram (Graph Content Publishing)", () => {
  it("1 ảnh: tạo container → publish → lấy link bài", async () => {
    const f = fakeFetch([{ body: { id: "c1" } }, { body: { id: "ig9" } }, { body: { permalink: "https://instagram.com/p/x" } }])
    const r = await publisherFor("instagram", f.fn).publish(req(1), cred)
    expect(r).toEqual({ ok: true, externalId: "ig9", url: "https://instagram.com/p/x" })
    expect(fields(f.calls[1]!).get("creation_id")).toBe("c1")
  })

  it("nhiều ảnh: container con → container CAROUSEL → publish", async () => {
    const f = fakeFetch([{ body: { id: "k1" } }, { body: { id: "k2" } }, { body: { id: "car" } }, { body: { id: "ig1" } }, { body: {} }])
    const r = await publisherFor("instagram", f.fn).publish(req(2), cred)
    expect(r).toMatchObject({ ok: true, externalId: "ig1", url: null })
    expect(fields(f.calls[2]!).get("children")).toBe("k1,k2")
    expect(fields(f.calls[2]!).get("media_type")).toBe("CAROUSEL")
  })
})

describe("Zalo OA", () => {
  it("tạo bài viết: ảnh đầu làm bìa, ảnh sau vào thân bài; khoá gửi qua header", async () => {
    const f = fakeFetch([{ body: { error: 0, data: { token: "art-1" } } }])
    const r = await publisherFor("zalo", f.fn).publish(req(2), cred)
    expect(r).toEqual({ ok: true, externalId: "art-1", url: null })
    const body = JSON.parse(String(f.calls[0]!.init.body)) as { cover: { photo_url: string }; body: Array<{ type: string }>; title: string }
    expect(body.cover.photo_url).toBe("https://kho.example/a0.jpg?sig=x")
    expect(body.body.map((b) => b.type)).toEqual(["text", "image"])
    expect((f.calls[0]!.init.headers as Record<string, string>).access_token).toBe("tok-secret")
  })

  it("thiếu ảnh bìa → báo ngay, không gọi Zalo; token hết hạn (-216) → cần kết nối lại", async () => {
    const f = fakeFetch([])
    expect(await publisherFor("zalo", f.fn).publish(req(0), cred)).toMatchObject({ ok: false, code: "NO_COVER" })
    expect(f.calls).toHaveLength(0)
    const r = await publisherFor("zalo", fakeFetch([{ body: { error: -216, message: "Access token is invalid" } }]).fn).publish(req(1), cred)
    expect(r).toMatchObject({ ok: false, kind: "NEEDS_ACTION", code: "TOKEN_EXPIRED" })
  })
})

describe("TikTok (Content Posting API)", () => {
  it("lấy mức hiển thị từ creator_info rồi đăng ảnh PULL_FROM_URL", async () => {
    const f = fakeFetch([
      { body: { data: { privacy_level_options: ["SELF_ONLY"] }, error: { code: "ok" } } },
      { body: { data: { publish_id: "pub-1" }, error: { code: "ok" } } },
    ])
    const r = await publisherFor("tiktok", f.fn).publish(req(2), cred)
    expect(r).toEqual({ ok: true, externalId: "pub-1", url: null })
    const body = JSON.parse(String(f.calls[1]!.init.body)) as { post_info: { privacy_level: string }; source_info: { photo_images: string[] }; media_type: string }
    expect(body.post_info.privacy_level).toBe("SELF_ONLY") // ứng dụng chưa qua duyệt: không tự ép công khai
    expect(body.source_info.photo_images).toHaveLength(2)
    expect(body.media_type).toBe("PHOTO")
  })

  it("tên miền ảnh chưa xác minh → cần xử lý; quá tần suất → thử lại", async () => {
    const info = { body: { data: { privacy_level_options: ["PUBLIC_TO_EVERYONE"] }, error: { code: "ok" } } }
    const unverified = await publisherFor("tiktok", fakeFetch([info, { status: 403, body: { error: { code: "url_ownership_unverified" } } }]).fn).publish(req(1), cred)
    expect(unverified).toMatchObject({ ok: false, kind: "NEEDS_ACTION", code: "url_ownership_unverified" })
    const limited = await publisherFor("tiktok", fakeFetch([{ status: 429, body: { error: { code: "rate_limit_exceeded" } } }]).fn).publish(req(1), cred)
    expect(limited).toMatchObject({ ok: false, kind: "RETRYABLE" })
  })
})
