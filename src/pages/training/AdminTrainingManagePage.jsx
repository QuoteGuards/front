import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '../../components/common/Button'
import {
  getAdminQuoteWritingTrainingApi,
  uploadTrainingVideoApi,
  updateGuideContentApi,
  updateTrainingVideoActiveApi,
  updateTrainingVideoTitleApi,
} from '../../api/adminTrainingApi'
import AdminGuideEditor from '../../components/training/AdminGuideEditor'
import AdminTrainingStatusPanel from '../../components/training/AdminTrainingStatusPanel'
import { useAuth } from '../../hooks/useAuth'
import { TRAINING_COURSE_OPTIONS, TRAINING_TYPE_LABEL } from '../../constants/trainingCourses'
import './AdminTrainingManagePage.css'

const MAX_VIDEO_BYTES = 300 * 1024 * 1024

const COURSE_FETCHERS = {
  QUOTE_WRITE: getAdminQuoteWritingTrainingApi,
}

export default function AdminTrainingManagePage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const [searchParams, setSearchParams] = useSearchParams()
  const [statusRefreshKey, setStatusRefreshKey] = useState(0)
  const activeTab = useMemo(() => {
    if (!isSuperAdmin) return 'status'
    const tab = searchParams.get('tab')
    if (tab === 'videos' || tab === 'guide') return tab
    return 'status'
  }, [searchParams, isSuperAdmin])
  const [selectedCourseType, setSelectedCourseType] = useState('QUOTE_WRITE')
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [guideSaving, setGuideSaving] = useState(false)
  const [guideError, setGuideError] = useState('')
  const [guideSuccess, setGuideSuccess] = useState('')
  const [uploadTitle, setUploadTitle] = useState('')
  const [videoTitleSearch, setVideoTitleSearch] = useState('')
  const [togglingVideoId, setTogglingVideoId] = useState(null)
  const fileInputRef = useRef(null)
  const requestIdRef = useRef(0)

  const setActiveTab = useCallback((tab) => {
    if (tab === 'videos' || tab === 'guide') {
      setVideoTitleSearch('')
    }
    if (tab === 'status') {
      setSearchParams({}, { replace: true })
      return
    }
    setSearchParams({ tab }, { replace: true })
  }, [setSearchParams])

  const fetchContent = useCallback((requestId, courseType) => {
    const fetcher = COURSE_FETCHERS[courseType]
    if (!fetcher) {
      if (requestIdRef.current === requestId) {
        setError('지원하지 않는 교육 유형입니다.')
        setLoading(false)
      }
      return Promise.resolve()
    }

    setLoading(true)
    setError('')

    return fetcher()
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
    setSuccessMessage('')
    return fetchContent(requestId, selectedCourseType)
  }, [fetchContent, selectedCourseType])

  useEffect(() => {
    if (!isSuperAdmin) return
    if (activeTab !== 'videos' && activeTab !== 'guide') return
    const requestId = ++requestIdRef.current
    fetchContent(requestId, selectedCourseType)
  }, [fetchContent, selectedCourseType, activeTab, isSuperAdmin])

  const handleHeaderRefresh = () => {
    if (activeTab === 'status') {
      setStatusRefreshKey((key) => key + 1)
      return
    }
    loadContent()
  }

  const showContentLoading = isSuperAdmin && (activeTab === 'videos' || activeTab === 'guide') && loading

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
      const video = await uploadTrainingVideoApi(file, uploadTitle)
      setContent((prev) => (prev ? { ...prev, videos: [...(prev.videos ?? []), video] } : prev))
      setUploadTitle('')
      setSuccessMessage('교육 영상이 추가되었습니다. 활성화하면 사원 교육에 반영됩니다.')
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

  const handleToggleActive = async (video) => {
    setTogglingVideoId(video.id)
    setUploadError('')
    try {
      const updated = await updateTrainingVideoActiveApi(video.id, !video.active)
      setContent((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          videos: (prev.videos ?? []).map((item) => (item.id === video.id ? updated : item)),
        }
      })
      setSuccessMessage(updated.active
        ? `"${updated.title}" 영상이 활성화되었습니다.`
        : `"${updated.title}" 영상이 비활성화되었습니다.`)
    } catch (err) {
      setUploadError(err.response?.data?.message ?? '영상 상태 변경에 실패했습니다.')
    } finally {
      setTogglingVideoId(null)
    }
  }

  const handleRenameVideo = async (video) => {
    const nextTitle = window.prompt('영상 제목', video.title)
    if (nextTitle == null || !nextTitle.trim()) return
    try {
      const updated = await updateTrainingVideoTitleApi(video.id, nextTitle.trim())
      setContent((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          videos: (prev.videos ?? []).map((item) => (item.id === video.id ? updated : item)),
        }
      })
      setSuccessMessage('영상 제목이 변경되었습니다.')
    } catch (err) {
      setUploadError(err.response?.data?.message ?? '영상 제목 변경에 실패했습니다.')
    }
  }

  const handleSaveGuide = async (guideContentJson) => {
    setGuideSaving(true)
    setGuideError('')
    setGuideSuccess('')
    try {
      const updated = await updateGuideContentApi(guideContentJson)
      setContent((prev) => (prev ? { ...prev, guideContent: updated.guideContent ?? guideContentJson, videos: updated.videos ?? prev.videos } : prev))
      setGuideSuccess('가이드 내용이 저장되었습니다.')
    } catch (err) {
      setGuideError(err.response?.data?.message ?? err.message ?? '가이드 저장에 실패했습니다.')
    } finally {
      setGuideSaving(false)
    }
  }

  const videos = useMemo(() => content?.videos ?? [], [content?.videos])
  const normalizedVideoSearch = videoTitleSearch.trim().toLowerCase()
  const filteredVideos = useMemo(() => {
    if (!normalizedVideoSearch) return videos
    return videos.filter((video) => video.title?.toLowerCase().includes(normalizedVideoSearch))
  }, [videos, normalizedVideoSearch])
  const activeCount = videos.filter((video) => video.active).length
  const courseTypeLabel = TRAINING_TYPE_LABEL[content?.trainingType] ?? TRAINING_TYPE_LABEL.QUOTE_WRITE

  return (
    <div className="admin-training">
      <header className="admin-training__header">
        <nav className="admin-training__breadcrumb" aria-label="breadcrumb">
          <span>관리</span>
          <span aria-hidden="true">/</span>
          <span>교육 관리</span>
        </nav>

        <div className="admin-training__title-row">
          <h1 className="admin-training__title">교육 관리</h1>

          <div className="admin-training-tabs" role="tablist" aria-label="교육 관리 메뉴">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'status'}
              className={['admin-training-tabs__btn', activeTab === 'status' ? 'admin-training-tabs__btn--active' : ''].join(' ')}
              onClick={() => setActiveTab('status')}
            >
              교육 이수 현황
            </button>
            {isSuperAdmin && (
              <>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'videos'}
                  className={['admin-training-tabs__btn', activeTab === 'videos' ? 'admin-training-tabs__btn--active' : ''].join(' ')}
                  onClick={() => setActiveTab('videos')}
                >
                  영상 관리
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'guide'}
                  className={['admin-training-tabs__btn', activeTab === 'guide' ? 'admin-training-tabs__btn--active' : ''].join(' ')}
                  onClick={() => setActiveTab('guide')}
                >
                  가이드 관리
                </button>
              </>
            )}
          </div>

          <div className="admin-training__actions">
            <Button variant="outline" size="sm" onClick={handleHeaderRefresh} disabled={showContentLoading}>
              새로고침
            </Button>
          </div>
        </div>
      </header>

      <div className="admin-training-page">
        {showContentLoading && <p className="admin-training__status-text">불러오는 중...</p>}
        {activeTab !== 'status' && error && <div className="admin-training-alert admin-training-alert--error">{error}</div>}
        {activeTab !== 'status' && successMessage && (
          <div className="admin-training-alert admin-training-alert--success">{successMessage}</div>
        )}

        {activeTab === 'status' && (
          <AdminTrainingStatusPanel refreshKey={statusRefreshKey} />
        )}

        {!showContentLoading && !error && content && activeTab === 'videos' && isSuperAdmin && (
          <div className="admin-training-videos">
            <section className="admin-training-filter">
              <p className="admin-training-filter__label">교육 유형</p>
              <div className="admin-training-filter__chips">
                {TRAINING_COURSE_OPTIONS.map((course) => (
                  <button
                    key={course.type}
                    type="button"
                    className={[
                      'admin-training-filter__chip',
                      selectedCourseType === course.type ? 'admin-training-filter__chip--active' : '',
                    ].join(' ')}
                    onClick={() => {
                      setVideoTitleSearch('')
                      setSelectedCourseType(course.type)
                    }}
                  >
                    {course.label}
                  </button>
                ))}
              </div>
            </section>

            <div className="admin-training-top-row">
              <section className="admin-training-card admin-training-card--info">
                <h2 className="admin-training-card__title">교육 정보</h2>
                <dl className="admin-training-info">
                  <div className="admin-training-info__row">
                    <dt>교육명</dt>
                    <dd>{content.title}</dd>
                  </div>
                  <div className="admin-training-info__row">
                    <dt>교육 유형</dt>
                    <dd>{courseTypeLabel}</dd>
                  </div>
                  <div className="admin-training-info__row">
                    <dt>설명</dt>
                    <dd>{content.description || '-'}</dd>
                  </div>
                  <div className="admin-training-info__row">
                    <dt>필수 여부</dt>
                    <dd>{content.required ? '필수' : '선택'}</dd>
                  </div>
                  <div className="admin-training-info__row">
                    <dt>영상</dt>
                    <dd>전체 {videos.length}개 · 활성 {activeCount}개</dd>
                  </div>
                </dl>
              </section>

              <section className="admin-training-card admin-training-card--upload">
                <h2 className="admin-training-card__title">영상 추가</h2>
                <p className="admin-training-card__desc">
                  MP4만 업로드 (최대 300MB). 업로드 후 <strong>활성화</strong>해야 사원 교육에 반영됩니다.
                </p>
                <label htmlFor="upload-video-title" className="admin-training-upload__label">
                  영상 제목 (선택)
                </label>
                <input
                  id="upload-video-title"
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="예: 견적 작성 기초"
                  className="admin-training-upload__input"
                />
                <Button
                  variant="primary"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? '업로드 중…' : '영상 추가'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,.mp4"
                  hidden
                  onChange={onPickVideo}
                />
                {uploadError && <p className="admin-training-upload__error">{uploadError}</p>}
              </section>
            </div>

            <section className="admin-training-videos-section">
              <div className="admin-training-videos-section__head">
                <h2 className="admin-training-videos-section__title">등록된 영상</h2>
                <span className="admin-training-videos-section__count">
                  {normalizedVideoSearch
                    ? `${filteredVideos.length}/${videos.length}개`
                    : `${videos.length}개`}
                </span>
                <input
                  type="search"
                  value={videoTitleSearch}
                  onChange={(e) => setVideoTitleSearch(e.target.value)}
                  placeholder="영상 제목 검색"
                  aria-label="영상 제목 검색"
                  className="admin-training-videos-section__search-input"
                />
              </div>

              {videos.length === 0 ? (
                <p className="admin-training__status-text">등록된 영상이 없습니다.</p>
              ) : filteredVideos.length === 0 ? (
                <p className="admin-training__status-text">검색 결과가 없습니다.</p>
              ) : (
                <div className="admin-training-video-grid">
                  {filteredVideos.map((video) => (
                    <article key={video.id} className="admin-training-video-card">
                      <div className="admin-training-video-card__header">
                        <span className={`admin-training-video-card__badge ${video.active ? 'admin-training-video-card__badge--active' : ''}`}>
                          {video.active ? '활성' : '비활성'}
                        </span>
                        <span className="admin-training-video-card__order">순서 {video.sortOrder}</span>
                      </div>

                      <div className="admin-training-video-card__player">
                        {video.videoUrl ? (
                          <video src={video.videoUrl} controls preload="metadata" />
                        ) : (
                          <div className="admin-training-video-card__empty">영상 없음</div>
                        )}
                      </div>

                      <div className="admin-training-video-card__body">
                        <div className="admin-training-video-card__meta">
                          <h3 className="admin-training-video-card__title" title={video.title}>
                            {video.title}
                          </h3>
                          <p className="admin-training-video-card__url" title={video.videoUrl}>
                            {video.videoUrl}
                          </p>
                        </div>

                        <div className="admin-training-video-card__actions">
                          <Button variant="outline" size="sm" onClick={() => handleRenameVideo(video)}>
                            제목 수정
                          </Button>
                          <Button
                            variant={video.active ? 'secondary' : 'primary'}
                            size="sm"
                            disabled={togglingVideoId === video.id}
                            onClick={() => handleToggleActive(video)}
                          >
                            {togglingVideoId === video.id
                              ? '처리 중…'
                              : video.active
                                ? '비활성화'
                                : '활성화'}
                          </Button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {!showContentLoading && !error && content && activeTab === 'guide' && isSuperAdmin && (
          <div className="admin-training-guide">
            <section className="admin-training-card">
              <h2 className="admin-training-card__title">가이드 대상</h2>
              <p className="admin-training-card__desc">
                {content.title} ({courseTypeLabel}) · 사원 견적 작성 가이드 모달에 표시됩니다.
              </p>
            </section>

            {guideError && <div className="admin-training-alert admin-training-alert--error">{guideError}</div>}
            {guideSuccess && <div className="admin-training-alert admin-training-alert--success">{guideSuccess}</div>}

            <AdminGuideEditor
              key={content.guideContent ?? 'empty'}
              guideContent={content.guideContent}
              onSave={handleSaveGuide}
              saving={guideSaving}
            />
          </div>
        )}
      </div>
    </div>
  )
}
