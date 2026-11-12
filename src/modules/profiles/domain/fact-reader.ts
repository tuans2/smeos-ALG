/**
 * Fact Domain Model & Interface (Clean Architecture)
 * ALG Core — Final Hardening Patch v2.3 / PATCH P3 (Mục 5.6)
 *
 * Cho phép các chức năng sau này (Landing Page, Campaign, Social Post, AI Content...)
 * truy cập thông tin cấu trúc từ Business Profile thông qua cơ chế Fact: PROJECTED
 */

export type FactKind = 'PROJECTED' | 'INDEPENDENT'

export type FactOrigin = 'DECLARED' | 'OBSERVED' | 'DERIVED' | 'IMPORTED'

export type FactVerification = 'UNVERIFIED' | 'SELF_DECLARED' | 'VERIFIED' | 'REJECTED'

export type FactPublication = 'NOT_APPROVED' | 'APPROVED' | 'REVOKED'

export interface FactProjectionSource {
  sourceKind: 'business_profile' | 'brand_profile' | 'product'
  sourceId: string
}

export interface Fact {
  factId: string
  organizationId: string
  kind: FactKind
  subject: string       // vd: "shop", "brand", "product"
  predicate: string     // vd: "name", "hotline", "address", "tone_and_voice"
  object: unknown       // Giá trị thực tế (string, number, array, object)
  origin: FactOrigin
  verification: FactVerification
  publication: FactPublication
  effectiveFrom: Date
  effectiveUntil?: Date
  version: number
  projectionOf?: FactProjectionSource
}

export interface IFactReader {
  /**
   * Đọc danh sách Facts của một tổ chức / shop theo subject và predicate tùy chọn
   */
  readFacts(
    organizationId: string,
    query?: {
      subject?: string
      predicate?: string
    }
  ): Promise<Fact[]>

  /**
   * Đọc một Fact cụ thể theo subject & predicate
   */
  getFact(
    organizationId: string,
    subject: string,
    predicate: string
  ): Promise<Fact | null>
}
