import type { Category } from '@/types/finance'

export const mockCategories: Category[] = [
  { id: 'cat-salario', name: 'Salário', type: 'INCOME', color: 'oklch(0.72 0.17 149)', icon: 'Banknote' },
  { id: 'cat-freelance', name: 'Freelance', type: 'INCOME', color: 'oklch(0.78 0.12 210)', icon: 'Laptop' },
  { id: 'cat-investimentos', name: 'Investimentos', type: 'INCOME', color: 'oklch(0.64 0.19 293)', icon: 'TrendingUp' },

  { id: 'cat-supermercado', name: 'Supermercado', type: 'EXPENSE', color: 'oklch(0.65 0.21 25)', icon: 'ShoppingCart' },
  { id: 'cat-aluguel', name: 'Aluguel', type: 'EXPENSE', color: 'oklch(0.62 0.2 300)', icon: 'Home' },
  { id: 'cat-academia', name: 'Academia', type: 'EXPENSE', color: 'oklch(0.79 0.15 80)', icon: 'Dumbbell' },
  { id: 'cat-combustivel', name: 'Combustível', type: 'EXPENSE', color: 'oklch(0.7 0.19 45)', icon: 'Fuel' },
  { id: 'cat-streaming', name: 'Streaming', type: 'EXPENSE', color: 'oklch(0.66 0.2 340)', icon: 'Tv' },
  { id: 'cat-restaurante', name: 'Restaurante', type: 'EXPENSE', color: 'oklch(0.72 0.18 60)', icon: 'UtensilsCrossed' },
  { id: 'cat-farmacia', name: 'Farmácia', type: 'EXPENSE', color: 'oklch(0.75 0.14 190)', icon: 'Pill' },
  { id: 'cat-lazer', name: 'Lazer', type: 'EXPENSE', color: 'oklch(0.7 0.17 250)', icon: 'PartyPopper' },
]

export const categoryById = (id: string) => mockCategories.find((c) => c.id === id)
