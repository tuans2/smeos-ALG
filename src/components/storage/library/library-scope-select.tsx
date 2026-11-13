"use client"

import { NativeSelect } from "@/components/ui/select"

type Props = {
  value: string
  onChange: (scope: string) => void
  branches: { id: string; name: string }[]
}

/**
 * Bộ chọn phạm vi cho chuỗi (Screen Contract `kho-du-lieu.md` §5): Toàn chuỗi ·
 * Trụ sở · từng chi nhánh. Không hiện cho cửa hàng đơn và nhân viên chi nhánh.
 */
export function LibraryScopeSelect({ value, onChange, branches }: Props) {
  return (
    <label className="flex w-full flex-col gap-1 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
      <span className="text-caption font-bold text-text-muted">Phạm vi</span>
      <NativeSelect
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full sm:w-56"
      >
        <option value="all">Toàn chuỗi</option>
        <option value="hq">Trụ sở</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </NativeSelect>
    </label>
  )
}
