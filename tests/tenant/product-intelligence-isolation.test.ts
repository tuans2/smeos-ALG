import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { POST as postProductIntelligence } from "@/app/api/v1/market-intelligence/product-intelligence/route";
import { disconnectDatabase, resetDatabase } from "../helpers/database";
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures";
import { prisma } from "@/core/tenancy/infra/prisma";

const BASE = "http://localhost/api/v1/market-intelligence/product-intelligence";

const SAMPLE_BODY = {
  product_name: "Bó hoa hồng pastel test cách ly",
  image_url: "/images/sample-flower.jpg",
  // Bắt buộc từ 22/09/2026 (nợ #118) — ảnh phải đã lưu vào kho. Test này không
  // cần asset thật tồn tại (asset_id không mang khóa ngoại ở schema, resolve
  // URL hiển thị là best-effort) — chỉ cần chuỗi không rỗng để qua được cổng.
  asset_id: "asset-test-fixture-01",
  components: [
    { flowerType: "Hoa hồng ngoại", quantityEstimate: 12, unit: "cành", role: "dominant" },
    { flowerType: "Hoa baby trắng", quantityEstimate: 5, unit: "nhánh", role: "supporting" },
  ],
  attributes: {
    mainColors: ["Pastel hồng"],
    secondaryColors: ["Trắng kem"],
    style: "Romantic & Tinh tế",
    shape: "Bó tròn",
    sizeEstimate: "Tiêu chuẩn (M)",
  },
  packaging: {
    wrappingMaterial: "Giấy lụa mờ Kraft",
    wrappingColor: "Hồng nhạt",
    ribbon: "Ruy băng voan",
    accessories: [],
  },
  context: {
    likelyOccasions: ["Sinh nhật"],
    likelyAudience: "Nữ giới 20-35 tuổi",
    suggestedPrice: 599000,
    confidence: 0.9,
  },
};

describe("cách ly tenant — Product Intelligence (product_analysis_runs, nợ #113 đã trả 21/09/2026)", () => {
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

  it("POST /product-intelligence lưu lại lượt phân tích đúng organization_id của tổ chức gọi", async () => {
    const res = await postProductIntelligence(
      withSession(BASE, a.token, {
        method: "POST",
        body: JSON.stringify(SAMPLE_BODY),
      })
    );
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as { productName?: string };
    expect(body.productName).toBe(SAMPLE_BODY.product_name);

    const runs = await prisma.product_analysis_runs.findMany({
      where: { organization_id: a.organizationId },
    });
    expect(runs).toHaveLength(1);
    expect(runs[0]!.product_name).toBe(SAMPLE_BODY.product_name);
  });

  it("lượt phân tích của tổ chức A không lộ sang tổ chức B", async () => {
    await postProductIntelligence(
      withSession(BASE, a.token, {
        method: "POST",
        body: JSON.stringify(SAMPLE_BODY),
      })
    );

    const runsForB = await prisma.product_analysis_runs.findMany({
      where: { organization_id: b.organizationId },
    });
    expect(runsForB).toHaveLength(0);

    const runsForA = await prisma.product_analysis_runs.findMany({
      where: { organization_id: a.organizationId },
    });
    expect(runsForA).toHaveLength(1);
  });

  it("từ chối 400 khi thiếu asset_id — ảnh chưa lưu vào kho (chặn cứng, nợ #118)", async () => {
    const { asset_id, ...bodyWithoutAssetId } = SAMPLE_BODY;
    const res = await postProductIntelligence(
      withSession(BASE, a.token, {
        method: "POST",
        body: JSON.stringify(bodyWithoutAssetId),
      })
    );
    expect(res.status).toBe(400);

    const runs = await prisma.product_analysis_runs.findMany({
      where: { organization_id: a.organizationId },
    });
    expect(runs).toHaveLength(0);
  });

  it("mọi bản ghi trong bảng product_analysis_runs bắt buộc phải có organization_id", async () => {
    await postProductIntelligence(
      withSession(BASE, a.token, {
        method: "POST",
        body: JSON.stringify(SAMPLE_BODY),
      })
    );

    const runs = await prisma.product_analysis_runs.findMany();
    for (const run of runs) {
      expect(run.organization_id).toBeDefined();
      expect(typeof run.organization_id).toBe("string");
      expect(run.organization_id.length).toBeGreaterThan(0);
    }
  });
});
