// Ứng dụng desktop: chạy server nội bộ + mở cửa sổ giao diện
import { app, BrowserWindow, shell, dialog, Menu } from "electron";
import path from "path";
import fs from "fs";
import net from "net";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!app.requestSingleInstanceLock()) app.quit();

const freePort = () => new Promise((res, rej) => {
  const s = net.createServer(); s.unref();
  s.on("error", rej);
  s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => res(port)); });
});

let win;
async function start() {
  // thư mục dữ liệu ghi được (không ghi vào thư mục cài đặt)
  process.env.DATA_DIR = path.join(app.getPath("userData"), "data");
  process.env.OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(app.getPath("videos"), "Threads Video");
  // ffmpeg cho Windows được đóng gói ở resources/bin
  const ffBundled = path.join(process.resourcesPath || "", "bin", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
  if (fs.existsSync(ffBundled)) { process.env.FFMPEG_PATH = ffBundled; process.env.FFMPEG_BIN = ffBundled; }
  const fpBundled = path.join(process.resourcesPath || "", "bin", process.platform === "win32" ? "ffprobe.exe" : "ffprobe");
  if (fs.existsSync(fpBundled)) process.env.FFPROBE_PATH = fpBundled;
  // ghi log lỗi ra file để dễ báo lỗi
  const logFile = path.join(app.getPath("userData"), "error.log");
  process.on("uncaughtException", (e) => { try { fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${e?.stack || e}\n`); } catch { } });
  process.env.PORT = String(await freePort());

  const { ready } = await import(pathToFileURL(path.join(__dirname, "server.js")).href);
  await ready;

  win = new BrowserWindow({
    width: 1500, height: 920, minWidth: 1100, minHeight: 700,
    title: "Threads Video – AI Video Studio", backgroundColor: "#f5f6fa", autoHideMenuBar: true,
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  Menu.setApplicationMenu(null);
  win.loadURL(`http://127.0.0.1:${process.env.PORT}/`);
  // link ngoài → mở trình duyệt mặc định
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`http://127.0.0.1:${process.env.PORT}/media/`)) return { action: "allow" };
    shell.openExternal(url); return { action: "deny" };
  });
  // Lưu video → hộp thoại chọn nơi lưu
  win.webContents.session.on("will-download", (_e, item) => {
    item.setSaveDialogOptions({ title: "Lưu video", defaultPath: path.join(app.getPath("downloads"), item.getFilename()), filters: [{ name: "Video MP4", extensions: ["mp4"] }] });
  });
  win.webContents.on("before-input-event", (_e, input) => {
    if (input.key === "F12") win.webContents.toggleDevTools();
    if (input.key === "F5") win.webContents.reload();
  });
}

app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(start).catch((e) => {
  dialog.showErrorBox("Threads Video – lỗi khởi động", String(e?.stack || e));
  app.quit();
});
app.on("window-all-closed", () => app.quit());
