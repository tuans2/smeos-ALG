import { prisma } from "@/core/tenancy/infra/prisma"

/** Truy vấn ảnh bill chuyển khoản phục vụ đối soát (luôn trong phạm vi một tổ chức). */
export class PaymentProofRepository {
  constructor(private readonly db = prisma) {}

  /** Có ảnh bill KHÁC của cùng tổ chức đã đọc ra đúng mã giao dịch này không (khách dùng lại bill). */
  async transactionCodeUsedElsewhere(organizationId: string, transactionCode: string, assetId: string): Promise<boolean> {
    const code = transactionCode.trim()
    if (code.length < 4) return false
    const other = await this.db.assets.findFirst({
      where: {
        organization_id: organizationId,
        id: { not: assetId },
        metadata: { path: ["ai_analysis", "extracted", "transactionCode"], equals: code },
      },
      select: { id: true },
    })
    return other !== null
  }
}

let _paymentProofRepositorySingleton: PaymentProofRepository | null = null
export function getPaymentProofRepository(): PaymentProofRepository {
  if (!_paymentProofRepositorySingleton) _paymentProofRepositorySingleton = new PaymentProofRepository()
  return _paymentProofRepositorySingleton
}
