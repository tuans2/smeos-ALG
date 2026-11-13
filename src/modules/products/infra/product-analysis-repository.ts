import type { approval_state, InputJsonValue, product_analyses } from "./entities"

import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import type {
  IProductAnalysisRepository,
  CreateProductAnalysisInput,
  ApproveAnalysisInput,
  ProductAnalysisRecord,
} from "../domain/repositories/product-analysis-repository.interface"

import type { DbClient } from "./db-client"

export type { CreateProductAnalysisInput, ApproveAnalysisInput }

/**
 * `product_analyses` — đặc tả 07 mục 9. Worker Python (`workers/vision/`)
 * ghi dòng đầu tiên trực tiếp bằng SQL sau khi phân tích xong (D6-1: TS và
 * Python chỉ nói chuyện qua bảng, không qua HTTP) — `create()` ở đây phục vụ
 * bộ test và mọi đường ghi phía TS trong tương lai, không phải đường ghi
 * chính của luồng thật.
 */
export class ProductAnalysisRepository implements IProductAnalysisRepository {
  constructor(private readonly db: DbClient = prisma) {}

  findById(ctx: TenantContext, id: string): Promise<product_analyses | null> {
    return this.db.product_analyses.findFirst({ where: scopedWhere(ctx, { id }) })
  }

  /**
   * `GET /vision/analyses` (`H3`, nợ #48) — hàng chờ duyệt của màn "Duyệt".
   * Chỉ `approval_state = PENDING`; không phải liệt kê toàn bộ lịch sử.
   */
  listPending(
    ctx: TenantContext,
    options: { limit: number; cursor?: string | null }
  ): Promise<product_analyses[]> {
    return this.db.product_analyses.findMany({
      where: scopedWhere(ctx, { approval_state: "PENDING" as approval_state }),
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: options.limit,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    })
  }

  /**
   * Danh sách các phân tích đã duyệt của tổ chức — phục vụ M01b (dữ liệu bán hàng).
   */
  listApproved(
    ctx: TenantContext,
    options: { limit: number; cursor?: string | null }
  ): Promise<Array<product_analyses & { product?: { id: string; name: string; code: string; category: string | null } | null }>> {
    return this.db.product_analyses.findMany({
      where: scopedWhere(ctx, { approval_state: "APPROVED" as approval_state }),
      orderBy: [{ approved_at: "desc" }, { created_at: "desc" }, { id: "desc" }],
      take: options.limit,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      include: {
        product: { select: { id: true, name: true, code: true, category: true } },
      },
    })
  }

  /**
   * Mọi lượt phân tích của tổ chức, lọc theo trạng thái duyệt và khoảng
   * thời gian — nguồn của bản xuất (`GET /vision/analyses/export`).
   *
   * Khác `listPending` ở chỗ không chốt cứng `PENDING`: bản xuất phục vụ đối
   * soát, mà thứ đáng đối soát nhất là những lượt đã duyệt và đã từ chối.
   */
  listForExport(
    ctx: TenantContext,
    options: { states?: approval_state[]; from?: Date; to?: Date; limit: number }
  ): Promise<product_analyses[]> {
    const khoangThoiGian =
      options.from || options.to
        ? {
            created_at: {
              ...(options.from ? { gte: options.from } : {}),
              ...(options.to ? { lte: options.to } : {}),
            },
          }
        : {}
    return this.db.product_analyses.findMany({
      where: scopedWhere(ctx, {
        ...(options.states && options.states.length > 0
          ? { approval_state: { in: options.states } }
          : {}),
        ...khoangThoiGian,
      }),
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: options.limit,
    })
  }

  create(ctx: TenantContext, input: CreateProductAnalysisInput): Promise<product_analyses> {
    return this.db.product_analyses.create({
      data: scopedData(ctx, {
        product_id: input.productId,
        asset_id: input.assetId,
        job_id: input.jobId,
        provider: input.provider,
        model: input.model,
        model_version: input.modelVersion,
        contract_name: input.contractName,
        contract_version: input.contractVersion,
        raw: input.raw as InputJsonValue,
        approval_state: "PENDING" as approval_state,
      }),
    })
  }

  /** Tra theo ảnh đã phân tích — chốt idempotent của lượt nạp lịch sử
   *  (P8, nợ #34): một ảnh chỉ có đúng một lượt phân tích được nạp. */
  findByAssetId(ctx: TenantContext, assetId: string): Promise<product_analyses | null> {
    return this.db.product_analyses.findFirst({ where: scopedWhere(ctx, { asset_id: assetId }) })
  }

