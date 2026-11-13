import { readApiError } from "@/components/greeting-card/api-error"

export interface UploadedImage {
  assetId: string
  viewUrl: string
}

/** Tải ảnh sản phẩm lên kho (URL ký sẵn → PUT → đăng ký asset) và lấy URL xem. */
export async function uploadProductImage(file: File): Promise<UploadedImage> {
  const urlRes = await fetch("/api/v1/assets/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mime_type: file.type }),
  })
  if (!urlRes.ok) throw new Error(await readApiError(urlRes, "Không lấy được địa chỉ tải ảnh"))
  const { asset_id, storage_key, upload_url } = (await urlRes.json()) as { asset_id: string; storage_key: string; upload_url: string }
  const putRes = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": file.type }, body: file })
  if (!putRes.ok) throw new Error("Không tải được ảnh lên kho")
  const reg = await fetch("/api/v1/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asset_id, product_id: null, kind: "ORIGINAL", storage_key, mime_type: file.type, file_size: file.size }),
  })
  if (!reg.ok) throw new Error(await readApiError(reg, "Không đăng ký được ảnh"))
  const viewRes = await fetch(`/api/v1/assets/${asset_id}/view-url`)
  const viewUrl = viewRes.ok ? ((await viewRes.json()) as { url: string }).url : `/api/v1/storage/${storage_key}`
  return { assetId: asset_id, viewUrl }
}
