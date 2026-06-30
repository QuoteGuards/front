import { useCallback, useEffect, useRef, useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import { getAdminQuoteWritingTrainingApi, uploadTrainingVideoApi } from '../../api/adminTrainingApi'

const MAX_VIDEO_BYTES = 300 * 1024 * 1024

export default function AdminTrainingManagePage() {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const fileInputRef = useRef(null)
  const requestIdRef = useRef(0)

  const fetchContent = useCallback((requestId) => {
    return getAdminQuoteWritingTrainingApi()
      .then((data) => {
        if (requestIdRef.current === requestId) setContent(data)
      })
      .catch((err) => {
        if (requestIdRef.current === requestId) {
          setError(err.response?.data?.message ?? '교육 콘텐츠를 불러오지 못했습니다.')
        }
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setLoading(false)
      })
  }, [])

  const loadContent = useCallback(() => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError('')
    return fetchContent(requestId)
  }, [fetchContent])

  useEffect(() => {
    const requestId = ++requestIdRef.current
    fetchContent(requestId)
  }, [fetchContent])

  const onPickVideo = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploadError('')
    setSuccessMessage('')

    if (!file.name.toLowerCase().endsWith('.mp4')) {
      setUploadError('MP4 파일만 업로드할 수 있습니다.')
      return
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setUploadError('파일 크기가 너무 큽니다. (최대 300MB)')
      return
    }

    setUploading(true)
    try {
      const url = await uploadTrainingVideoApi(file)
      setContent((prev) => (prev ? { ...prev, videoUrl: url } : prev))
      setSuccessMessage('교육 영상이 업로드되었습니다. 영업사원 교육 화면에 바로 반영됩니다.')
    } catch (err) {
      const message =
        err.response?.data?.message
        ?? (err.code === 'ECONNABORTED'
          ? '업로드 시간이 초과되었습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
          : err.message?.includes('Network Error')
            ? '서버에 연결할 수 없습니다. 백엔드(8080) 실행 여부를 확인해 주세요.'
            : '영상 업로드에 실패했습니다.')
      setUploadError(message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={['관리', '교육 관리']}
        title="견적 작성 교육 관리"
        actions={
          <Button variant="outline" size="sm" onClick={loadContent} disabled={loading}>
            새로고침
          </Button>
        }
      />

      <div className="max-w-3xl">
        {loading && <p className="text-sm text-[var(--color-text-muted)]">불러오는 중...</p>}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {successMessage}
          </div>
        )}

        {!loading && !error && content && (
          <div className="space-y-6">
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-white)] p-6 shadow-sm">
              <h2 className="text-sm font-bold text-[var(--color-text-main)] mb-4">교육 정보</h2>
              <dl className="grid grid-cols-[120px_1fr] gap-y-3 text-sm">
                <dt className="text-[var(--color-text-sub)]">교육명</dt>
                <dd className="text-[var(--color-text-main)] font-medium">{content.title}</dd>
                <dt className="text-[var(--color-text-sub)]">설명</dt>
                <dd className="text-[var(--color-text-sub)]">{content.description || '-'}</dd>
                <dt className="text-[var(--color-text-sub)]">필수 여부</dt>
                <dd>{content.required ? '필수' : '선택'}</dd>
                <dt className="text-[var(--color-text-sub)]">영상 URL</dt>
                <dd className="text-[var(--color-text-sub)] break-all">{content.videoUrl || '등록된 영상 없음'}</dd>
              </dl>
            </section>

            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-white)] p-6 shadow-sm">
              <h2 className="text-sm font-bold text-[var(--color-text-main)] mb-2">교육 영상 업로드</h2>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                MP4 파일만 업로드할 수 있습니다. (최대 300MB) 제품 이미지와 동일하게 로컬 또는 S3에 저장됩니다.
              </p>

              {content.videoUrl && (
                <div className="mb-4 rounded-xl overflow-hidden bg-black aspect-video max-w-xl">
                  <video
                    key={content.videoUrl}
                    src={content.videoUrl}
                    controls
                    className="w-full h-full"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? '업로드 중…' : content.videoUrl ? '영상 교체' : '영상 업로드'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,.mp4"
                  hidden
                  onChange={onPickVideo}
                />
                <span className="text-xs text-[var(--color-text-muted)]">업로드 즉시 교육 콘텐츠에 반영됩니다.</span>
              </div>

              {uploadError && (
                <p className="mt-3 text-sm text-[var(--color-danger)]">{uploadError}</p>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
