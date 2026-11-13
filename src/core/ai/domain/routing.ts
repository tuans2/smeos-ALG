/**
 * Bộ định tuyến — đặc tả 10 mục 7, quyết định D17.
 *
 * Luật thuần, không import hạ tầng: cùng điều kiện với `domain/` của mọi
 * module, để năm ràng buộc dưới đây có test khoá mà không cần cơ sở dữ liệu.
 *
 * NĂM RÀNG BUỘC, không lách được:
 *   1. Chỉ định tuyến TỰ ĐỘNG trong số mô hình đã đo (`SAN_XUAT`). Mô hình
 *      chưa đo chỉ chạy khi tổ chức tự chọn — D5-c không đổi.
 *   2. Chính sách của tổ chức là TRẦN, không phải gợi ý.
 *   3. Mô hình chốt vào `payload` lúc tạo job; worker không tra lại.
 *   4. Thác nghiệm chỉ LEO LÊN.
 *   5. Sàn quyền riêng tư cắt SAU CÙNG.
 */
import type { AiCapabilityDefinition, AiPrivacyLevel } from "./ai-capabilities"
import { effectivePrivacyFloor, modelAllowedUnderFloor } from "./privacy"

export type AiClass = "thap" | "trung_binh" | "cao"
export type AiMeasureState = "CHUA_DO" | "THU_NGHIEM" | "SAN_XUAT"

const CLASS_RANK: Record<AiClass, number> = { thap: 0, trung_binh: 1, cao: 2 }

export interface AiModelCandidate {
  readonly key: string
  readonly provider: string
  readonly enabled: boolean
  readonly measureState: AiMeasureState
  readonly leavesInfra: boolean
  readonly qualityClass: AiClass
  readonly costClass: AiClass
  readonly latencyClass: AiClass
  /** Tên hoặc mã năng lực mà mô hình phục vụ. */
  readonly capabilities: readonly string[]
  /** Bốn ô giấy phép đủ hay không — D18. Thiếu một ô thì mô hình không chạy. */
  readonly licenseComplete: boolean
}

export interface AiPolicy {
  /** TRẦN: bộ định tuyến chỉ được chọn trong danh sách này. Rỗng = chưa đặt. */
  readonly allowedModels: readonly string[]
  readonly privacyFloor?: AiPrivacyLevel | undefined
  readonly qualityTarget?: AiClass | undefined
}

export interface AiRoutingRequest {
  readonly capability: AiCapabilityDefinition
  /** Mức của chính lời gọi, suy từ loại dữ liệu — không nhận từ client. */
  readonly privacy?: AiPrivacyLevel | undefined
  readonly qualityTarget?: AiClass | undefined
  /**
   * Mô hình đã chốt vào `payload` của job. Có giá trị thì đó là mô hình chạy,
   * không tra lại (ràng buộc 3) — trừ khi nó đã rời khỏi trần của tổ chức.
   */
  readonly pinnedModelKey?: string | undefined
  /**
   * Bắt đầu từ lớp chất lượng THẤP NHẤT đủ điều kiện rồi để thác nghiệm leo
   * lên, thay vì bắt đầu từ lớp cao nhất.
   *
   * Chỉ bật khi năng lực đó CÓ ngưỡng chấp nhận đã đo. Không có ngưỡng thì
   * không có gì phát hiện ra một kết quả rẻ-mà-tệ, nên thác không bao giờ leo
   * và "bắt đầu từ lớp thấp" trở thành "luôn chạy mô hình rẻ nhất" — đúng
   * chiều ngược với thứ tự ưu tiên đã chốt: Accuracy > Quality > Cost > Speed.
   * Cổng AI đặt cờ này bằng `threshold !== null`, không đặt bằng cấu hình.
   */
  readonly cascade?: boolean | undefined
  /**
   * Thứ tự ưu tiên nhà cung cấp của tổ chức cho lượt này (PO 25/09/2026 —
   * `creative-production/domain/provider-catalog.ts`, loại `content`). Có giá
   * trị thì: (a) mô hình trong danh sách được coi là TỔ CHỨC TỰ CHỌN nên chạy
   * được dù chưa đo trên bộ ảnh vàng (cùng ngoại lệ của ràng buộc 1); (b) xếp
   * hạng theo đúng thứ tự này trước mọi tiêu chí lớp; (c) dự phòng đi theo thứ
   * tự này, kể cả sang mô hình lớp thấp hơn mà tổ chức đã xếp — vẫn trong trần
   * và vẫn qua sàn quyền riêng tư.
   */
  readonly preferredModelKeys?: readonly string[] | undefined
}

