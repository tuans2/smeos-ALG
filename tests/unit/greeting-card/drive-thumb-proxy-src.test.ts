import { describe, expect, it } from "vitest"
import { driveThumbProxySrc } from "@/components/greeting-card/drive-thumb-image"

describe("driveThumbProxySrc", () => {
  const id = "1XHMNgd25xRYA7T1t2yQ0siCXswGqKwtZ"
  it("link thư mục → folder_id; link tệp → file_id", () => {
    expect(driveThumbProxySrc(`https://drive.google.com/drive/u/4/folders/${id}`)).toBe(`/api/v1/public/drive-thumb-proxy?folder_id=${id}`)
    expect(driveThumbProxySrc(`https://drive.google.com/file/d/${id}/view?usp=sharing`)).toBe(`/api/v1/public/drive-thumb-proxy?file_id=${id}`)
    expect(driveThumbProxySrc(`https://drive.google.com/open?id=${id}`)).toBe(`/api/v1/public/drive-thumb-proxy?file_id=${id}`)
  })
  it("trang web bán hàng hoặc trống → null", () => {
    expect(driveThumbProxySrc("https://siinstore.com/shop/hoa-chia-buon/ke-hoa-vieng-tong-vang-sshtl52/")).toBeNull()
    expect(driveThumbProxySrc(`https://example.com/x?id=${id}`)).toBeNull()
    expect(driveThumbProxySrc(null)).toBeNull()
  })
})
