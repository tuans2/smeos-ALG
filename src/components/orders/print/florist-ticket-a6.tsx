import type { OrderPrintData } from "@/modules/orders/use-cases/get-order-printout"

/** Phiếu xưởng khổ A6 (checklist ALG 4.9): ảnh mẫu, công thức cắm theo phiên bản, lời thiệp — không có giá. */
export function FloristTicketA6({ data }: { data: OrderPrintData }) {
  return (
    <article className="flex flex-col gap-2 text-caption text-text">
      <style>{"@page { size: A6; margin: 6mm; } @media print { .no-print { display: none !important; } }"}</style>
      <header className="flex items-start justify-between border-b border-border pb-1">
        <div>
          <p className="text-title-sm font-black">Đơn {data.orderCode}</p>
          <p>Giao: {data.deliveryWindow}</p>
        </div>
        <p className="text-right">Người nhận: {data.recipientInfo.name}</p>
      </header>
      {data.florist.map((item, i) => (
        <section key={i} className="flex gap-2 border-b border-dashed border-border pb-2">
          {item.sampleImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.sampleImageUrl} alt={`Ảnh mẫu ${item.description ?? ""}`} className="h-24 w-24 object-cover" />
          )}
          <div className="flex-1">
            <p className="font-bold">{item.description ?? "Mẫu theo yêu cầu"} × {item.quantity}</p>
            {item.variantName && <p className="font-bold">Phiên bản {item.variantName}{item.stemCount ? `: ${item.stemCount} cành` : ""}</p>}
            {item.recipe.length > 0 ? (
              <ul>
                {item.recipe.map((r, j) => (
                  <li key={j}>☐ {r.flowerName}{r.color ? ` (${r.color})` : ""}: {r.quantity} {r.unit ?? ""}{r.role ? ` · ${r.role}` : ""}</li>
                ))}
              </ul>
            ) : (
              <p>Cắm theo ảnh mẫu.</p>
            )}
          </div>
        </section>
      ))}
      <section>
        <p className="font-bold">Lời thiệp</p>
        <p className="whitespace-pre-line">{data.cardMessage || "Không có lời nhắn thiệp"}</p>
      </section>
      {data.floristNote && <p className="whitespace-pre-line">Ghi chú xưởng: {data.floristNote}</p>}
    </article>
  )
}
