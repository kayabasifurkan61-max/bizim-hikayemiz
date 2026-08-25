import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Login } from './components/Login';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { LiveDate } from './components/LiveDate';
import { RelationshipCounter } from './components/RelationshipCounter';
import { BirthdaySection } from './components/BirthdaySection';
import { Timeline } from './components/Timeline';
import { PoetrySection } from './components/PoetrySection';
import { SharedTraits } from './components/SharedTraits';
import { Gallery } from './components/Gallery';
import { SpecialMessage } from './components/SpecialMessage';
import { LoveNotes } from './components/LoveNotes';
import { NotificationSettings } from './components/NotificationSettings';
import { Footer } from './components/Footer';
import { MusicPlayer } from './components/MusicPlayer';
import { MusicProvider } from './context/MusicContext';
import { SiteDataProvider } from './context/SiteDataContext';
import { AdminPanel } from './components/AdminPanel';
import { CustomCode } from './components/CustomCode';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        setIsAuthenticated(data.authenticated === true);
      } catch (err) {
        console.warn('Session verification error:', err);
        setIsAuthenticated(false);
      }
    };

    checkSession();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setIsAuthenticated(false);
  };

  // Loading state while checking session
  if (isAuthenticated === null) {
    return (
      <div className="fixed inset-0 bg-[#120508] flex flex-col items-center justify-center gap-4 text-[#FFB3C1]">
        <div className="w-6 h-6 border-2 border-white/20 border-t-[#FF4D6D] rounded-full animate-spin" />
        <span className="text-xs uppercase tracking-[0.25em] text-[#C97A8E]">Yükleniyor</span>
      </div>
    );
  }

  const MainSite = () => (
    <motion.div
      key="main-app"
      initial={{ opacity: 0, filter: 'blur(8px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="w-full relative"
    >
      <Navbar onLogout={handleLogout} />
      <CustomCode />
      <main className="w-full relative">
        <Hero />
        <LiveDate />
        <RelationshipCounter />
        <Timeline />
        <BirthdaySection />
        <PoetrySection />
        <SharedTraits />
        <Gallery />
        <SpecialMessage />
        <LoveNotes />
        <NotificationSettings />
        <Footer />
      </main>
      <MusicPlayer />
    </motion.div>
  );

  return (
    <SiteDataProvider>
      <MusicProvider>
        <div className="min-h-screen bg-[#120508] text-[#FFF0F3] selection:bg-[#FF4D6D]/25 selection:text-[#FFF0F3] relative overflow-x-hidden">
          <BrowserRouter>
            <AnimatePresence mode="wait">
              {!isAuthenticated ? (
                <Routes>
                  <Route path="*" element={<Login onLoginSuccess={() => setIsAuthenticated(true)} />} />
                </Routes>
              ) : (
                <Routes>
                  <Route path="/" element={<MainSite />} />
                  <Route path="/admin" element={<AdminPanel />} />
                  <Route path="/yönetici" element={<AdminPanel />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              )}
            </AnimatePresence>
          </BrowserRouter>
        </div>
      </MusicProvider>
    </SiteDataProvider>
  );
}

export default App;

