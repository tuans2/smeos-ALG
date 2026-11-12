import type { OrderPrintData } from "@/modules/orders/use-cases/get-order-printout"

/**
 * Băng rôn kệ hoa (checklist ALG 4.9): lời chúc in khổ ngang, chữ lớn để cắt dán lên dải băng.
 * Mỗi dòng của lời thiệp là một dải; dòng trống bị bỏ.
 */
export function RibbonBannerPrint({ data }: { data: OrderPrintData }) {
  const lines = data.cardMessage.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  // Đơn chưa có lời chúc → báo trên màn hình, không in câu thay thế lên băng rôn (audit BL-37)
  if (lines.length === 0) {
    return <p className="text-body-sm text-text-muted" role="status">Đơn {data.orderCode} chưa có lời chúc — bổ sung lời chúc rồi mới in băng rôn.</p>
  }
  return (
    <article className="flex flex-col gap-6 text-text">
      <style>{"@page { size: A4 landscape; margin: 10mm; } @media print { .no-print { display: none !important; } }"}</style>
      {lines.map((line, i) => (
        <p key={i} className="border-y-2 border-text py-6 text-center text-display font-black uppercase tracking-wide">{line}</p>
      ))}
      <p className="text-caption">Đơn {data.orderCode} · {data.deliveryWindow}</p>
    </article>
  )
}
