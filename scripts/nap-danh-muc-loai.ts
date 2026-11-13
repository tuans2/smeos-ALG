/**
 * Nạp `workers/vision/contracts/species_catalog.json` vào hai bảng
 * `flower_taxonomy` và `flower_confusable_pairs`.
 *
 * Chạy lại an toàn: `ON CONFLICT … DO UPDATE` theo mã, nên nạp hai lần không
 * sinh dòng trùng.
 *
 * Dùng SQL thẳng thay vì API sinh sẵn của Prisma vì đây là một lượt nạp dữ
 * liệu một chiều, chạy tay, không nằm trong đường chạy của ứng dụng — và vì
 * nó phải chạy được ngay sau `prisma db push`, kể cả khi chưa ai chạy
 * `prisma generate` trên máy đó.
 *
 *   npx prisma db push
 *   npx tsx --env-file-if-exists=.env scripts/nap-danh-muc-loai.ts
 */
import { readFileSync } from "node:fs"
import path from "node:path"

import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"

type Loai = Record<string, unknown> & { ma_loai: string; nhom: string; ten_chuan: string }
type Cap = {
  ma_cap: string
  ma_loai_a: string
  ma_loai_b: string
  dau_hieu_tach_a: string
  dau_hieu_tach_b: string
  muc_do_nham: string
}

const chuoi = (v: unknown): string | null =>
  typeof v === "string" && v.trim().length > 0 ? v : null
const so = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null)
const json = (v: unknown): string => JSON.stringify(Array.isArray(v) ? v : [])

async function main(): Promise<void> {
  const tep = path.join(process.cwd(), "workers", "vision", "contracts", "species_catalog.json")
  const catalog = JSON.parse(readFileSync(tep, "utf-8")) as { loai: Loai[]; cap_de_nham: Cap[] }

  let soLoai = 0
  for (const l of catalog.loai) {
    await prisma.$executeRaw`
      INSERT INTO flower_taxonomy (
        ma_loai, nhom, cong_nang, ten_chuan, ten_khac, nhom_hoa, dvt_chuan,
        so_bong_tren_dvt, duong_kinh_bong_cm, dien_tich_phu_cm2,
        ty_le_nhuy_tren_bong, mau_nhuy, kieu_moc, dai_mau_tu_nhien,
        dac_diem_phan_biet, mua_vu, trang_thai, created_at, updated_at
      ) VALUES (
        ${l.ma_loai}, ${l.nhom}, ${chuoi(l.cong_nang)}, ${l.ten_chuan},
        ${json(l.ten_khac)}::jsonb, ${chuoi(l.nhom_hoa)}, ${chuoi(l.dvt_chuan)},
        ${so(l.so_bong_tren_dvt)}, ${so(l.duong_kinh_bong_cm)}, ${so(l.dien_tich_phu_cm2)},
        ${so(l.ty_le_nhuy_tren_bong)}, ${chuoi(l.mau_nhuy)}, ${chuoi(l.kieu_moc)},
        ${json(l.dai_mau_tu_nhien)}::jsonb, ${chuoi(l.dac_diem_phan_biet)},
        ${chuoi(l.mua_vu)}, ${chuoi(l.trang_thai) ?? "Đang dùng"}, NOW(), NOW()
      )
      ON CONFLICT (ma_loai) DO UPDATE SET
        nhom = EXCLUDED.nhom,
        cong_nang = EXCLUDED.cong_nang,
        ten_chuan = EXCLUDED.ten_chuan,
        ten_khac = EXCLUDED.ten_khac,
        nhom_hoa = EXCLUDED.nhom_hoa,
        dvt_chuan = EXCLUDED.dvt_chuan,
        so_bong_tren_dvt = EXCLUDED.so_bong_tren_dvt,
        duong_kinh_bong_cm = EXCLUDED.duong_kinh_bong_cm,
        dien_tich_phu_cm2 = EXCLUDED.dien_tich_phu_cm2,
        ty_le_nhuy_tren_bong = EXCLUDED.ty_le_nhuy_tren_bong,
        mau_nhuy = EXCLUDED.mau_nhuy,
        kieu_moc = EXCLUDED.kieu_moc,
        dai_mau_tu_nhien = EXCLUDED.dai_mau_tu_nhien,
        dac_diem_phan_biet = EXCLUDED.dac_diem_phan_biet,
        mua_vu = EXCLUDED.mua_vu,
        trang_thai = EXCLUDED.trang_thai,
        updated_at = NOW()
    `
    soLoai += 1
  }

  const maCoThat = new Set(catalog.loai.map((l) => l.ma_loai))
  let soCap = 0
  const boQua: string[] = []
  for (const c of catalog.cap_de_nham) {
    // Cặp trỏ tới một mã không có trong danh mục là dữ liệu hỏng ở nguồn —
    // bỏ qua và ĐẾM, không im lặng nuốt mất.
    if (!maCoThat.has(c.ma_loai_a) || !maCoThat.has(c.ma_loai_b)) {
      boQua.push(c.ma_cap)
      continue
    }
    await prisma.$executeRaw`
      INSERT INTO flower_confusable_pairs (
        ma_cap, ma_loai_a, ma_loai_b, dau_hieu_tach_a, dau_hieu_tach_b, muc_do_nham
      ) VALUES (
        ${c.ma_cap}, ${c.ma_loai_a}, ${c.ma_loai_b},
        ${c.dau_hieu_tach_a}, ${c.dau_hieu_tach_b}, ${c.muc_do_nham}
      )
      ON CONFLICT (ma_cap) DO UPDATE SET
        ma_loai_a = EXCLUDED.ma_loai_a,
        ma_loai_b = EXCLUDED.ma_loai_b,
        dau_hieu_tach_a = EXCLUDED.dau_hieu_tach_a,
        dau_hieu_tach_b = EXCLUDED.dau_hieu_tach_b,
        muc_do_nham = EXCLUDED.muc_do_nham
    `
    soCap += 1
  }

  console.log(`Đã nạp ${soLoai} loài và ${soCap} cặp dễ nhầm.`)
  if (boQua.length > 0) {
    console.warn(`${boQua.length} cặp bị bỏ vì trỏ tới mã loài không có: ${boQua.join(", ")}`)
  }
  void Prisma
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
