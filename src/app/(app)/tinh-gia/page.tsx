import { redirect } from "next/navigation"

/** Mở nhóm công cụ ở bước đầu tiên của luồng dữ liệu: nguyên liệu & đơn giá. */
export default function TinhGiaIndex() {
  redirect("/tinh-gia/nguyen-lieu")
}
