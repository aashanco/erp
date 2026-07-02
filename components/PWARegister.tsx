"use client";

import { useEffect, useState } from "react";

export default function PWARegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            registration.update().catch(() => undefined);

            if (registration.waiting) {
              setWaitingWorker(registration.waiting);
              setShowUpdate(true);
            }

            registration.addEventListener("updatefound", () => {
              const newWorker = registration.installing;
              if (!newWorker) return;
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  setWaitingWorker(newWorker);
                  setShowUpdate(true);
                }
              });
            });
          })
          .catch((error) => console.warn("PWA service worker registration failed", error));
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
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

  const applyUpdate = () => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    setShowUpdate(false);
  };

  return (
    <>
      {showUpdate && (
        <div className="pwa-update-banner" role="status" aria-live="polite">
          <span>New ERP version ready</span>
          <button type="button" onClick={applyUpdate}>Update</button>
        </div>
      )}

      {showInstall && (
        <button
          type="button"
          className="pwa-install-button"
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
      )}
    </>
  );
}
