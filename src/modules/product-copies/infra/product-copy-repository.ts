import type { DbClient } from "./db-client";
import type { product_copies } from "./entities";
import type { approval_state } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/core/tenancy/infra/prisma";
import { scopedWhere, scopedData, ownedByTenant, type TenantContext } from "@/core/tenancy";
import { AppError } from "@/core/http/errors";
import { randomUUID } from "node:crypto";
import { draftProductCode } from "@/modules/products/domain/product-code";
import {
  mergeSalesDataIntoAttributes,
  preservedKeys,
  type SalesData,
} from "../domain/product-master-merge";
import {
  resolveEffectiveProductCopy,
  type ProductCopyRaw,
  type ProductCopyEffective,
} from "../domain/product-copy-rules";
import type { IProductCopyRepository } from "../domain/repositories/product-copy-repository.interface";

export class ProductCopyRepository implements IProductCopyRepository {
  readonly db: DbClient;
  constructor(db: DbClient = prisma) {
    this.db = db;
  }

  async createFromAnalysis(ctx: TenantContext, input: {
    analysisId: string;
    productId: string | null;
    raw: object;
    profileVersion?: string;
    jobId?: string | null;
    modelKey?: string | null;
    provider?: string | null;
    costUsd?: number | null;
    latencyMs?: number | null;
  }): Promise<product_copies> {
    const analysis = await this.db.product_analyses.findFirst({
      where: scopedWhere(ctx, { id: input.analysisId, approval_state: "APPROVED" as approval_state }),
    });

    if (!analysis) {
      throw new Error("ANALYSIS_NOT_APPROVED: Chỉ tạo dữ liệu bán hàng từ phân tích đã duyệt");
    }

    const existing = await this.db.product_copies.findFirst({
      where: scopedWhere(ctx, { analysis_id: input.analysisId }),
    });

    if (existing) {
      return existing;
    }

    return this.db.product_copies.create({
      data: scopedData(ctx, {
        analysis_id: input.analysisId,
        product_id: input.productId,
        raw: input.raw,
        profile_version: input.profileVersion ?? null,
        job_id: input.jobId ?? null,
        model_key: input.modelKey ?? null,
        provider: input.provider ?? null,
        cost_usd: input.costUsd ?? null,
        latency_ms: input.latencyMs ?? null,
      }),
    });
  }

  async findById(ctx: TenantContext, id: string): Promise<product_copies | null> {
    return ownedByTenant(ctx, await this.db.product_copies.findFirst({
      where: scopedWhere(ctx, { id }),
    }));
  }

  async findByAnalysisId(ctx: TenantContext, analysisId: string): Promise<product_copies | null> {
    return ownedByTenant(ctx, await this.db.product_copies.findFirst({
      where: scopedWhere(ctx, { analysis_id: analysisId }),
    }));
  }

  async listByProduct(ctx: TenantContext, productId: string): Promise<product_copies[]> {
    return this.db.product_copies.findMany({
      where: scopedWhere(ctx, { product_id: productId }),
      orderBy: { created_at: "desc" },
    });
  }

  /** Sản phẩm (trong danh sách) đã có bài viết bán hàng được duyệt — tiêu chí sẵn sàng 7.3. */
  async approvedProductIds(ctx: TenantContext, productIds: string[]): Promise<Set<string>> {
    if (productIds.length === 0) return new Set()
    const rows = await this.db.product_copies.findMany({
      where: scopedWhere(ctx, { product_id: { in: productIds }, approval_state: "APPROVED" as approval_state }),
      select: { product_id: true },
      distinct: ["product_id"],
    })
    return new Set(rows.map((r) => r.product_id).filter((id): id is string => Boolean(id)))
  }

  async listPendingApproval(ctx: TenantContext): Promise<product_copies[]> {
    return this.db.product_copies.findMany({
      where: scopedWhere(ctx, { approval_state: "PENDING" as approval_state }),
      orderBy: { created_at: "desc" },
    });
  }

  async listByApprovalState(ctx: TenantContext, approvalState: approval_state): Promise<product_copies[]> {
    return this.db.product_copies.findMany({
      where: scopedWhere(ctx, { approval_state: approvalState }),
      orderBy: { created_at: "desc" },
    });
  }

  async updateEdited(ctx: TenantContext, id: string, edited: object): Promise<product_copies> {
    const existing = await this.findById(ctx, id);
    if (!existing) throw new AppError("NOT_FOUND", "Không tìm thấy dữ liệu bán hàng");
    if (existing.approval_state !== "PENDING") {
      throw new AppError("CONFLICT", "Chỉ sửa được bản ghi đang chờ duyệt");
    }

    return this.db.product_copies.update({
      where: { id },
      data: { edited },
    });
  }

