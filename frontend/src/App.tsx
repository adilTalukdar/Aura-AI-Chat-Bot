import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { CallInterface } from './components/CallInterface';
import { TestOrdersHelper } from './components/TestOrdersHelper';
import { FutureFeatures } from './components/FutureFeatures';

type Theme = 'dark' | 'light';

function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('aura-theme') as Theme | null;
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aura-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <div className="app-root">
      <Header theme={theme} onThemeToggle={toggleTheme} />

      <main className="app-main">
        {/* Left sidebar: Test Orders */}
        <div className="sidebar-left">
          <TestOrdersHelper />
        </div>

        {/* Center: Call interface */}
        <div className="center-panel">
          <CallInterface />
        </div>

        {/* Right sidebar: Future features */}
        <div className="sidebar-right">
          <FutureFeatures />
        </div>
      </main>

      <footer className="app-footer">
        <p>
          Built for <strong>Aura Skincare</strong> · Powered by{' '}
          <span className="footer-tech">Groq LLaMA 3.3 · Spring Boot · React</span>
        </p>
      </footer>
    </div>
  );
}

export default App;
