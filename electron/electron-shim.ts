// electron-shim.cjs - CommonJS wrapper for Electron 45+ ESM module
// This shim uses dynamic import to load the ESM electron module
// and exports the commonly used APIs for CommonJS consumers.

let electronModule: any = null;
let initialized = false;

async function init(): Promise<void> {
  if (initialized) return;
  electronModule = await import("electron");
  initialized = true;
}

// Synchronous access - throws if not initialized
function getModule(): any {
  if (!initialized) {
    throw new Error("Electron module not initialized. Call init() first.");
  }
  return electronModule;
}

// Export commonly used modules
export const app = new Proxy({}, {
  get(_, prop) {
    const mod = getModule();
    return mod.app[prop];
  }
});

export const BrowserWindow = new Proxy(() => {}, {
  get(_, prop) {
    const mod = getModule();
    return mod.BrowserWindow[prop];
  },
  apply(_, __, args) {
    const mod = getModule();
    return new mod.BrowserWindow(...args);
  }
});

export const dialog = new Proxy({}, {
  get(_, prop) {
    const mod = getModule();
    return mod.dialog[prop];
  }
});

export const ipcMain = new Proxy({}, {
  get(_, prop) {
    const mod = getModule();
    return mod.ipcMain[prop];
  }
});

export const protocol = new Proxy({}, {
  get(_, prop) {
    const mod = getModule();
    return mod.protocol[prop];
  }
});

export const session = new Proxy({}, {
  get(_, prop) {
    const mod = getModule();
    return mod.session[prop];
  }
});

// Re-export the init function
export { init };