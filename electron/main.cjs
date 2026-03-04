const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { fork } = require("node:child_process");
const path = require("node:path");
const http = require("node:http");
const fs = require("node:fs");

const APP_PORT = 3001;
const BACKEND_PORT_CANDIDATES = [APP_PORT, 3002, 3003, 3004];
const MAX_BACKEND_RESTART_ATTEMPTS = 3;
let mainWindow = null;
let backendProcess = null;
let backendLogPath = null;
let usingExternalBackend = false;
let activeBackendPort = APP_PORT;
let backendLogStream = null;
let isBackendLaunching = false;
let restartAttempts = 0;

function hasServerDependencies(serverDir) {
  return (
    fs.existsSync(path.join(serverDir, "node_modules", "express")) &&
    fs.existsSync(path.join(serverDir, "node_modules", "mongoose"))
  );
}

function resolvePackagedServerEntry() {
  const resourcesServer = path.join(process.resourcesPath, "server", "server.js");
  const unpackedServer = path.join(process.resourcesPath, "app.asar.unpacked", "server", "server.js");

  if (fs.existsSync(resourcesServer) && hasServerDependencies(path.dirname(resourcesServer))) {
    return resourcesServer;
  }

  if (fs.existsSync(unpackedServer) && hasServerDependencies(path.dirname(unpackedServer))) {
    return unpackedServer;
  }

  if (fs.existsSync(resourcesServer)) {
    return resourcesServer;
  }

  return unpackedServer;
}

function readLogTail(maxBytes = 4000) {
  if (!backendLogPath || !fs.existsSync(backendLogPath)) {
    return "";
  }

  const stats = fs.statSync(backendLogPath);
  const start = Math.max(0, stats.size - maxBytes);
  const buffer = Buffer.alloc(stats.size - start);
  const fd = fs.openSync(backendLogPath, "r");

  try {
    fs.readSync(fd, buffer, 0, buffer.length, start);
  } finally {
    fs.closeSync(fd);
  }

  return buffer.toString("utf8").trim();
}

function showFatalError(message) {
  const logTail = readLogTail();
  dialog.showErrorBox("QuanLyDonHang", message);

  if (!mainWindow) {
    mainWindow = new BrowserWindow({
      width: 900,
      height: 600,
      resizable: true
    });
  }

  const safeMessage = String(message || "Da co loi xay ra").replace(/</g, "&lt;");
  const safeLog = logTail ? logTail.replace(/</g, "&lt;") : "";
  const html = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <title>QuanLyDonHang</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f7f7f7; color: #222; margin: 0; }
      .wrap { max-width: 720px; margin: 80px auto; background: #fff; padding: 24px; border-radius: 8px; box-shadow: 0 8px 28px rgba(0,0,0,0.08); }
      h1 { font-size: 20px; margin: 0 0 12px; }
      p { margin: 0 0 8px; line-height: 1.4; }
      code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>Khong the khoi dong ung dung</h1>
      <p>Backend khong phan hoi. Kiem tra MongoDB da chay va thu mo lai.</p>
      <p>Chi tiet loi:</p>
      <code>${safeMessage}</code>
      ${safeLog ? `<p>Nhat ky (log) gan nhat:</p><code>${safeLog}</code>` : ""}
    </div>
  </body>
</html>`;

  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

function getServerEntryPath() {
  if (app.isPackaged) {
    return resolvePackagedServerEntry();
  }

  return path.join(app.getAppPath(), "server", "server.js");
}

function getPreloadPath() {
  const candidates = [
    path.join(app.getAppPath(), "electron", "preload.cjs"),
    path.join(process.resourcesPath, "electron", "preload.cjs"),
    path.join(process.resourcesPath, "app.asar.unpacked", "electron", "preload.cjs")
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

async function generateInvoicePreviewPdf(htmlContent) {
  if (typeof htmlContent !== "string" || !htmlContent.trim()) {
    throw new Error("Noi dung hoa don khong hop le");
  }

  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  try {
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    await printWindow.webContents.executeJavaScript(
      "document.fonts ? document.fonts.ready.then(() => true) : Promise.resolve(true)",
      true
    ).catch(() => {});

    const pdfBuffer = await printWindow.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      pageSize: "A4"
    });

    const outputPath = path.join(app.getPath("temp"), `hoa-don-${Date.now()}.pdf`);
    fs.writeFileSync(outputPath, pdfBuffer);

    const openError = await shell.openPath(outputPath);
    if (openError) {
      throw new Error(openError);
    }

    return outputPath;
  } finally {
    if (!printWindow.isDestroyed()) {
      printWindow.destroy();
    }
  }
}

ipcMain.handle("invoice:preview-pdf", async (_event, htmlContent) => {
  try {
    const filePath = await generateInvoicePreviewPdf(htmlContent);
    return { ok: true, filePath };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Khong the tao file PDF xem truoc"
    };
  }
});

function pingServer(port = activeBackendPort) {
  return isHealthyBackend(port, 2000);
}

function isHealthyBackend(port, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
      let body = "";

      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        if (res.statusCode !== 200) {
          resolve(false);
          return;
        }

        try {
          const data = JSON.parse(body || "{}");
          resolve(data?.ok === true && data?.service === "QuanLyDonHangBackend");
        } catch (_error) {
          resolve(false);
        }
      });
    });

    req.on("error", () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function waitForServerReady(port, timeoutMs = 30000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = async () => {
      const healthy = await isHealthyBackend(port, 3000);
      if (healthy) {
        resolve();
        return;
      }

      if (Date.now() - start > timeoutMs) {
        if (await pingServer(port)) {
          reject(new Error("Backend không phản hồi đúng cách"));
          return;
        }

        reject(new Error("Không thể kết nối backend"));
        return;
      }

      setTimeout(check, 500);
    };

    check().catch(() => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error("Không thể kết nối backend"));
        return;
      }

      setTimeout(check, 500);
    });
  });
}

function getRestartPortCandidates() {
  const ordered = [activeBackendPort, ...BACKEND_PORT_CANDIDATES];
  return [...new Set(ordered)];
}

function attachBackendLogs(processRef) {
  if (!backendLogStream) {
    return;
  }

  if (processRef.stdout) {
    processRef.stdout.on("data", (chunk) => {
      backendLogStream.write(chunk);
    });
  }

  if (processRef.stderr) {
    processRef.stderr.on("data", (chunk) => {
      backendLogStream.write(chunk);
    });
  }
}

async function recoverBackend() {
  if (app.isQuiting || usingExternalBackend || isBackendLaunching) {
    return;
  }

  if (await pingServer(activeBackendPort)) {
    usingExternalBackend = true;
    backendProcess = null;
    return;
  }

  if (restartAttempts >= MAX_BACKEND_RESTART_ATTEMPTS) {
    showFatalError("Backend da dung dot ngot nhieu lan. Hay kiem tra MongoDB va mo lai ung dung.");
    return;
  }

  restartAttempts += 1;

  try {
    await startManagedBackend(getRestartPortCandidates(), 15000);

    if (mainWindow && !mainWindow.isDestroyed()) {
      const targetUrl = `http://127.0.0.1:${activeBackendPort}`;
      const currentUrl = mainWindow.webContents.getURL();
      if (currentUrl !== targetUrl) {
        await mainWindow.loadURL(targetUrl);
      }
    }

    restartAttempts = 0;
  } catch (error) {
    if (restartAttempts >= MAX_BACKEND_RESTART_ATTEMPTS) {
      showFatalError(error.message || "Khong the phuc hoi backend");
      return;
    }

    setTimeout(() => {
      recoverBackend().catch(() => {});
    }, 1200);
  }
}

