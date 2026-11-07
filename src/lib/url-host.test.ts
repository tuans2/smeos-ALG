import { describe, expect, it } from "vitest"
import { urlHostIs } from "./url-host"

describe("urlHostIs", () => {
  it.each([
    ["https://drive.google.com/file/d/abc/view", "drive.google.com"],
    ["drive.google.com/open?id=abc", "drive.google.com"],
    ["https://www.youtube.com/watch?v=1", "youtube.com"],
    ["https://m.tiktok.com/@a/video/1", "tiktok.com"],
    ["HTTPS://IMAGES.UNSPLASH.COM/photo", "unsplash.com"],
  ])("%s thuộc %s", (url, domain) => expect(urlHostIs(url, domain)).toBe(true))

  it.each([
    ["https://evil.example/?next=drive.google.com", "drive.google.com"],
    ["https://drive.google.com.evil.example/x", "drive.google.com"],
    ["https://notyoutube.com/x", "youtube.com"],
    ["/images/flowers/a.jpg", "unsplash.com"],
    ["không phải url", "tiktok.com"],
    [null, "tiktok.com"],
  ])("%s không thuộc %s", (url, domain) => expect(urlHostIs(url, domain)).toBe(false))
})
