/*! coi-serviceworker v0.1.7 - Guido Zuidhof and contributors, licensed under MIT */
let coepCredentialless = false;
if (typeof window === 'undefined') {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
  self.addEventListener("message", (ev) => {
    if (ev.data && ev.data.type === "deregister") {
      self.registration
        .unregister()
        .then(() => {
          return self.clients.matchAll();
        })
        .then((clients) => {
          clients.forEach((client) => client.navigate(client.url));
        });
    }
  });
  self.addEventListener("fetch", function (event) {
    const r = event.request;
    if (r.cache === "only-if-cached" && r.mode !== "same-origin") {
      return;
    }
    const request =
      coepCredentialless && r.mode === "no-cors"
        ? new Request(r, {
            credentials: "omit",
          })
        : r;
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 0) {
            return response;
          }
          const newHeaders = new Headers(response.headers);
          newHeaders.set(
            "Cross-Origin-Embedder-Policy",
            coepCredentialless ? "credentialless" : "require-corp"
          );
          if (!coepCredentialless) {
            newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");
          }
          newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch((e) => console.error(e))
    );
  });
} else {
  (() => {
    const reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
    window.sessionStorage.removeItem("coiReloadedBySelf");
    const coepDegrading = reloadedBySelf === "coepdegrade";
    // You can customize the brower check by overriding `window.coi.shouldRegister()`.
    const n = navigator;
    const ua = n.userAgent;

    if (
      n.serviceWorker &&
      n.serviceWorker.controller &&
      n.serviceWorker.controller.scriptURL.includes("coi-serviceworker") &&
      performance.getEntriesByType &&
      performance.getEntriesByType("navigation")[0] &&
      performance.getEntriesByType("navigation")[0].type === "reload" &&
      !reloadedBySelf
    ) {
      // Reload is sufficient.
      return;
    }

    // If `Cross-Origin-Isolation` is already enabled, we don't need to do anything.
    if (window.crossOriginIsolated !== false) {
      return;
    }

    if (!window.isSecureContext) {
      !coepDegrading &&
        console.log(
          "COOP/COEP Service Worker: Not a secure context, cannot register"
        );
      return;
    }

    // In some environments (e.g. Firefox), it's OK if we don't have a service worker.
    if (!n.serviceWorker) {
      !coepDegrading &&
        console.error(
          "COOP/COEP Service Worker: navigator.serviceWorker is not available"
        );
      return;
    }

    n.serviceWorker
      .register(window.document.currentScript && window.document.currentScript.src || "/coi-serviceworker.js")
      .then(
        (registration) => {
          !coepDegrading &&
            console.log(
              "COOP/COEP Service Worker: registered",
              registration.scope
            );

          registration.addEventListener("updatefound", () => {
            !coepDegrading &&
              console.log(
                "COOP/COEP Service Worker: updated",
                registration.scope
              );
            if (
              registration.installing &&
              !n.serviceWorker.controller
            ) {
              window.sessionStorage.setItem("coiReloadedBySelf", coepDegrading ? "coepdegrade" : "");
              !coepDegrading && window.location.reload();
            }
          });

          // If the registration is active, but it's not controlling the page, reload.
          if (registration.active && !n.serviceWorker.controller) {
            window.sessionStorage.setItem("coiReloadedBySelf", coepDegrading ? "coepdegrade" : "");
            !coepDegrading && window.location.reload();
          }
        },
        (err) => {
          !coepDegrading &&
            console.error(
              "COOP/COEP Service Worker: registration failed",
              err
            );
        }
      );
  })();
}
