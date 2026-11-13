"use client"

import type { LibraryType } from "@/modules/storage/domain/library"
import { LibraryScopeSelect } from "./library-scope-select"
import { LibraryTab, type LibraryItemView } from "./library-tab"
import type { LibrarySummary } from "./use-library-summary"

type Props = {
  library: LibrarySummary
  /** null: chỉ hiện bộ chọn phạm vi (tab v1 đang ở phạm vi Toàn chuỗi). */
  type: LibraryType | null
  showScope: boolean
  onTrash?: ((item: LibraryItemView) => void) | undefined
}

/** Bộ chọn phạm vi chuỗi + lưới thư viện của một loại (Kho dữ liệu v2). */
export function LibraryPanel({ library, type, showScope, onTrash }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {showScope && <LibraryScopeSelect value={library.scope} onChange={library.setScope} branches={library.branches} />}
      {type && (
        <LibraryTab
          type={type}
          scope={library.scope}
          showBranch={library.isChain && library.scope === "all"}
          refreshKey={library.refreshKey}
          onTrash={onTrash}
        />
      )}
    </div>
  )
}
