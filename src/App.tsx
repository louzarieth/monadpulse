import React, { useState, useEffect } from 'react';
import AnimatedIntro from './components/AnimatedIntro';
import MainCalendar from './components/MainCalendar';
import { registerServiceWorker } from './utils/serviceWorkerRegistration';

function App() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    // Set a timeout to hide the intro
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 5000);

    // Register service worker after the page is fully loaded
    const handleLoad = () => {
      console.log('Window loaded, registering service worker...');
      registerServiceWorker();
    };

    if (document.readyState === 'complete') {
      // If the page is already loaded, register immediately
      handleLoad();
    } else {
      // Otherwise, wait for the load event
      window.addEventListener('load', handleLoad);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white font-inter">
      {showIntro ? (
        <AnimatedIntro />
      ) : (
        <MainCalendar />
      )}
    </div>
  );
}

export default App;