  /**
   * Tạo một lượt phân tích ĐÃ DUYỆT SẴN — chỉ dùng cho dữ liệu lịch sử đã
   * qua vận hành thật ở v1 (P8, nợ #34). Luồng bình thường KHÔNG được gọi
   * hàm này: máy phân tích xong thì `create()` (PENDING), rồi người duyệt
   * qua `POST /vision/analyses/:id/approve` (`H3`) — đó là luật "kết quả
   * không ghi thẳng Product Master, phải qua duyệt" (`YC-R1`).
   *
   * Ngoại lệ ở đây hẹp và có lý do: tám lượt này đã được người của AVI GIFT
   * dùng để bán hàng thật ở v1. Bắt duyệt lại là bắt xác nhận lại một việc
   * đã làm. `approvedBy`/`approvedAt` vẫn ghi thật, nên vẫn truy vết được ai
   * chịu trách nhiệm và từ lúc nào.
   */
  createApprovedHistorical(
    ctx: TenantContext,
    input: CreateProductAnalysisInput & ApproveAnalysisInput
  ): Promise<product_analyses> {
    return this.db.product_analyses.create({
      data: scopedData(ctx, {
        product_id: input.productId,
        asset_id: input.assetId,
        job_id: input.jobId,
        provider: input.provider,
        model: input.model,
        model_version: input.modelVersion,
        contract_name: input.contractName,
        contract_version: input.contractVersion,
        raw: input.raw as InputJsonValue,
        approval_state: "APPROVED" as approval_state,
        approved_by: input.approvedBy,
        approved_at: input.approvedAt,
      }),
    })
  }

  /**
   * `PATCH /vision/analyses/:id` (`H2`). Chặn sửa bản đã `APPROVED` ngay ở
   * mệnh đề `where` — cùng khuôn `updateMany` + đọc lại như
   * `GenerationJobRepository.cancelIfPending`, chống đua giữa lúc kiểm ở
   * use-case và lúc ghi ở đây.
   */
  async updateEdited(
    ctx: TenantContext,
    id: string,
    edited: Record<string, unknown>
  ): Promise<product_analyses | null> {
    const result = await this.db.product_analyses.updateMany({
      where: scopedWhere(ctx, { id, NOT: { approval_state: "APPROVED" as approval_state } }),
      data: { edited: edited as InputJsonValue },
    })
    if (result.count === 0) return null
    return this.findById(ctx, id)
  }

  /**
   * `POST /vision/analyses/:id/approve` (`H3`). `product_id` được truyền
   * riêng vì `approveAnalysis` có thể vừa tạo `products` mới trong CÙNG giao
   * dịch khi bản ghi chưa gắn sản phẩm nào lúc tạo (`product_id` null lúc
   * `POST /vision/analyses`, đặc tả 06 mục 8).
   */
  async approve(
    ctx: TenantContext,
    id: string,
    productId: string | null,
    input: ApproveAnalysisInput
  ): Promise<product_analyses | null> {
    const result = await this.db.product_analyses.updateMany({
      where: scopedWhere(ctx, { id, NOT: { approval_state: "APPROVED" as approval_state } }),
      data: {
        ...(productId !== undefined ? { product_id: productId } : {}),
        approval_state: "APPROVED" as approval_state,
        approved_by: input.approvedBy,
        approved_at: input.approvedAt,
      },
    })
    if (result.count === 0) return null
    return this.findById(ctx, id)
  }

  /**
   * `POST /vision/analyses/:id/reject` (`H3`). Không đụng `product_id` và
   * không đụng Product Master — từ chối là nói "kết quả này không dùng", chứ
   * không phải rút lại thứ gì đã ghi (bản `APPROVED` không tới được đây).
   *
   * `approved_by`/`approved_at` mang nghĩa "ai chịu trách nhiệm cho phán
   * quyết cuối và lúc nào", nên phán quyết từ chối cũng ghi vào hai cột đó —
   * không thêm cột `rejected_by` song song, vì một bản ghi chỉ có đúng một
   * phán quyết cuối tại một thời điểm.
   */
  async reject(
    ctx: TenantContext,
    id: string,
    input: ApproveAnalysisInput
  ): Promise<product_analyses | null> {
    const result = await this.db.product_analyses.updateMany({
      where: scopedWhere(ctx, { id, approval_state: "PENDING" as approval_state }),
      data: {
        approval_state: "REJECTED" as approval_state,
        approved_by: input.approvedBy,
        approved_at: input.approvedAt,
      },
    })
    if (result.count === 0) return null
    return this.findById(ctx, id)
  }
}

let productAnalysisRepoInstance: IProductAnalysisRepository | null = null

export function getProductAnalysisRepository(db?: DbClient): IProductAnalysisRepository {
  if (db) return new ProductAnalysisRepository(db)
  if (!productAnalysisRepoInstance) {
    productAnalysisRepoInstance = new ProductAnalysisRepository()
  }
  return productAnalysisRepoInstance!
}
