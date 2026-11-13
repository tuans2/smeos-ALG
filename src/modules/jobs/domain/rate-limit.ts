/**
 * Trần số job mỗi tổ chức trong một cửa sổ thời gian.
 *
 * Hạn mức credit trả lời "tổ chức này còn được dùng bao nhiêu lượt nữa".
 * Nó KHÔNG trả lời "bao nhiêu lượt cùng lúc". Một vòng lặp hỏng ở phía client
 * — hay một tổ chức nạp nhiều credit rồi đẩy một nghìn ảnh trong một phút —
 * tiêu hết hạn mức của nhà cung cấp và làm chậm mọi tổ chức khác, trong khi
 * mọi lượt đều "hợp lệ" theo credit.
 *
 * Trần này là trần VẬN HÀNH, không phải trần thương mại: nó bảo vệ nền tảng
 * khỏi một lượt dùng đột biến, không bán thêm hay bán bớt cho ai.
 *
 * Tệp thuần: không đọc biến môi trường, không truy vấn.
 */

export const CUA_SO_MAC_DINH_GIAY = 60
export const TRAN_MAC_DINH_MOI_CUA_SO = 60

export type CauHinhTran = {
  readonly cuaSoGiay: number
  readonly tranMoiCuaSo: number
}

export function docCauHinhTran(env: Record<string, string | undefined>): CauHinhTran {
  const soDuong = (v: string | undefined, mac_dinh: number): number => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : mac_dinh
  }
  return {
    cuaSoGiay: soDuong(env.JOB_RATE_LIMIT_WINDOW_SECONDS, CUA_SO_MAC_DINH_GIAY),
    tranMoiCuaSo: soDuong(env.JOB_RATE_LIMIT_PER_WINDOW, TRAN_MAC_DINH_MOI_CUA_SO),
  }
}

export function vuotTran(daTao: number, cauHinh: CauHinhTran): boolean {
  return daTao >= cauHinh.tranMoiCuaSo
}

export function moc(now: Date, cauHinh: CauHinhTran): Date {
  return new Date(now.getTime() - cauHinh.cuaSoGiay * 1000)
}
