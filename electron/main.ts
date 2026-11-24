import { app, BrowserWindow, dialog, ipcMain, protocol, session } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAIProviderStatus, requestAIChat } from "./aiProvider";
import {
  VehicleAssetService,
  VehicleAssetServiceError,
  type VehicleAssetProgress,
} from "./vehicleAssetService";

const isDevelopment = !app.isPackaged;
let vehicleAssetService: VehicleAssetService;

function isTrustedRendererURL(url: string): boolean {
  return isDevelopment
    ? url.startsWith("http://127.0.0.1:5173/")
    : url.startsWith("app://bundle/");
}

if (!isDevelopment) {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "app",
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
  ]);
}

function createWindow(): void {
  const rendererPath = path.join(__dirname, "../dist/index.html");
  const window = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: "#090c10",
    title: "Gesture Drive 3D",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedRendererURL(url)) event.preventDefault();
  });

  if (isDevelopment) {
    void window.loadURL("http://127.0.0.1:5173");
  } else {
    void window.loadURL("app://bundle/index.html");
  }
}

function registerAppProtocol(): void {
  const rendererRoot = path.resolve(app.getAppPath(), "dist");
  const contentTypes: Record<string, string> = {
    ".css": "text/css",
    ".html": "text/html",
    ".js": "text/javascript",
    ".json": "application/json",
    ".task": "application/octet-stream",
    ".wasm": "application/wasm",
  };
  protocol.handle("app", async (request) => {
    const url = new URL(request.url);
    if (url.hostname !== "bundle") return new Response("Not found", { status: 404 });
    const requestedPath = path.resolve(rendererRoot, `.${decodeURIComponent(url.pathname)}`);
    const relativePath = path.relative(rendererRoot, requestedPath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      return new Response("Not found", { status: 404 });
    }

    try {
      const contents = await readFile(requestedPath);
      return new Response(new Uint8Array(contents), {
        headers: {
          "Content-Type": contentTypes[path.extname(requestedPath).toLowerCase()] ?? "application/octet-stream",
          "Content-Security-Policy":
            "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; media-src 'self' blob:",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return new Response("Not found", { status: 404 });
      }
      console.error(`Failed to load local app resource: ${requestedPath}`, error);
      return new Response("Unable to load application resource", { status: 500 });
    }
  });
}

function registerVehicleAssetIPC(): void {
  ipcMain.handle("vehicle-asset:load", async (event, vehicleId: unknown, requestId: unknown) => {
    if (!isTrustedRendererURL(event.sender.getURL())) {
      throw new Error("Vehicle assets are available only to the application window.");
    }
    try {
      const result = await vehicleAssetService.loadVehicleAsset(
        vehicleId,
        requestId,
        event.sender.id,
        (progress: VehicleAssetProgress) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send("vehicle-asset:progress", { ...progress, requestId });
          }
        },
      );
      return { ok: true, result };
    } catch (error) {
      const code = error instanceof VehicleAssetServiceError ? error.code : "DOWNLOAD_FAILED";
      const message = error instanceof Error ? error.message : "The vehicle asset could not be retrieved.";
      return { ok: false, code, message };
    }
  });
  ipcMain.handle("vehicle-asset:cancel", (event, requestId: unknown) => {
    if (!isTrustedRendererURL(event.sender.getURL())) {
      throw new Error("Vehicle assets are available only to the application window.");
    }
    return vehicleAssetService.cancelRequest(requestId, event.sender.id);
  });
  ipcMain.handle("vehicle-asset:cache-status", async (event, vehicleId: unknown) => {
    if (!isTrustedRendererURL(event.sender.getURL())) {
      throw new Error("Vehicle assets are available only to the application window.");
    }
    return vehicleAssetService.getCacheStatus(vehicleId);
  });
  ipcMain.handle("vehicle-asset:cache-remove", async (event, vehicleId: unknown) => {
    if (!isTrustedRendererURL(event.sender.getURL())) {
      throw new Error("Vehicle assets are available only to the application window.");
    }
    return vehicleAssetService.removeCache(vehicleId);
  });
}

export function registerProjectIPC(): void {
  ipcMain.handle("project:save", async (event, contents: string) => {
    if (!isTrustedRendererURL(event.sender.getURL())) {
      throw new Error("Project save is available only to the application window.");
    }
    if (typeof contents !== "string") {
      throw new TypeError("Project contents must be text.");
    }
    const result = await dialog.showSaveDialog({
      title: "Save vehicle project",
      defaultPath: "vehicle-design.gd3d.json",
      filters: [{ name: "Gesture Drive Project", extensions: ["json"] }],
    });
    if (result.canceled || !result.filePath) return false;
    await writeFile(result.filePath, contents, "utf8");
    return true;
  });

  ipcMain.handle("project:load", async (event) => {
    if (!isTrustedRendererURL(event.sender.getURL())) {
      throw new Error("Project load is available only to the application window.");
    }
    const result = await dialog.showOpenDialog({
      title: "Open vehicle project",
      properties: ["openFile"],
      filters: [{ name: "Gesture Drive Project", extensions: ["json"] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return readFile(result.filePaths[0], "utf8");
  });
}

ipcMain.handle("ai:status", (event) => {
  if (!isTrustedRendererURL(event.sender.getURL())) {
    throw new Error("AI status is available only to the application window.");
  }
  return getAIProviderStatus();
});

ipcMain.handle("ai:request", async (event, payload: unknown) => {
  if (!isTrustedRendererURL(event.sender.getURL())) {
    throw new Error("AI requests are available only to the application window.");
  }
  return requestAIChat(payload);
});

app.whenReady().then(() => {
  if (!isDevelopment) registerAppProtocol();
  const appRoot = app.getAppPath();
  vehicleAssetService = new VehicleAssetService({
    manifestPath: isDevelopment
      ? path.join(appRoot, "src", "vehicles", "manifest.json")
      : path.join(appRoot, "dist", "vehicles", "manifest.json"),
    assetRoot: isDevelopment ? path.join(appRoot, "public") : path.join(appRoot, "dist"),
    cacheRoot: path.join(app.getPath("userData"), "vehicle-assets"),
  });
  registerVehicleAssetIPC();
  registerProjectIPC();
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const requestingUrl = details.requestingUrl || webContents.getURL();
    callback(permission === "media" && isTrustedRendererURL(requestingUrl));
  });
  app.on("web-contents-created", (_event, webContents) => {
    webContents.once("destroyed", () => vehicleAssetService.cancelOwner(webContents.id));
  });
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
