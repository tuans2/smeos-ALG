export default function CatalogNotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface rounded-3xl p-8 border border-border shadow-xl text-center">
        <h1 className="text-title font-black text-text mb-2">Không tìm thấy danh mục</h1>
        <p className="text-body-sm text-text-muted">Đường dẫn catalog này không tồn tại hoặc đã bị gỡ bỏ.</p>
      </div>
    </div>
  )
}