async function startManagedBackend(portCandidates, waitTimeout = 30000) {
  const serverEntry = getServerEntryPath();
  const serverDir = path.dirname(serverEntry);
  let lastError = new Error("Khong the khoi dong backend");

  for (const port of portCandidates) {
    isBackendLaunching = true;

    const child = fork(serverEntry, {
      cwd: serverDir,
      env: {
        ...process.env,
        PORT: String(port),
        UPLOADS_DIR: path.join(app.getPath("userData"), "uploads")
      },
      stdio: ["ignore", "pipe", "pipe", "ipc"]
    });

    backendProcess = child;
    attachBackendLogs(child);

    const exitedDuringLaunch = new Promise((_, reject) => {
      child.once("exit", (code) => {
        if (isBackendLaunching) {
          reject(new Error(`Backend thoat som tren cong ${port} (code: ${code ?? "unknown"})`));
        }
      });
    });

    child.on("exit", (code) => {
      if (child !== backendProcess) {
        return;
      }

      if (isBackendLaunching) {
        return;
      }

      if (app.isQuiting || code === 0 || usingExternalBackend) {
        return;
      }

      recoverBackend().catch(() => {});
    });

    try {
      await Promise.race([
        waitForServerReady(port, waitTimeout),
        exitedDuringLaunch
      ]);
      activeBackendPort = port;
      usingExternalBackend = false;
      isBackendLaunching = false;
      return;
    } catch (error) {
      lastError = error;
      if (child && !child.killed) {
        child.kill();
      }
      backendProcess = null;
      isBackendLaunching = false;
    }
  }

  throw lastError;
}

async function startBackendAndWindow() {
  const uploadsDir = path.join(app.getPath("userData"), "uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });

  backendLogPath = path.join(app.getPath("userData"), "backend.log");
  backendLogStream = fs.createWriteStream(backendLogPath, { flags: "w" });

  if (await pingServer(APP_PORT)) {
    usingExternalBackend = true;
    activeBackendPort = APP_PORT;
  } else {
    await startManagedBackend(BACKEND_PORT_CANDIDATES, 18000);
  }

  try {
    await waitForServerReady(activeBackendPort);
  } catch (error) {
    showFatalError(error.message || "Khong the ket noi backend");
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: getPreloadPath()
    }
  });

  await mainWindow.loadURL(`http://127.0.0.1:${activeBackendPort}`);
}

function stopBackend() {
  isBackendLaunching = false;
  if (!usingExternalBackend && backendProcess && !backendProcess.killed) {
    backendProcess.kill();
  }

  backendProcess = null;
  usingExternalBackend = false;
  restartAttempts = 0;

  if (backendLogStream) {
    backendLogStream.end();
    backendLogStream = null;
  }
}

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  app.isQuiting = true;
  stopBackend();
});

if (singleInstanceLock) {
  app.whenReady()
    .then(startBackendAndWindow)
    .catch((error) => {
      console.error("Không thể khởi tạo ứng dụng desktop:", error);
      showFatalError(error.message || "Khong the khoi tao ung dung desktop");
    });
}
