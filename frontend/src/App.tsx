import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from '@/routes/app-routes'
import { Toaster } from '@/components/ui/sonner'

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster position="bottom-right" theme="dark" />
    </BrowserRouter>
  )
}

export default App
