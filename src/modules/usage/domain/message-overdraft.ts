/**
 * Thấu chi credit cho tin nhắn gửi khách (PO 05/11/2026): hết credit hoặc chạm hạn mức tháng thì tin SMS/ZNS
 * vẫn gửi, số dư được âm tối đa `overdraft` credit; vượt mức đó thì tin bị bỏ. Hàm thuần — không Prisma.
 */

/** Số dư tối thiểu sau khi trừ một tin nhắn thấu chi. */
export function overdraftFloor(overdraft: number): number {
  return -Math.max(0, Math.floor(overdraft))
}

export interface OverdraftSignals {
  /** Lần này số dư chuyển từ ≥ 0 sang âm */
  crossedNegative: boolean
  /** Sau lần này không còn đủ chỗ cho một tin cùng giá — các tin sau sẽ bị bỏ */
  exhausted: boolean
}

/** Mốc cần báo Điều hành sau một lần trừ thấu chi (`balanceAfter` = số dư sau khi trừ). */
export function overdraftSignals(balanceAfter: number, cost: number, overdraft: number): OverdraftSignals {
  const before = balanceAfter + cost
  return {
    crossedNegative: before >= 0 && balanceAfter < 0,
    exhausted: balanceAfter - cost < overdraftFloor(overdraft),
  }
}
