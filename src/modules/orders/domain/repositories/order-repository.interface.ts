/**
 * Order Repository Port (Domain Interface).
 * Pure TypeScript — No Prisma or database imports.
 * Belongs to Domain Layer of M10 — Orders (Store OS).
 */

import type {
  CreateOrderInput,
  UpdateOrderInput,
  OrderFilter,
  OrderListCursor,
  OrderRecord,
  OrderAssignmentRecord,
  OrderEventRecord,
  OrderEventAxis,
} from "../order-types"

/** Sự kiện trục chờ ghi cùng một lần cập nhật đơn. */
export interface PendingOrderEvent {
  axis: OrderEventAxis
  fromValue: string | null
  toValue: string
  actorId: string | null
  reason: string | null
}

export interface IOrderRepository {
  /**
   * Cấp số thứ tự kế tiếp cho mã đơn có tiền tố `prefix` (`orderCodePrefix`) — nguyên tử, hai lần gọi đồng thời không
   * nhận cùng số (đặc tả 07 §57).
   */
  allocateOrderCodeNumber(organizationId: string, prefix: string): Promise<number>

  /** Tạo đơn hàng mới kèm items và event khởi tạo (transactional). */
  create(
    organizationId: string,
    code: string,
    input: CreateOrderInput,
    totalVnd: number,
    createdBy: string
  ): Promise<OrderRecord>

  /** Tìm đơn hàng theo ID nội bộ, có kiểm soát cách ly theo tenant. */
  findById(organizationId: string, id: string): Promise<OrderRecord | null>

  /** Đơn đã tạo bằng `Idempotency-Key` này trong tổ chức (cùng dạng phản hồi với `create`) kèm băm thân đã lưu. */
  findByIdempotencyKey(organizationId: string, key: string): Promise<{ order: OrderRecord; bodyHash: string | null } | null>

  /** Tìm đơn hàng theo mã đơn hiển thị (code), có kiểm soát cách ly theo tenant. */
  findByCode(organizationId: string, code: string): Promise<OrderRecord | null>

  /** Danh sách đơn hàng theo bộ lọc, phân trang con trỏ (audit API-10). */
  list(organizationId: string, filter?: OrderFilter): Promise<OrderListPage>

  /**
   * Cập nhật thông tin / trạng thái đơn hàng. `events` (nếu có) được ghi CÙNG giao dịch với cập nhật — lỗi giữa
   * chừng không để lại sự kiện không có thay đổi tương ứng (SLA đo từ chuỗi sự kiện; audit BL-18).
   */
  update(
    organizationId: string,
    id: string,
    input: UpdateOrderInput,
    events?: readonly PendingOrderEvent[]
  ): Promise<OrderRecord>

  /** Phân công nhân sự thực hiện đơn (thợ chế tác, thợ may, đầu bếp...). */
  createAssignment(
    organizationId: string,
    orderId: string,
    assigneeId: string,
    assignedBy: string,
    difficulty?: string
  ): Promise<OrderAssignmentRecord>

  /** Ghi nhận sự kiện thay đổi trên các trục (order, production, delivery). */
  recordEvent(
    organizationId: string,
    orderId: string,
    axis: OrderEventAxis,
    toValue: string,
    actorId?: string,
    fromValue?: string,
    reason?: string
  ): Promise<OrderEventRecord>
}

/** Một trang đơn: `total` đếm cả danh sách đang lọc (không theo con trỏ); `nextCursor` `null` khi hết. */
export interface OrderListPage {
  orders: OrderRecord[]
  total: number
  nextCursor: OrderListCursor | null
}