export type RoutingRefusalReason =
  | "KHONG_CO_MO_HINH_DU_DIEU_KIEN"
  | "PINNED_NGOAI_TRAN"
  | "NANG_LUC_TAT_DINH"

export type RoutingDecision =
  | {
      readonly kind: "chon"
      readonly model: AiModelCandidate
      readonly floor: AiPrivacyLevel
      readonly pinned: boolean
      /** Mô hình bị loại, kèm lý do — nguồn của phần ghi sổ ở `ai_requests`. */
      readonly rejected: ReadonlyArray<{ readonly key: string; readonly reason: string }>
    }
  | {
      readonly kind: "tu_choi"
      readonly reason: RoutingRefusalReason
      readonly floor: AiPrivacyLevel
      readonly rejected: ReadonlyArray<{ readonly key: string; readonly reason: string }>
    }

function servesCapability(model: AiModelCandidate, cap: AiCapabilityDefinition): boolean {
  return model.capabilities.includes(cap.code) || model.capabilities.includes(cap.name)
}

/**
 * Chọn mô hình cho một lời gọi.
 *
 * Thứ tự cắt là thứ tự thi hành, không phải thứ tự trình bày — đảo lại là mở
 * toang sàn quyền riêng tư, đúng như đảo ba lớp cắt của RBAC.
 */
export function selectModel(
  candidates: readonly AiModelCandidate[],
  policy: AiPolicy,
  request: AiRoutingRequest
): RoutingDecision {
  const floor = effectivePrivacyFloor(
    request.capability.privacyFloor,
    policy.privacyFloor,
    request.privacy
  )
  const rejected: Array<{ key: string; reason: string }> = []

  if (request.capability.kind === "deterministic") {
    return { kind: "tu_choi", reason: "NANG_LUC_TAT_DINH", floor, rejected }
  }

  const ceiling = policy.allowedModels
  const inCeiling = (key: string) => ceiling.length === 0 || ceiling.includes(key)

  // Ràng buộc 3 — mô hình đã chốt vào payload thắng, nhưng vẫn phải trong trần
  // và vẫn phải qua sàn quyền riêng tư. Trần đổi sau khi job xếp hàng là lý do
  // duy nhất một job bị từ chối ở đây.
  if (request.pinnedModelKey) {
    const pinned = candidates.find((m) => m.key === request.pinnedModelKey)
    if (!pinned || !inCeiling(pinned.key) || !pinned.enabled || !pinned.licenseComplete) {
      return { kind: "tu_choi", reason: "PINNED_NGOAI_TRAN", floor, rejected }
    }
    if (!modelAllowedUnderFloor(pinned, floor)) {
      return { kind: "tu_choi", reason: "PINNED_NGOAI_TRAN", floor, rejected }
    }
    return { kind: "chon", model: pinned, floor, pinned: true, rejected }
  }

  const eligible = candidates.filter((model) => {
    if (!servesCapability(model, request.capability)) return false
    if (!model.enabled) {
      rejected.push({ key: model.key, reason: "chua_bat" })
      return false
    }
    if (!model.licenseComplete) {
      rejected.push({ key: model.key, reason: "thieu_o_giay_phep" })
      return false
    }
    if (!inCeiling(model.key)) {
      rejected.push({ key: model.key, reason: "ngoai_tran_to_chuc" })
      return false
    }
    if (!modelAllowedUnderFloor(model, floor)) {
      rejected.push({ key: model.key, reason: `vuot_san_${floor.toLowerCase()}` })
      return false
    }
    return true
  })

  // Ràng buộc 1 — tự động chỉ chọn mô hình ĐÃ ĐO. Ngoại lệ duy nhất: tổ chức
  // đã thu trần về đúng một mô hình, tức chính họ đã chọn nó (`H4`/`U2`).
  const explicitSingleChoice = ceiling.length === 1
  const preferred = request.preferredModelKeys ?? []
  const measured = eligible.filter((m) => m.measureState === "SAN_XUAT" || preferred.includes(m.key))
  const pool = measured.length > 0 ? measured : explicitSingleChoice ? eligible : []

  for (const model of eligible) {
    if (!pool.includes(model)) rejected.push({ key: model.key, reason: "chua_do_tren_bo_anh_vang" })
  }

  if (pool.length === 0) {
    return { kind: "tu_choi", reason: "KHONG_CO_MO_HINH_DU_DIEU_KIEN", floor, rejected }
  }

  const target = request.qualityTarget ?? policy.qualityTarget
  const rank = (key: string) => {
    const i = preferred.indexOf(key)
    return i < 0 ? Number.MAX_SAFE_INTEGER : i
  }
  const ranked = [...pool].sort((a, b) => {
    if (preferred.length > 0 && rank(a.key) !== rank(b.key)) return rank(a.key) - rank(b.key)
    if (target) {
      const da = Math.abs(CLASS_RANK[a.qualityClass] - CLASS_RANK[target])
      const db = Math.abs(CLASS_RANK[b.qualityClass] - CLASS_RANK[target])
      if (da !== db) return da - db
    }
    // Xếp hạng bằng LỚP, không bằng một công thức điểm — chưa có số đo thật
    // thì một công thức chỉ là một con số trông hợp lý (D20).
    if (a.qualityClass !== b.qualityClass) {
      return request.cascade
        ? CLASS_RANK[a.qualityClass] - CLASS_RANK[b.qualityClass]
        : CLASS_RANK[b.qualityClass] - CLASS_RANK[a.qualityClass]
    }
    if (a.costClass !== b.costClass) return CLASS_RANK[a.costClass] - CLASS_RANK[b.costClass]
    if (a.latencyClass !== b.latencyClass) {
      return CLASS_RANK[a.latencyClass] - CLASS_RANK[b.latencyClass]
    }
    return a.key.localeCompare(b.key)
  })

  const chosen = ranked[0]
  if (!chosen) {
    return { kind: "tu_choi", reason: "KHONG_CO_MO_HINH_DU_DIEU_KIEN", floor, rejected }
  }

  return { kind: "chon", model: chosen, floor, pinned: false, rejected }
}

