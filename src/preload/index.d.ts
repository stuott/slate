import { ElectronAPI as BaseElectronAPI } from '../renderer/src/types'

declare global {
  interface Window {
    electronAPI: import('../renderer/src/types').ElectronAPI
  }
}
