import './PageHeader.css'

/**
 * @param {string[]} breadcrumbs - ['견적 관리', '견적 목록']
 * @param {string} [title]
 * @param {React.ReactNode} [actions]
 */
const PageHeader = ({ breadcrumbs = [], title, actions }) => (
  <div className="page-header">
    <div className="page-header__left">
      {breadcrumbs.length > 0 && (
        <nav className="page-header__breadcrumb" aria-label="breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="page-header__breadcrumb-item">
              {i > 0 && <span className="page-header__breadcrumb-sep" aria-hidden="true">/</span>}
              {crumb}
            </span>
          ))}
        </nav>
      )}
      {title && <h1 className="page-header__title">{title}</h1>}
    </div>
    {actions && (
      <div className="page-header__actions">{actions}</div>
    )}
  </div>
)

export default PageHeader
