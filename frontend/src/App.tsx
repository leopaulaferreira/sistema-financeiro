import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { AuthProvider } from '@/features/auth/auth-context'
import { AppRoutes } from '@/routes/app-routes'
import { Toaster } from '@/components/ui/sonner'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
        <Toaster position="bottom-right" theme="dark" />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
