import { describe, expect, it, vi } from "vitest"

const FILE_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz012345"
const FOLDER_ID = "1FolderAbCdEfGhIjKlMnOpQrStUv6789"

vi.mock("@/modules/assets/adapters/storage-provider-factory", () => ({ getStorageProvider: () => ({ get: vi.fn() }) }))
vi.mock("../get-public-greeting-catalog", () => ({ getPublicGreetingCatalog: vi.fn() }))
vi.mock("../get-public-greeting-catalog-by-slug", () => ({ getPublicGreetingCatalogBySlug: vi.fn() }))
vi.mock("../adapters/collage-image-transcoder", () => ({ webpToJpegDataUrl: vi.fn() }))
const fetchThumbnail = vi.fn(async (_id: string) => ({ body: new Uint8Array([1, 2, 3]).buffer, contentType: "image/jpeg" }))
vi.mock("../../adapters/google-drive-thumbnail", () => ({
  isValidDriveId: (id: string | null | undefined) => typeof id === "string" && id.length >= 20,
  resolveFirstFileId: vi.fn(async () => FILE_ID),
  fetchThumbnail: (id: string) => fetchThumbnail(id),
}))
vi.mock("../get-greeting-catalog", () => ({
  getGreetingCatalogForCustomer: vi.fn().mockResolvedValue({
    status: "ACTIVE",
    catalog: { name: "Sweet Bloom" },
    shop: { name: "Siin Store" },
    products: [
      { price: 470000, imageUrl: `/api/v1/public/drive-thumb-proxy?file_id=${FILE_ID}` },
      { price: 560000, imageUrl: null, driveLink: `https://drive.google.com/drive/folders/${FOLDER_ID}` },
      { price: 500000, imageUrl: null, driveLink: null },
    ],
  }),
}))

const { catalogCollageBySendCode } = await import("../catalog-collage")

describe("catalogCollage — ảnh hoa từ Google Drive", () => {
  it("mẫu chỉ có ảnh Drive vẫn lên thumbnail (không rơi về logo)", async () => {
    const result = await catalogCollageBySendCode("SWEET123")
    expect(result?.images).toHaveLength(2)
    expect(result?.images[0]).toMatch(/^data:image\/jpeg;base64,/)
    expect(fetchThumbnail).toHaveBeenCalledWith(FILE_ID)
  })
})
