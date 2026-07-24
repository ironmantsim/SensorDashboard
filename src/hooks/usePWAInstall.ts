import { useState, useEffect, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  // Keep a ref so install() always reads the latest prompt even if state batching delays
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.warn);
    }

    // Check if already installed (standalone mode)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(standalone);

    // Detect iOS
    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    const handler = (e: Event) => {
      e.preventDefault();
      const prompt = e as BeforeInstallPromptEvent;
      promptRef.current = prompt;
      setDeferredPrompt(prompt);
      setIsInstallable(true);
      console.log('[PWA] beforeinstallprompt captured — install available');
    };

    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      console.log('[PWA] appinstalled fired');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      promptRef.current = null;
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const install = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const prompt = promptRef.current ?? deferredPrompt;
    if (!prompt) {
      console.warn('[PWA] No deferred prompt available');
      return 'unavailable';
    }
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    console.log('[PWA] User choice:', outcome);
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      promptRef.current = null;
    }
    return outcome;
  };

  return { isInstallable, isInstalled, isIOS, install };
}
