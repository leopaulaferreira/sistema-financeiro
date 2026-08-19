import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Tags,
  PiggyBank,
  Target,
  BarChart3,
} from 'lucide-react'
import { paths } from '@/routes/paths'

export const navItems = [
  { to: paths.dashboard, label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: paths.transactions, label: 'Transações', icon: ArrowLeftRight },
  { to: paths.accounts, label: 'Contas', icon: Wallet },
  { to: paths.categories, label: 'Categorias', icon: Tags },
  { to: paths.budgets, label: 'Orçamentos', icon: PiggyBank },
  { to: paths.goals, label: 'Metas', icon: Target },
  { to: paths.reports, label: 'Relatórios', icon: BarChart3 },
] as const
