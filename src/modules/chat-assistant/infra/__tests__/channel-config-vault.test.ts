import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  hasPlaintextSecrets,
  openChannelConfig,
  sealChannelConfig,
} from "../channel-config-vault"
import {
  dropUnchangedSecrets,
  maskChannelSecrets,
} from "../../domain/channel-secret-fields"

const KEY = "test-integration-token-secret-32chars"
let previous: string | undefined

beforeEach(() => {
  previous = process.env["INTEGRATION_TOKEN_SECRET"]
  process.env["INTEGRATION_TOKEN_SECRET"] = KEY
})
afterEach(() => {
  if (previous === undefined) delete process.env["INTEGRATION_TOKEN_SECRET"]
  else process.env["INTEGRATION_TOKEN_SECRET"] = previous
})

describe("Mã hoá cấu hình kênh chat", () => {
  const config = { fbPageId: "page-1", fbPageAccessToken: "EAAB-token-abcd", zaloSecretKey: "zalo-secret-wxyz" }

  it("không còn bí mật dạng rõ sau khi mã hoá và giải mã khứ hồi đúng", () => {
    const stored = sealChannelConfig(config)
    const raw = JSON.stringify(stored)
    expect(raw).not.toContain("EAAB-token-abcd")
    expect(raw).not.toContain("zalo-secret-wxyz")
    expect(stored.fbPageId).toBe("page-1")
    expect(hasPlaintextSecrets(stored)).toBe(false)
    expect(openChannelConfig(stored)).toEqual(config)
  })

  it("đọc được bản ghi cũ còn dạng rõ và phát hiện cần di trú", () => {
    expect(hasPlaintextSecrets(config)).toBe(true)
    expect(openChannelConfig(config)).toEqual(config)
  })

  it("không lưu khoá _sealed khi không có bí mật", () => {
    expect(sealChannelConfig({ botName: "Bot" })).toEqual({ botName: "Bot" })
  })
})

describe("Che bí mật khi trả về client", () => {
  it("chỉ lộ 4 ký tự cuối", () => {
    const masked = maskChannelSecrets({ fbPageAccessToken: "EAAB-token-abcd", fbPageId: "page-1" })
    expect(masked.fbPageAccessToken).toBe("••••abcd")
    expect(masked.fbPageId).toBe("page-1")
  })

  it("bỏ giá trị đã che hoặc rỗng để không ghi đè bí mật đang lưu", () => {
    const cleaned = dropUnchangedSecrets({
      fbPageAccessToken: "••••abcd",
      zaloSecretKey: "",
      zaloAccessToken: "new-token",
      fbPageId: "page-2",
    })
    expect(cleaned).toEqual({ zaloAccessToken: "new-token", fbPageId: "page-2" })
  })
})
