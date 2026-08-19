import { useEffect, useState } from 'react'

/** Simula uma pequena latência de carregamento para validar skeletons enquanto não há API real. */
export function useMockLoading(delayMs = 400): boolean {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), delayMs)
    return () => clearTimeout(timer)
  }, [delayMs])

  return loading
}
