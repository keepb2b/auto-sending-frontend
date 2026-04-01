/**
 * Full-area loading UI while fetching from the API / database.
 */
export default function DataLoadingLayer({
  title = 'データを読み込んでいます',
  subtitle = 'API 経由でデータベースから取得しています',
}) {
  return (
    <div
      className="data-loading-layer"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={title}
    >
      <div className="data-loading-glow" aria-hidden />
      <div className="data-loading-spinner" aria-hidden>
        <div className="data-loading-spinner__ring" />
        <div className="data-loading-spinner__ring data-loading-spinner__ring--delayed" />
      </div>
      <p className="data-loading-title">{title}</p>
      <p className="data-loading-subtitle">{subtitle}</p>
      <div className="data-loading-bars" aria-hidden>
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}
