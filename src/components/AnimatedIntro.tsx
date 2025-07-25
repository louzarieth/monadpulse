import React, { useState, useEffect } from 'react';

const AnimatedIntro: React.FC = () => {
  const [logoVisible, setLogoVisible] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const logoTimer = setTimeout(() => setLogoVisible(true), 500);
    const titleTimer = setTimeout(() => setTitleVisible(true), 1500);
    const subtitleTimer = setTimeout(() => setSubtitleVisible(true), 2500);
    const fadeTimer = setTimeout(() => setFadeOut(true), 4500);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(titleTimer);
      clearTimeout(subtitleTimer);
      clearTimeout(fadeTimer);
    };
  }, []);

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className={`mb-10 transform transition-all duration-1000 ${logoVisible ? 'scale-100 rotate-0 opacity-100' : 'scale-50 rotate-180 opacity-0'}`}>
        <div className="w-40 h-40 flex items-center justify-center">
          <img 
            src="/monad-logo.png" 
            alt="Monad Logo" 
            className="w-full h-full object-contain"
          />
        </div>
      </div>
      
      <h1 className={`text-6xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-[#886FFF] to-[#4fc3f7] bg-clip-text text-transparent transition-all duration-1000 ${titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        Monad Pulse
      </h1>
      
      <p className={`text-xl md:text-2xl text-[#c9c9d1] transition-all duration-1000 delay-300 ${subtitleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        The rhythm of the Monad ecosystem.
      </p>
    </div>
  );
};

export default AnimatedIntro;