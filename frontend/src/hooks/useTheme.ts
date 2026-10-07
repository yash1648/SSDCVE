import { useCallback, useEffect, useState } from "react"

type Theme = "light" | "dark"

const STORAGE_KEY = "ssdcve-theme"

function getInitial(): Theme {
  if (typeof window === "undefined") return "dark"
  const saved = window.localStorage.getItem(STORAGE_KEY) as Theme | null
  if (saved === "light" || saved === "dark") return saved
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitial)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", theme === "dark")
    root.style.colorScheme = theme
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), [])

  return { theme, setTheme, toggle }
}
