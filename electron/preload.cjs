const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopInvoice", {
  previewPdf: (htmlContent) => ipcRenderer.invoke("invoice:preview-pdf", htmlContent)
});
