/**
 * Tiện ích tải tệp và phân giải URL tài nguyên thương hiệu.
 */

export interface UploadedBrandAsset {
  assetId: string
  viewUrl: string
}

/** Tải tệp lên hệ thống kho (upload-url -> PUT -> đăng ký asset -> lấy view-url) */
export async function uploadBrandAsset(file: File): Promise<UploadedBrandAsset> {
  const urlRes = await fetch("/api/v1/assets/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_id: null, mime_type: file.type || "image/png" }),
  })

  if (!urlRes.ok) {
    throw new Error(`Không lấy được liên kết tải lên: ${urlRes.statusText}`)
  }

  const { asset_id, storage_key, upload_url } = (await urlRes.json()) as {
    asset_id: string
    storage_key: string
    upload_url: string
  }

  const putRes = await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": file.type || "image/png" },
    body: file,
  })

  if (!putRes.ok) {
    throw new Error("Lỗi lưu trữ tệp tin lên hệ thống")
  }

  const registerRes = await fetch("/api/v1/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      asset_id,
      product_id: null,
      kind: "ORIGINAL",
      storage_key,
      mime_type: file.type || "image/png",
      file_size: file.size,
    }),
  })

  if (!registerRes.ok) {
    throw new Error("Không thể đăng ký tài nguyên vào kho")
  }

  let viewUrl = ""
  try {
    const viewRes = await fetch(`/api/v1/assets/${encodeURIComponent(asset_id)}/view-url`)
    if (viewRes.ok) {
      const v = (await viewRes.json()) as { url?: string }
      viewUrl = v.url || ""
    }
  } catch {
    // fallback
  }

  return { assetId: asset_id, viewUrl: viewUrl || URL.createObjectURL(file) }
}

/** Phân giải asset ID thành URL xem (hoặc trả về nguyên vẹn nếu đã là URL hợp lệ) */
export async function resolveAssetViewUrl(assetIdOrUrl: string): Promise<string | null> {
  if (!assetIdOrUrl || typeof assetIdOrUrl !== "string") return null
  const trimmed = assetIdOrUrl.trim()
  if (!trimmed) return null

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed
  }

  try {
    const res = await fetch(`/api/v1/assets/${encodeURIComponent(trimmed)}/view-url`)
    if (res.ok) {
      const data = (await res.json()) as { url?: string }
      return data.url || null
    }
  } catch {
    // fallback
  }
  return null
}
