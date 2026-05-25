import { EditorProvider } from './context/EditorContext'
import { Toolbar } from './components/Toolbar'
import { Editor } from './components/Editor'

function App() {
  return (
    <EditorProvider>
      <Toolbar />
      <Editor />
    </EditorProvider>
  )
}

export default App
