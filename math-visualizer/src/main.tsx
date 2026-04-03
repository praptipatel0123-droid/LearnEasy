import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import WelcomeScreen from './components/WelcomeScreen.tsx'

function Root() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [appVisible, setAppVisible] = useState(false);
  const lang = (localStorage.getItem('lang') || 'EN') as 'EN' | 'HI';

  const handleDone = () => {
    setShowWelcome(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setAppVisible(true)));
  };

  return (
    <>
      {showWelcome && <WelcomeScreen onDone={handleDone} lang={lang} />}
      <div style={{
        opacity: appVisible ? 1 : 0,
        transition: 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <App />
      </div>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
