import { describe, expect, it } from "vitest"

import {
  maHoaDuongDan,
  maHoaRfc3986,
  sha256Hex,
  tieuDeUyQuyen,
  urlKySan,
  type ThongTinKy,
} from "../sigv4"

/**
 * Hai bộ vector dưới đây là ví dụ chính thức trong tài liệu ký AWS
 * Signature Version 4 cho Amazon S3. Chúng là lý do duy nhất cho phép dùng
 * một bản ký viết tay thay cho SDK: chữ ký hoặc khớp từng ký tự với bộ vector,
 * hoặc không có cách nào biết adapter kho tệp có hoạt động hay không cho tới
 * khi một lượt tải ảnh thật hỏng trên production.
 */
const KHOA_VI_DU: ThongTinKy = {
  accessKey: "AKIAIOSFODNN7EXAMPLE",
  secretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  region: "us-east-1",
  service: "s3",
}

const LUC_KY = new Date("2013-05-24T00:00:00.000Z")

describe("ký AWS SigV4", () => {
  it("khớp vector chính thức — URL GET ký sẵn", () => {
    const url = urlKySan({
      info: KHOA_VI_DU,
      method: "GET",
      host: "examplebucket.s3.amazonaws.com",
      canonicalUri: "/test.txt",
      expiresInSeconds: 86400,
      now: LUC_KY,
    })

    expect(url).toContain(
      "X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404"
    )
    expect(url).toContain("X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request")
    expect(url).toContain("X-Amz-Date=20130524T000000Z")
    expect(url).toContain("X-Amz-Expires=86400")
  })

  it("khớp vector chính thức — PUT ký ở tiêu đề Authorization", () => {
    const headers = tieuDeUyQuyen({
      info: KHOA_VI_DU,
      method: "PUT",
      host: "examplebucket.s3.amazonaws.com",
      canonicalUri: "/test%24file.text",
      headers: {
        date: "Fri, 24 May 2013 00:00:00 GMT",
        "x-amz-storage-class": "REDUCED_REDUNDANCY",
      },
      payloadHash: "44ce7dd67c959e0d3524ffac1771dfbba87d2b6b4b4e99e42034a8b803f8b072",
      now: LUC_KY,
    })

    expect(headers["authorization"]).toContain(
      "Signature=98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd"
    )
    expect(headers["authorization"]).toContain(
      "SignedHeaders=date;host;x-amz-content-sha256;x-amz-date;x-amz-storage-class"
    )
  })

  it("mã hoá đủ năm ký tự mà encodeURIComponent bỏ sót", () => {
    expect(maHoaRfc3986("a!b'c(d)e*f")).toBe("a%21b%27c%28d%29e%2Af")
  })

  it("giữ dấu gạch chéo ngăn đoạn, mã hoá phần còn lại", () => {
    expect(maHoaDuongDan("org/abc/sp 1/anh.jpg")).toBe("org/abc/sp%201/anh.jpg")
    expect(maHoaDuongDan("org/abc/ảnh.jpg")).toBe("org/abc/%E1%BA%A3nh.jpg")
  })

  it("băm thân rỗng đúng hằng số đã khai", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
  })
})
