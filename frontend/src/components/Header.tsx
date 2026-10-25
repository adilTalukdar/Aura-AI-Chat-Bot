interface HeaderProps {
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

export function Header({ theme, onThemeToggle }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="header-logo">
          <span className="logo-leaf">🌿</span>
        </div>
        <div className="header-brand-text">
          <span className="brand-name">Aura Skincare</span>
          <span className="brand-tagline">AI Voice Support</span>
        </div>
      </div>

      <nav className="header-nav">
        <div className="header-aria-badge">
          <span className="aria-avatar">A</span>
          <div>
            <span className="aria-name">Aria</span>
            <span className="aria-role">Voice AI Agent</span>
          </div>
        </div>

        <button
          className="theme-toggle"
          onClick={onThemeToggle}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </nav>
    </header>
  );
}
