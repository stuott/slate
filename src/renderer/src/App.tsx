import { EditorProvider } from './context/EditorContext'
import { DialogProvider } from './context/DialogContext'
import { Toolbar } from './components/Toolbar'
import { Editor } from './components/Editor'
import { Dialog } from './components/Dialog'

function App() {
  return (
    <EditorProvider>
      <DialogProvider>
        <Toolbar />
        <Editor />
        <Dialog />
      </DialogProvider>
    </EditorProvider>
  )
}

export default App
