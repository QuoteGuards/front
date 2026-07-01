import { useEffect, useMemo, useRef, useState } from 'react'
import Button from '../common/Button'
import { GUIDE_SECTIONS, parseGuideContent } from '../../utils/guideContent'
import './TrainingGuideModal.css'

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

const TrainingGuideModal = ({ guideContent, onClose, onConfirm, alreadyConfirmed, confirming }) => {
    const content = useMemo(() => parseGuideContent(guideContent), [guideContent])
    const [activeId, setActiveId] = useState(GUIDE_SECTIONS[0].id)
    const bodyRef = useRef(null)
    const dialogRef = useRef(null)

    useEffect(() => {
        const root = bodyRef.current
        if (!root) return undefined

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
                if (visible[0]?.target?.id) {
                    setActiveId(visible[0].target.id.replace('guide-section-', ''))
                }
            },
            { root, threshold: [0.25, 0.5, 0.75], rootMargin: '-8% 0px -55% 0px' },
        )

        GUIDE_SECTIONS.forEach(({ id }) => {
            const el = root.querySelector(`#guide-section-${id}`)
            if (el) observer.observe(el)
        })

        return () => observer.disconnect()
    }, [content])

    useEffect(() => {
        const dialog = dialogRef.current
        if (!dialog) return undefined

        const first = dialog.querySelector(FOCUSABLE_SELECTOR)
        first?.focus()
    }, [])

    useEffect(() => {
        const dialog = dialogRef.current
        if (!dialog) return undefined

        const onKeyDown = (e) => {
            if (e.key === 'Escape' && !confirming) {
                e.preventDefault()
                onClose?.()
                return
            }

            const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR))
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (e.key !== 'Tab' || focusable.length === 0) return

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault()
                last?.focus()
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault()
                first?.focus()
            }
        }

        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [confirming, onClose])

    const scrollToSection = (id) => {
        const el = bodyRef.current?.querySelector(`#guide-section-${id}`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setActiveId(id)
    }

    return (
        <div
            className="training-guide-modal__overlay"
            onClick={(e) => e.target === e.currentTarget && !confirming && onClose?.()}
        >
            <div
                ref={dialogRef}
                className="training-guide-modal__dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="training-guide-modal-title"
            >
                <div className="training-guide-modal__header">
                    <div className="training-guide-modal__header-text">
                        <h3 id="training-guide-modal-title" className="training-guide-modal__title">
                            견적 작성 가이드
                        </h3>
                        <p className="training-guide-modal__subtitle">
                            아래 목차를 따라 전체 내용을 확인한 뒤 확인 버튼을 눌러주세요
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={confirming}
                        aria-label="닫기"
                        className="training-guide-modal__close"
                    >
                        &times;
                    </button>
                </div>

                <div className="training-guide-modal__layout">
                    <nav className="training-guide-modal__toc" aria-label="가이드 목차">
                        <p className="training-guide-modal__toc-title">목차</p>
                        {GUIDE_SECTIONS.map(({ id, title }) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => scrollToSection(id)}
                                className={[
                                    'training-guide-modal__toc-btn',
                                    activeId === id ? 'training-guide-modal__toc-btn--active' : '',
                                ].filter(Boolean).join(' ')}
                            >
                                {title}
                            </button>
                        ))}
                    </nav>

                    <div ref={bodyRef} className="training-guide-modal__body">
                        <section id="guide-section-procedure" className="training-guide-modal__section">
                            <h4 className="training-guide-modal__section-title">① 견적 작성 절차</h4>
                            <p className="training-guide-modal__intro">{content.procedure.intro}</p>
                            <div className="training-guide-modal__steps">
                                {content.procedure.steps.map((step, idx) => (
                                    <div key={`procedure-step-${idx}`} className="training-guide-modal__step">
                                        <span className="training-guide-modal__step-num">{idx + 1}</span>
                                        <div>
                                            <p className="training-guide-modal__step-title">{step.title}</p>
                                            <p className="training-guide-modal__step-desc">{step.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section id="guide-section-discount" className="training-guide-modal__section">
                            <h4 className="training-guide-modal__section-title">② 할인율 적용 기준</h4>
                            <p className="training-guide-modal__intro">{content.discount.intro}</p>
                            <div className="training-guide-modal__table-wrap">
                                <table className="training-guide-modal__table">
                                    <thead>
                                        <tr>
                                            {['구분', '최대 할인율', '최소 이익률', '초과 시'].map((h) => (
                                                <th key={h}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {content.discount.rows.map((row, idx) => (
                                            <tr key={`discount-row-${idx}`}>
                                                <td>{row.label}</td>
                                                <td>{row.maxDiscount}</td>
                                                <td>{row.minProfit}</td>
                                                <td>{row.action}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {content.discount.note && (
                                <p className="training-guide-modal__note">{content.discount.note}</p>
                            )}
                        </section>

                        <section id="guide-section-approval" className="training-guide-modal__section">
                            <h4 className="training-guide-modal__section-title">③ 승인 요청 조건</h4>
                            <p className="training-guide-modal__intro">{content.approval.intro}</p>
                            <div className="training-guide-modal__cards">
                                <div className="training-guide-modal__card training-guide-modal__card--required">
                                    <p className="training-guide-modal__card-title">{content.approval.requiredTitle}</p>
                                    <ul>
                                        {content.approval.requiredItems.map((item, idx) => (
                                            <li key={`approval-required-${idx}`}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="training-guide-modal__card training-guide-modal__card--ok">
                                    <p className="training-guide-modal__card-title">{content.approval.immediateTitle}</p>
                                    <ul>
                                        {content.approval.immediateItems.map((item, idx) => (
                                            <li key={`approval-immediate-${idx}`}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section id="guide-section-example" className="training-guide-modal__section">
                            <h4 className="training-guide-modal__section-title">④ {content.example.title}</h4>
                            <div className="training-guide-modal__example">
                                <p className="training-guide-modal__example-request">{content.example.request}</p>
                                <ul className="training-guide-modal__example-lines">
                                    {content.example.lines.map((line, idx) => (
                                        <li key={`example-line-${idx}`}>{line}</li>
                                    ))}
                                </ul>
                                <p className="training-guide-modal__example-outcome">{content.example.outcome}</p>
                            </div>
                        </section>
                    </div>
                </div>

                <div className="training-guide-modal__footer">
                    <span className="training-guide-modal__footer-hint">
                        {alreadyConfirmed ? '✓ 확인 완료' : '4개 섹션을 확인한 뒤 아래 버튼을 눌러주세요.'}
                    </span>
                    <div className="training-guide-modal__footer-actions">
                        <Button variant="outline" size="md" onClick={onClose} disabled={confirming}>
                            닫기
                        </Button>
                        <Button
                            variant="primary"
                            size="md"
                            onClick={onConfirm}
                            disabled={confirming || alreadyConfirmed}
                        >
                            {alreadyConfirmed ? '확인 완료' : confirming ? '처리 중...' : '가이드를 확인하였습니다.'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TrainingGuideModal
