import {
  Banknote,
  Laptop,
  TrendingUp,
  ShoppingCart,
  Home,
  Dumbbell,
  Fuel,
  Tv,
  UtensilsCrossed,
  Pill,
  PartyPopper,
  Car,
  Plane,
  Heart,
  GraduationCap,
  Gift,
  Tag,
  type LucideIcon,
} from 'lucide-react'

export const iconOptions: Record<string, LucideIcon> = {
  Banknote,
  Laptop,
  TrendingUp,
  ShoppingCart,
  Home,
  Dumbbell,
  Fuel,
  Tv,
  UtensilsCrossed,
  Pill,
  PartyPopper,
  Car,
  Plane,
  Heart,
  GraduationCap,
  Gift,
  Tag,
}

export function resolveIcon(name: string): LucideIcon {
  return iconOptions[name] ?? Tag
}
