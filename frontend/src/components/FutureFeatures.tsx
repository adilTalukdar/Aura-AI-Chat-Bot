export function FutureFeatures() {
  return (
    <aside className="future-features-panel">
      <div className="panel-header">
        <span className="panel-header-icon">🚀</span>
        <div>
          <h3 className="panel-title">Coming Soon</h3>
          <p className="panel-subtitle">Features in development</p>
        </div>
      </div>

      <div className="future-list">
        {/* Wake Word */}
        <div className="future-item">
          <div className="future-item-icon">🎙️</div>
          <div className="future-item-body">
            <div className="future-item-top">
              <span className="future-item-title">Wake Word Detection</span>
              <span className="future-badge">Soon</span>
            </div>
            <p className="future-item-desc">
              Say <em>"Hey Aria"</em> to start a conversation hands-free — no button needed.
            </p>
          </div>
        </div>

        {/* CSV Upload */}
        <div className="future-item">
          <div className="future-item-icon">📊</div>
          <div className="future-item-body">
            <div className="future-item-top">
              <span className="future-item-title">Bulk Order Import</span>
              <span className="future-badge">Soon</span>
            </div>
            <p className="future-item-desc">
              Upload a <strong>CSV or Excel</strong> file to import orders directly into the database — no manual entry.
            </p>
          </div>
        </div>

        {/* Multi-language */}
        <div className="future-item future-item--dim">
          <div className="future-item-icon">🌐</div>
          <div className="future-item-body">
            <div className="future-item-top">
              <span className="future-item-title">Hinglish Support</span>
              <span className="future-badge future-badge--planned">Planned</span>
            </div>
            <p className="future-item-desc">
              Natural Hindi-English code-switching for more conversational Indian support.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
