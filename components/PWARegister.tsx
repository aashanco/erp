"use client";

import { useEffect, useState } from "react";

export default function PWARegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            registration.update().catch(() => undefined);
          })
          .catch((error) => console.warn("PWA service worker registration failed", error));
      });
    }

    const beforeInstallPromptHandler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShowInstall(true);
    };

    const appInstalledHandler = () => {
      setDeferredPrompt(null);
      setShowInstall(false);
    };

    window.addEventListener("beforeinstallprompt", beforeInstallPromptHandler);
    window.addEventListener("appinstalled", appInstalledHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstallPromptHandler);
      window.removeEventListener("appinstalled", appInstalledHandler);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => undefined);
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  if (!showInstall) return null;

  return (
    <button
      type="button"
      onClick={installApp}
      style={{
        position: "fixed",
        right: 18,
        bottom: 18,
        zIndex: 99999,
        border: 0,
        borderRadius: 999,
        padding: "13px 18px",
        background: "#2563eb",
        color: "white",
        fontWeight: 900,
        boxShadow: "0 16px 40px rgba(37,99,235,.35)",
        cursor: "pointer",
      }}
      aria-label="Install Aashan ERP app"
    >
      Install App
    </button>
  );
}
