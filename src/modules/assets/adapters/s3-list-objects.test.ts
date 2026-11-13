import { describe, expect, it } from "vitest"

import { parseListObjectsV2 } from "./s3-storage-provider"

describe("parseListObjectsV2", () => {
  it("đọc khoá, cỡ, giải mã thực thể XML và token trang sau", () => {
    const xml = `<?xml version="1.0"?><ListBucketResult>
      <IsTruncated>true</IsTruncated>
      <Contents><Key>org/o1/p/a&amp;b.jpg</Key><Size>12</Size></Contents>
      <Contents><Key>videos/o1/j.mp4</Key><Size>3400</Size></Contents>
      <NextContinuationToken>tok&amp;1</NextContinuationToken></ListBucketResult>`
    expect(parseListObjectsV2(xml)).toEqual({
      items: [
        { key: "org/o1/p/a&b.jpg", size: 12 },
        { key: "videos/o1/j.mp4", size: 3400 },
      ],
      nextCursor: "tok&1",
    })
  })

  it("trang cuối: không có token", () => {
    expect(parseListObjectsV2("<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>")).toEqual({
      items: [],
      nextCursor: null,
    })
  })
})
