import { Routes, Route } from 'react-router-dom'
import { paths } from './paths'
import { AppLayout } from '@/layouts/app-layout'
import { AuthLayout } from '@/layouts/auth-layout'
import { ProtectedRoute, PublicOnlyRoute } from '@/features/auth/protected-route'
import { DashboardPage } from '@/pages/dashboard-page'
import { TransactionsPage } from '@/pages/transactions-page'
import { AccountsPage } from '@/pages/accounts-page'
import { CategoriesPage } from '@/pages/categories-page'
import { RecurringPage } from '@/pages/recurring-page'
import { BudgetsPage } from '@/pages/budgets-page'
import { GoalsPage } from '@/pages/goals-page'
import { ReportsPage } from '@/pages/reports-page'
import { SettingsPage } from '@/pages/settings-page'
import { LoginPage } from '@/pages/login-page'
import { RegisterPage } from '@/pages/register-page'
import { NotFoundPage } from '@/pages/not-found-page'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route element={<AuthLayout />}>
          <Route path={paths.login} element={<LoginPage />} />
          <Route path={paths.register} element={<RegisterPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path={paths.dashboard} element={<DashboardPage />} />
          <Route path={paths.transactions} element={<TransactionsPage />} />
          <Route path={paths.accounts} element={<AccountsPage />} />
          <Route path={paths.categories} element={<CategoriesPage />} />
          <Route path={paths.recurring} element={<RecurringPage />} />
          <Route path={paths.budgets} element={<BudgetsPage />} />
          <Route path={paths.goals} element={<GoalsPage />} />
          <Route path={paths.reports} element={<ReportsPage />} />
          <Route path={paths.settings} element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
