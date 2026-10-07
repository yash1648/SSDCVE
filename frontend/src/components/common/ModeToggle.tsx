import React from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/useTheme"

export const ModeToggle: React.FC = () => {
  const { theme, toggle } = useTheme()
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle color theme">
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