/**
 * Bỏ mô hình đã chốt khỏi một yêu cầu định tuyến.
 *
 * Ràng buộc 3 nói worker không tra lại mô hình đã chốt — nhưng một bước LEO
 * THÁC hay DỰ PHÒNG thì đúng là lúc phải chọn lại, nên hai hàm dưới đây bỏ
 * khoá chốt trước khi gọi lại bộ chọn. Không bỏ thì thác không bao giờ leo
 * được: nó sẽ chọn lại đúng mô hình vừa cho kết quả chưa đủ.
 */
function khongChotMoHinh(request: AiRoutingRequest): AiRoutingRequest {
  const banSao = { ...request }
  delete (banSao as { pinnedModelKey?: string | undefined }).pinnedModelKey
  return banSao
}

/**
 * Ràng buộc 4 — bước leo thác. Chỉ trả về mô hình có lớp chất lượng CAO HƠN
 * mô hình vừa chạy; không có thì trả `null` và cổng AI đặt `needs_review`.
 * Không đường nào hạ chất lượng để tiết kiệm (`YC-G10`).
 */
export function nextEscalation(
  current: AiModelCandidate,
  candidates: readonly AiModelCandidate[],
  policy: AiPolicy,
  request: AiRoutingRequest
): AiModelCandidate | null {
  const higher = candidates.filter(
    (m) => CLASS_RANK[m.qualityClass] > CLASS_RANK[current.qualityClass]
  )
  const decision = selectModel(higher, policy, khongChotMoHinh(request))
  return decision.kind === "chon" ? decision.model : null
}

/**
 * Bước dự phòng khi một mô hình HỎNG KỸ THUẬT — nhà cung cấp khác, cùng lớp
 * chất lượng hoặc cao hơn, vẫn qua sàn quyền riêng tư. Dự phòng không bao giờ
 * vượt sàn: hết đường trong phạm vi cho phép thì job `FAILED` và credit hoàn
 * theo D3-b (`YC-G11`).
 */
export function nextFallback(
  failed: AiModelCandidate,
  candidates: readonly AiModelCandidate[],
  policy: AiPolicy,
  request: AiRoutingRequest,
  alreadyTried: readonly string[] = []
): AiModelCandidate | null {
  const tried = new Set([failed.key, ...alreadyTried])
  // Có thứ tự ưu tiên của tổ chức: đi tiếp đúng thứ tự đó (xem
  // `AiRoutingRequest.preferredModelKeys`). Không có: luật cũ — nhà cung cấp
  // khác, không hạ lớp.
  const others = request.preferredModelKeys?.length
    ? candidates.filter((m) => !tried.has(m.key) && request.preferredModelKeys!.includes(m.key))
    : candidates.filter(
        (m) =>
          !tried.has(m.key) &&
          m.provider !== failed.provider &&
          CLASS_RANK[m.qualityClass] >= CLASS_RANK[failed.qualityClass]
      )
  const decision = selectModel(others, policy, khongChotMoHinh(request))
  return decision.kind === "chon" ? decision.model : null
}
