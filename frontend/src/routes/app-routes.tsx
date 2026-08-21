import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { paths } from './paths'
import { AppLayout } from '@/layouts/app-layout'
import { AuthLayout } from '@/layouts/auth-layout'
import { ProtectedRoute, PublicOnlyRoute } from '@/features/auth/protected-route'
import { Skeleton } from '@/components/ui/skeleton'

// Cada página vira o próprio chunk (Fase 9, seção 41: o bundle único passava
// de 500kB, sobretudo por causa do Recharts usado em dashboard/relatórios) —
// carregado sob demanda por rota em vez de tudo de uma vez no primeiro load.
const DashboardPage = lazy(() => import('@/pages/dashboard-page').then((m) => ({ default: m.DashboardPage })))
const TransactionsPage = lazy(() => import('@/pages/transactions-page').then((m) => ({ default: m.TransactionsPage })))
const AccountsPage = lazy(() => import('@/pages/accounts-page').then((m) => ({ default: m.AccountsPage })))
const CategoriesPage = lazy(() => import('@/pages/categories-page').then((m) => ({ default: m.CategoriesPage })))
const RecurringPage = lazy(() => import('@/pages/recurring-page').then((m) => ({ default: m.RecurringPage })))
const BudgetsPage = lazy(() => import('@/pages/budgets-page').then((m) => ({ default: m.BudgetsPage })))
const GoalsPage = lazy(() => import('@/pages/goals-page').then((m) => ({ default: m.GoalsPage })))
const ReportsPage = lazy(() => import('@/pages/reports-page').then((m) => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('@/pages/settings-page').then((m) => ({ default: m.SettingsPage })))
const LoginPage = lazy(() => import('@/pages/login-page').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/register-page').then((m) => ({ default: m.RegisterPage })))
const NotFoundPage = lazy(() => import('@/pages/not-found-page').then((m) => ({ default: m.NotFoundPage })))

function RouteFallback() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
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
    </Suspense>
  )
}
