import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as listChannels, POST as configureChannel } from "@/app/api/v1/chat/channels/route"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"
import type { ChatChannelIntegration } from "@/modules/chat-assistant/domain/channel-integration-types"

type ChannelView = Pick<ChatChannelIntegration, "channel" | "isEnabled" | "config">
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"

const BASE = "http://localhost/api/v1/chat/channels"

describe("cách ly tenant — Tích hợp Đa Kênh Chat & Định giá M08 (P23)", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")

    // Gán mã năng lực T4 (Cấu hình bot) cho cả hai tenant
    a = {
      ...a,
      ctx: {
        ...a.ctx,
        capabilities: new Set([...a.ctx.capabilities, "T4"]),
      },
    }
    b = {
      ...b,
      ctx: {
        ...b.ctx,
        capabilities: new Set([...b.ctx.capabilities, "T4"]),
      },
    }
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("cấu hình kênh và API credentials của Tổ chức A không bao giờ lộ sang Tổ chức B", async () => {
    // Tổ chức A cấu hình kênh E-Catalog với thông điệp chào riêng và TẮT kênh — khác mặc định (bật),
    // để nếu cấu hình của A lộ sang B thì B thấy trạng thái tắt
    const resA = await configureChannel(
      withSession(BASE, a.token, {
        method: "POST",
        body: JSON.stringify({
          channel: "STOREFRONT_CATALOG",
          is_enabled: false,
          config: {
            welcomeMessage: "Chào mừng bạn đến với Tiệm Hoa Alpha!",
            botName: "Bot Alpha",
          },
        }),
      })
    )
    expect(resA.status).toBe(200)

    // Tổ chức B đọc danh sách kênh của mình
    const resB = await listChannels(withSession(BASE, b.token))
    expect(resB.status).toBe(200)
    const dataB = (await readJson(resB)) as { channels: ChannelView[] }
    const catalogB = dataB.channels.find((c) => c.channel === "STOREFRONT_CATALOG")

    expect(catalogB).toBeDefined()
    // B chưa cấu hình → mặc định của kênh catalog (bật), không phải trạng thái của A
    expect(catalogB?.isEnabled).toBe(true)
    expect(catalogB?.config?.welcomeMessage).toBeUndefined()
    expect(catalogB?.config?.botName).toBeUndefined()
  })

  it("trừ credit kích hoạt kênh chỉ trừ của tổ chức thao tác, không ảnh hưởng tổ chức khác", async () => {
    const orgRepo = new OrganizationRepository()

    // Nạp thêm 100 credit cho Tenant A để đủ hạn mức 50 credit kích hoạt Facebook Messenger
    const { prisma } = await import("@/core/tenancy/infra/prisma")
    await prisma.organizations.update({
      where: { id: a.organizationId },
      data: { credit_balance: 100 },
    })

    const orgABefore = await orgRepo.current(a.ctx)
    const orgBBefore = await orgRepo.current(b.ctx)
    const initialCreditA = orgABefore?.credit_balance ?? 0
    const initialCreditB = orgBBefore?.credit_balance ?? 0

    expect(initialCreditA).toBe(100)

    // Tổ chức A kích hoạt Facebook Messenger (trừ 50 credit)
    const resA = await configureChannel(
      withSession(BASE, a.token, {
        method: "POST",
        body: JSON.stringify({
          channel: "FACEBOOK_MESSENGER",
          is_enabled: true,
          config: {
            fbPageId: "page_123_alpha",
            fbPageAccessToken: "EAAG_token_alpha",
          },
        }),
      })
    )
    expect(resA.status).toBe(200)

    // Kiểm tra số dư sau khi kích hoạt: A bị trừ 50, B hoàn toàn giữ nguyên
    const orgAAfter = await orgRepo.current(a.ctx)
    const orgBAfter = await orgRepo.current(b.ctx)

    expect(orgAAfter?.credit_balance).toBe(initialCreditA - 50)
    expect(orgBAfter?.credit_balance).toBe(initialCreditB)
  })
})
