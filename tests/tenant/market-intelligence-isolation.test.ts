import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GET as getOpportunities } from "@/app/api/v1/market-intelligence/opportunities/route";
import { disconnectDatabase, resetDatabase } from "../helpers/database";
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures";
import { prisma } from "@/core/tenancy/infra/prisma";

const BASE = "http://localhost/api/v1/market-intelligence/opportunities";

describe("cách ly tenant — Market Intelligence Engine (content_opportunities)", () => {
  let a: Tenant;
  let b: Tenant;

  beforeEach(async () => {
    await resetDatabase();
    a = await createTenant("alpha");
    b = await createTenant("beta");
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("GET /opportunities chỉ trả về cơ hội thuộc về đúng tổ chức đang đăng nhập", async () => {
    // Tạo 1 topic chung
    const topic = await prisma.topics.upsert({
      where: {
        canonical_name_industry: {
          canonical_name: "hoa tulip pastel",
          industry: "florist",
        },
      },
      create: {
        canonical_name: "hoa tulip pastel",
        description: "Hoa tulip màu pastel xu hướng",
        industry: "florist",
        status: "RISING",
      },
      update: {},
    });

    // Tạo cơ hội cho Tenant A
    await prisma.content_opportunities.create({
      data: {
        organization_id: a.organizationId,
        topic_id: topic.id,
        audience: "Khách hàng trẻ trung, hiện đại",
        opportunity_summary: "Video khoe sắc hoa tulip pastel đầu mùa",
        content_angles: [{ angle: "Tinh tế nhẹ nhàng" }],
        recommended_formats: ["REEL_15S"],
        recommended_hooks: ["Bật mí bí mật hoa tulip"],
        trend_score: 85,
        viral_score: 75,
        commercial_score: 90,
        content_opportunity_score: 84.5,
        confidence: 0.9,
      },
    });

    // Tenant A gọi GET -> nhận được 1 cơ hội của A
    const resA = await getOpportunities(withSession(BASE, a.token));
    expect(resA.status).toBe(200);
    const dataA = (await readJson(resA)) as { items: Array<{ topicName: string; organizationId: string }> };
    expect(dataA.items).toHaveLength(1);
    expect(dataA.items[0]?.topicName).toBe("hoa tulip pastel");
    expect(dataA.items[0]?.organizationId).toBe(a.organizationId);

    // Tenant B gọi GET -> không thấy bất kỳ cơ hội nào của Tenant A
    const resB = await getOpportunities(withSession(BASE, b.token));
    expect(resB.status).toBe(200);
    const dataB = (await readJson(resB)) as { items: unknown[] };
    expect(dataB.items).toHaveLength(0);
  });

  it("mọi bản ghi trong bảng content_opportunities bắt buộc phải có organization_id", async () => {
    const opps = await prisma.content_opportunities.findMany();
    for (const opp of opps) {
      expect(opp.organization_id).toBeDefined();
      expect(typeof opp.organization_id).toBe("string");
      expect(opp.organization_id.length).toBeGreaterThan(0);
    }
  });
});
