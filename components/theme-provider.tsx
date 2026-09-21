'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({ children, initialTheme }: { children: React.ReactNode; initialTheme: string }) {
  return <NextThemesProvider attribute="class" defaultTheme={initialTheme} enableSystem>{children}</NextThemesProvider>
}