  async approve(ctx: TenantContext, id: string, approvedBy: string, tx: DbClient, danhMucDip: ReadonlyArray<{ code: string; name: string }> = []): Promise<{ productCopy: product_copies; product: { id: string; name: string }; preservedAttributeKeys: string[] }> {
    const copy = await tx.product_copies.findFirst({
      where: scopedWhere(ctx, { id }),
    });

    if (!copy) throw new AppError("NOT_FOUND", "Không tìm thấy dữ liệu bán hàng");
    if (copy.approval_state !== "PENDING") {
      throw new AppError("CONFLICT", "Chỉ duyệt được bản ghi PENDING");
    }

    const effective = this.resolveEffective(copy.raw as ProductCopyRaw, copy.edited as ProductCopyRaw | null);

    // Mô hình trả về TÊN dịp (nó chỉ được thấy tên). Bộ lọc tra cứu đọc MÃ.
    // Ánh xạ ngược ở đây, bỏ qua tên không khớp danh mục nào thay vì bịa mã.
    const chuan = (x: string) => x.trim().toLowerCase();
    const occasionCodes = Array.from(
      new Set(
        effective.suggested_occasions
          .map((ten) => danhMucDip.find((d) => chuan(d.name) === chuan(ten))?.code)
          .filter((x): x is string => typeof x === "string")
      )
    );

    const salesData: SalesData = {
      description: effective.suggested_description,
      tags: effective.suggested_tags,
      occasions: effective.suggested_occasions,
      occasionCodes,
      priceSegment: effective.suggested_price_segment,
      shortHeadline: effective.short_headline,
      style: effective.suggested_style,
      seoKeywords: effective.seo_keywords,
      targetAudience: effective.target_audience,
      flowerMeaningStory: effective.flower_meaning_story,
      keySellingPoints: effective.key_selling_points,
      cardMessageSuggestions: effective.card_message_suggestions,
      careInstructions: effective.care_instructions,
      priceRange: effective.suggested_price_range,
      recommendedUpsells: effective.recommended_upsells,
    };

    let product;
    let preservedAttributeKeys: string[] = [];
    if (copy.product_id) {
      // Đọc `attributes` hiện có TRƯỚC khi ghi. Duyệt phân tích ảnh (`H3`) đã
      // đặt `bom`, `confidence`, `checklist`, `san_xuat` vào đúng cột này và
      // M02/M03 đọc chúng — ghi đè nguyên cột ở đây sẽ xoá trắng định mức vật
      // tư của sản phẩm mà không ai biết. Hợp nhất nông, giữ mọi khoá cũ.
      const current = await tx.products.findFirst({
        where: { id: copy.product_id, organization_id: ctx.organizationId },
        select: { attributes: true },
      });
      if (!current) {
        throw new AppError("CONFLICT", "Sản phẩm liên kết không còn tồn tại");
      }
      preservedAttributeKeys = preservedKeys(current.attributes);

      product = await tx.products.update({
        where: { id: copy.product_id, organization_id: ctx.organizationId },
        data: {
          name: effective.suggested_name,
          attributes: mergeSalesDataIntoAttributes(current.attributes, salesData) as Prisma.InputJsonValue,
          status: "ACTIVE",
        },
      });
    } else {
      // Sản phẩm mới: cùng quy ước mã với duyệt phân tích ảnh
      // (`approveAnalysis`), không phải slug của tên do mô hình đặt.
      product = await tx.products.create({
        data: scopedData(ctx, {
          code: await this.generateUniqueCode(tx, ctx.organizationId, draftProductCode(randomUUID())),
          name: effective.suggested_name,
          status: "ACTIVE",
          attributes: mergeSalesDataIntoAttributes(null, salesData) as Prisma.InputJsonValue,
        }),
      });

      await tx.product_copies.update({
        where: { id },
        data: { product_id: product.id },
      });
    }

    const updatedCopy = await tx.product_copies.update({
      where: { id },
      data: {
        approval_state: "APPROVED" as approval_state,
        approved_by: approvedBy,
        approved_at: new Date(),
      },
    });

    return { productCopy: updatedCopy, product, preservedAttributeKeys };
  }

  async reject(ctx: TenantContext, id: string, tx: DbClient, reason?: string): Promise<product_copies> {
    const copy = await tx.product_copies.findFirst({
      where: scopedWhere(ctx, { id }),
    });

    if (!copy) throw new AppError("NOT_FOUND", "Không tìm thấy dữ liệu bán hàng");

    if (copy.approval_state !== "PENDING") {
      throw new AppError("CONFLICT", "Chỉ bỏ được bản ghi đang chờ duyệt");
    }

    return tx.product_copies.update({
      where: { id },
      data: {
        approval_state: "REJECTED" as approval_state,
        reject_reason: reason ?? null,
      },
    });
  }

  private resolveEffective(raw: ProductCopyRaw, edited: ProductCopyRaw | null): ProductCopyEffective {
    return resolveEffectiveProductCopy(raw, edited);
  }

  private async generateUniqueCode(
    tx: DbClient,
    organizationId: string,
    baseCode: string
  ): Promise<string> {
    let code = baseCode;
    let suffix = 1;
    while (true) {
      const existing = await tx.products.findFirst({
        where: { organization_id: organizationId, code },
      });
      if (!existing) break;
      code = `${baseCode}-${suffix}`;
      suffix++;
    }
    return code;
  }
}

let defaultProductCopyRepository: IProductCopyRepository | null = null;

export function getProductCopyRepository(): IProductCopyRepository {
  if (!defaultProductCopyRepository) {
    defaultProductCopyRepository = new ProductCopyRepository();
  }
  return defaultProductCopyRepository;
}