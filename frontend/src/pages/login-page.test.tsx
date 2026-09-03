import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from './login-page'
import { ApiClientError } from '@/services/api-error'

const navigateMock = vi.fn()
const loginMock = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({ login: loginMock }),
}))

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  it('pre-fills the demo account credentials so a visitor can log in with one click', async () => {
    loginMock.mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    renderLoginPage()

    expect(screen.getByLabelText('E-mail')).toHaveValue('user@gmail.com')
    expect(screen.getByLabelText('Senha')).toHaveValue('123456789')

    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({ email: 'user@gmail.com', password: '123456789' })
    })
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/'))
  })

  it('submits the typed credentials and navigates to the dashboard on success', async () => {
    loginMock.mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    renderLoginPage()

    await user.clear(screen.getByLabelText('E-mail'))
    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com')
    await user.clear(screen.getByLabelText('Senha'))
    await user.type(screen.getByLabelText('Senha'), 'senha1234')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({ email: 'ana@example.com', password: 'senha1234' })
    })
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/'))
  })

  it('shows the backend message and stays on the page when credentials are invalid', async () => {
    loginMock.mockRejectedValueOnce(new ApiClientError(401, 'E-mail ou senha inválidos'))
    const user = userEvent.setup()
    renderLoginPage()

    await user.clear(screen.getByLabelText('E-mail'))
    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com')
    await user.clear(screen.getByLabelText('Senha'))
    await user.type(screen.getByLabelText('Senha'), 'senhaerrada')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByText('E-mail ou senha inválidos')).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
