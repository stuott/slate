import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  openFile: () => ipcRenderer.invoke('dialog:open-file'),
  saveFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('fs:save-file', filePath, content),
  saveFileAs: (content: string) => ipcRenderer.invoke('dialog:save-file-as', content),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:read-file', filePath),
  setTitle: (title: string) => ipcRenderer.invoke('set-title', title),
  setDirty: (dirty: boolean) => ipcRenderer.invoke('set-dirty', dirty),
  onCloseGuard: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('dialog:close-guard', handler)
    return () => ipcRenderer.removeListener('dialog:close-guard', handler)
  },
  sendCloseGuardResult: (result: string) => ipcRenderer.send('close-guard-result', result),
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized') as Promise<boolean>,
  onMaximizeChange: (cb: (maximized: boolean) => void) => {
    const handler = (_: Electron.IpcRendererEvent, maximized: boolean) => cb(maximized)
    ipcRenderer.on('window-maximize-change', handler)
    return () => ipcRenderer.removeListener('window-maximize-change', handler)
  },
  onMenuNewFile: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('menu:new-file', handler)
    return () => ipcRenderer.removeListener('menu:new-file', handler)
  },
  onMenuOpenFile: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('menu:open-file', handler)
    return () => ipcRenderer.removeListener('menu:open-file', handler)
  },
  onMenuSaveFile: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('menu:save-file', handler)
    return () => ipcRenderer.removeListener('menu:save-file', handler)
  },
  onMenuSaveAs: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('menu:save-as', handler)
    return () => ipcRenderer.removeListener('menu:save-as', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electronAPI = electronAPI
}
