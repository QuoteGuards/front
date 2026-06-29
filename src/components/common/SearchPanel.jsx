import './SearchPanel.css'

/**
 * 검색 패널 래퍼
 */
export const SearchPanel = ({ children }) => (
  <div className="search-panel">{children}</div>
)

/**
 * 검색 패널 내 행
 * @param {string} label - 좌측 라벨
 * @param {React.ReactNode} children - 우측 입력 영역
 */
export const SearchRow = ({ label, children }) => (
  <div className="search-row">
    <span className="search-row__label">{label}</span>
    <div className="search-row__controls">{children}</div>
  </div>
)

export default SearchPanel
