// One shared loader for the AI world chunk (three.js + the 3D scene).
// AI mode starts downloading it the moment the button is clicked, so it is
// usually ready long before the tunnel needs it.

type PortalModule = typeof import("../AICorePortal");

let pending: Promise<PortalModule> | null = null;
let loaded = false;

export function loadAICorePortal(): Promise<PortalModule> {
  if (!pending) {
    pending = import("../AICorePortal").then(
      (mod) => {
        loaded = true;
        return mod;
      },
      (error) => {
        pending = null; // allow a fresh attempt
        throw error;
      },
    );
  }
  return pending;
}

export function isAICorePortalLoaded(): boolean {
  return loaded;
}

export function resetAICorePortal(): void {
  if (!loaded) pending = null;
}
