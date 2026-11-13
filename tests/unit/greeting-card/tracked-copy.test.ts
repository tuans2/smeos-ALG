import { afterEach, describe, expect, it, vi } from "vitest"
import {
  ClipboardBlockedError,
  LinkProduceError,
  copyFromServer,
  copyText,
} from "@/components/greeting-card/share/tracked-copy"

/**
 * Nút "Sao chép" link bộ sưu tập (08/10/2026): máy chủ từ chối (vd. hồ sơ tiệm còn là thông tin mẫu)
 * trước đây bị báo nhầm "Trình duyệt chặn sao chép". Hai loại lỗi phải tách riêng.
 */

const DEMO = "Hồ sơ tiệm vẫn là thông tin mẫu — cập nhật trước khi gửi link cho khách"

/** ClipboardItem giả: giữ dữ liệu (có thể là Promise) để `write` đọc như trình duyệt thật. */
class FakeClipboardItem {
  constructor(readonly items: Record<string, Promise<Blob> | Blob>) {}
}

function stubClipboard(opts: { withItem: boolean; blocked: boolean }) {
  const written: string[] = []
  const clipboard = {
    // Trình duyệt thật đọc Blob trong item: Promise bị từ chối → write bị từ chối
    write: async (items: FakeClipboardItem[]) => {
      const blob = await items[0]!.items["text/plain"]!
      if (opts.blocked) throw new DOMException("Document is not focused", "NotAllowedError")
      written.push(await blob.text())
    },
    writeText: async (text: string) => {
      if (opts.blocked) throw new DOMException("Write permission denied", "NotAllowedError")
      written.push(text)
    },
  }
  vi.stubGlobal("navigator", { clipboard: opts.withItem ? clipboard : { writeText: clipboard.writeText } })
  vi.stubGlobal("ClipboardItem", opts.withItem ? FakeClipboardItem : undefined)
  return written
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("copyFromServer", () => {
  for (const withItem of [true, false]) {
    const mode = withItem ? "ClipboardItem (Safari/Chrome mới)" : "writeText (trình duyệt cũ)"

    it(`${mode}: chép đúng link máy chủ trả`, async () => {
      const written = stubClipboard({ withItem, blocked: false })
      await expect(copyFromServer(async () => "https://shop.vn/s/ABC")).resolves.toBe("https://shop.vn/s/ABC")
      expect(written).toEqual(["https://shop.vn/s/ABC"])
    })

    it(`${mode}: máy chủ từ chối → báo đúng lời của máy chủ, không đổ cho trình duyệt`, async () => {
      stubClipboard({ withItem, blocked: false })
      const err = await copyFromServer(async () => {
        throw new Error(DEMO)
      }).catch((e: unknown) => e)
      expect(err).toBeInstanceOf(LinkProduceError)
      expect((err as Error).message).toBe(DEMO)
    })

    it(`${mode}: trình duyệt chặn chép → kèm link đã tạo để chép tay`, async () => {
      stubClipboard({ withItem, blocked: true })
      const err = await copyFromServer(async () => "https://shop.vn/s/XYZ").catch((e: unknown) => e)
      expect(err).toBeInstanceOf(ClipboardBlockedError)
      expect((err as ClipboardBlockedError).text).toBe("https://shop.vn/s/XYZ")
      expect((err as Error).message).toMatch(/Trình duyệt chặn sao chép/)
    })
  }
})

describe("copyText", () => {
  it("trình duyệt chặn → ClipboardBlockedError kèm chính chuỗi cần chép", async () => {
    stubClipboard({ withItem: false, blocked: true })
    const err = await copyText("https://shop.vn/b/T01-AAAA").catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ClipboardBlockedError)
    expect((err as ClipboardBlockedError).text).toBe("https://shop.vn/b/T01-AAAA")
  })
})
