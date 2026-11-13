import { PriceListDocument } from "@/components/promotions/price-list-document"

/** Xem và in một bảng giá. */
export default async function BangGiaChiTietPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 print:max-w-none print:p-0">
      <PriceListDocument id={id} />
    </div>
  )
}
