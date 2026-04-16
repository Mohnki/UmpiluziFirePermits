import { useState, useEffect } from "react";
import { X, Download, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_TTL_MS = 48 * 60 * 60 * 1000; // 48h between prompts
const IS_DEV = import.meta.env.DEV;

function isIOS() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream
  );
}

function isInStandaloneMode() {
  return (
    ("standalone" in navigator &&
      (navigator as unknown as { standalone: boolean }).standalone) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function wasRecentlyDismissed() {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < DISMISS_TTL_MS;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (wasRecentlyDismissed()) return;

    const iosDevice = isIOS();
    setIos(iosDevice);

    const existing = (window as Window).__deferredInstallPrompt as
      | BeforeInstallPromptEvent
      | null
      | undefined;
    if (existing) {
      setDeferredPrompt(existing);
      setVisible(true);
    }

    const onAvailable = () => {
      const evt = (window as Window).__deferredInstallPrompt as
         | BeforeInstallPromptEvent
         | null
         | undefined;
      if (evt) {
        setDeferredPrompt(evt);
        setVisible(true);
      }
    };

    const onInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("pwa-install-available", onAvailable);
    window.addEventListener("pwa-installed", onInstalled);

    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (iosDevice) {
      iosTimer = setTimeout(() => setVisible(true), 2000);
    }

    let devTimer: ReturnType<typeof setTimeout> | undefined;
    if (IS_DEV && !iosDevice) {
      devTimer = setTimeout(() => {
        if (!wasRecentlyDismissed()) setVisible(true);
      }, 1500);
    }

    return () => {
      window.removeEventListener("pwa-install-available", onAvailable);
      window.removeEventListener("pwa-installed", onInstalled);
      if (iosTimer) clearTimeout(iosTimer);
      if (devTimer) clearTimeout(devTimer);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setVisible(false);
      } else {
        localStorage.setItem(DISMISS_KEY, Date.now().toString());
        setVisible(false);
      }
    } catch {
      setVisible(false);
    } finally {
      setDeferredPrompt(null);
      (window as Window).__deferredInstallPrompt = null;
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-lg mx-auto rounded-xl shadow-2xl border border-orange-200 dark:border-orange-900 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400" />
        <div className="flex items-center gap-3 p-4">
          <img
            src="/icon-192.png"
            alt="UFPA Fire Permit"
            className="flex-shrink-0 w-12 h-12 rounded-xl shadow-md object-contain bg-white"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 dark:text-white leading-tight">
              Install Fire Permit System
            </p>
            {ios ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Tap{" "}
                <Share className="inline w-3 h-3 mx-0.5 -mt-0.5" /> then{" "}
                <strong className="font-semibold text-gray-700 dark:text-gray-300">
                  Add to Home Screen
                </strong>{" "}
                <Plus className="inline w-3 h-3 mx-0.5 -mt-0.5" />
              </p>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Quick access to permits right from your home screen
              </p>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {ios ? (
          <div className="px-4 pb-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-gray-600 dark:text-gray-300"
              onClick={handleDismiss}
            >
              Got it
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 px-4 pb-4">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-gray-600 dark:text-gray-300"
              onClick={handleDismiss}
            >
              Not now
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white border-0"
              onClick={handleInstall}
              disabled={!deferredPrompt}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Install App
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
