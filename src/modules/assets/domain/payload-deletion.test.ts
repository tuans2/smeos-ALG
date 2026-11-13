import { describe, expect, it } from "vitest"

import { payloadKeysToPurge, videoPayloadKeysToPurge } from "./payload-deletion"

describe("payloadKeysToPurge", () => {
  it("chỉ lấy khoá dưới org/<tổ chức của phiên>/, bỏ trùng", () => {
    expect(
      payloadKeysToPurge("org-a", { storage_key: "org/org-a/p/x.jpg", thumb_key: "org/org-a/p/x.jpg" })
    ).toEqual(["org/org-a/p/x.jpg"])
    expect(
      payloadKeysToPurge("org-a", { storage_key: "org/org-a/p/x.jpg", thumb_key: "org/org-a/p/x_t.webp" })
    ).toEqual(["org/org-a/p/x.jpg", "org/org-a/p/x_t.webp"])
  })

  it("không đụng khoá của tổ chức khác, khoá videos/ hay khoá có ..", () => {
    expect(payloadKeysToPurge("org-a", { storage_key: "org/org-b/p/x.jpg", thumb_key: null })).toEqual([])
    expect(payloadKeysToPurge("org-a", { storage_key: "videos/org-a/j.mp4", thumb_key: null })).toEqual([])
    expect(payloadKeysToPurge("org-a", { storage_key: "org/org-a/../org-b/x.jpg", thumb_key: null })).toEqual([])
  })
})

describe("videoPayloadKeysToPurge", () => {
  it("chỉ giữ khoá video và bản phối âm của chính tổ chức, bỏ trùng và khoá có ..", () => {
    expect(
      videoPayloadKeysToPurge("org-a", ["videos/org-a/v1.mp4", "org/org-a/audio/v1.m4a", "videos/org-b/v1.mp4", "videos/org-a/../x", null, "videos/org-a/v1.mp4"])
    ).toEqual(["videos/org-a/v1.mp4", "org/org-a/audio/v1.m4a"])
  })
})
