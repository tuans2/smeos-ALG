import bcrypt from "bcryptjs"

/** Mật khẩu băm bằng thuật toán có yếu tố chi phí (`YC-S6`). */
const COST = 12

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST)
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
