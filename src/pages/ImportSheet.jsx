import { useState } from 'react'
import { importFromGoogleSheet } from '../lib/api'

export default function ImportSheet({ onNavigate }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${import.meta.env.VITE_GSHEET_ID}/edit#gid=${import.meta.env.VITE_GSHEET_GID}`

  async function handleImport() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await importFromGoogleSheet()
      setResult(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-blue-900">📥 Import từ Google Sheet</h1>
        <p className="text-sm text-slate-500 mt-0.5">Đồng bộ dữ liệu từ file KiemTra_ATVSLD_HienTruong_2025</p>
      </div>

      {/* Sheet info */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
        <div>
          <div className="text-sm font-semibold text-slate-700 mb-1">📊 Google Sheet nguồn</div>
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 text-sm hover:underline break-all"
          >
            {sheetUrl}
          </a>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 space-y-1">
          <div className="font-semibold mb-2">ℹ️ Hướng dẫn import</div>
          <div>• Dữ liệu sẽ được đọc từ sheet và đồng bộ vào Supabase</div>
          <div>• Nếu vi phạm đã tồn tại (theo Audit ID), dữ liệu sẽ được cập nhật</div>
          <div>• Trạng thái CAP hiện tại sẽ <strong>không bị ghi đè</strong></div>
          <div>• Sheet phải được chia sẻ công khai (Anyone with link can view)</div>
        </div>

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
            <div className="font-bold mb-1">✅ Import thành công!</div>
            <div>Đã xử lý <strong>{result.imported}</strong> dòng từ Google Sheet</div>
            {result.data && <div className="text-xs mt-1 text-green-600">{result.data.length} bản ghi được đồng bộ</div>}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            <div className="font-bold mb-1">⚠️ Lỗi import</div>
            <div>{error}</div>
            <div className="mt-2 text-xs text-red-600">
              Kiểm tra lại: Sheet phải được chia sẻ công khai (File → Share → Anyone with link → Viewer)
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={handleImport}
            disabled={loading}
            className="bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <><span className="animate-spin">⚙️</span> Đang import...</>
            ) : (
              <>📥 Bắt đầu import</>
            )}
          </button>

          {result && (
            <button
              onClick={() => onNavigate('violations')}
              className="bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              📋 Xem danh sách →
            </button>
          )}

          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors inline-flex items-center gap-1"
          >
            🔗 Mở Google Sheet
          </a>
        </div>
      </div>

      {/* Manual tips */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="font-bold text-sm text-blue-900 mb-3">💡 Cách cập nhật dữ liệu</div>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex gap-2">
            <span className="text-blue-700 font-bold">1.</span>
            <span>Dùng app Google Sheets trên điện thoại để ghi nhận vi phạm mới → nhấn <strong>Import</strong> tại đây để đồng bộ</span>
          </div>
          <div className="flex gap-2">
            <span className="text-blue-700 font-bold">2.</span>
            <span>Hoặc ghi nhận trực tiếp trên webapp qua menu <strong>"Ghi nhận vi phạm"</strong> (không cần Google Sheet)</span>
          </div>
          <div className="flex gap-2">
            <span className="text-blue-700 font-bold">3.</span>
            <span>Cập nhật trạng thái CAP và upload ảnh bằng chứng trong <strong>"Danh sách vi phạm"</strong> → click từng vi phạm</span>
          </div>
        </div>
      </div>
    </div>
  )
}
