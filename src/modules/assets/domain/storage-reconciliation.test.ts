import { describe, expect, it } from "vitest"

import { organizationOfKey, reconcileStorage, storageKeyFromReference } from "./storage-reconciliation"

describe("reconcileStorage", () => {
  it("tách tệp mồ côi, bản ghi thiếu tệp; bỏ qua khoá đang chờ xoá và khoá ngoài tiền tố quản lý", () => {
    const report = reconcileStorage({
      stored: [
        { key: "org/o1/p/a.jpg", size: 10 },
        { key: "org/o1/p/orphan.jpg", size: 7 },
        { key: "org/o1/p/pending.jpg", size: 3 },
        { key: "khac/x.bin", size: 99 },
      ],
      registryKeys: new Set(["org/o1/p/a.jpg", "videos/o1/j.mp4"]),
      pendingDeletes: new Set(["org/o1/p/pending.jpg"]),
    })
    expect(report.orphans).toEqual([{ key: "org/o1/p/orphan.jpg", size: 7 }])
    expect(report.orphanBytes).toBe(7)
    expect(report.missing).toEqual(["videos/o1/j.mp4"])
    expect(report.storedCount).toBe(3)
    expect(report.storedBytes).toBe(20)
  })
})

describe("storageKeyFromReference / organizationOfKey", () => {
  it("rút khoá từ URL kho và nhận diện tổ chức", () => {
    expect(storageKeyFromReference("/api/v1/storage/videos/o1/j.mp4?exp=1&sig=x")).toBe("videos/o1/j.mp4")
    expect(storageKeyFromReference("org/o1/p/a.jpg")).toBe("org/o1/p/a.jpg")
    expect(storageKeyFromReference("https://youtube.com/watch?v=1")).toBeNull()
    expect(storageKeyFromReference("org/o1/../o2/a.jpg")).toBeNull()
    expect(organizationOfKey("videos/o1/j.mp4")).toBe("o1")
    expect(organizationOfKey("khac/x")).toBeNull()
    expect(organizationOfKey("platform/partner-stores/s1/a.jpg")).toBeNull()
    expect(storageKeyFromReference("platform/partner-stores/s1/a.jpg")).toBe("platform/partner-stores/s1/a.jpg")
  })
})
