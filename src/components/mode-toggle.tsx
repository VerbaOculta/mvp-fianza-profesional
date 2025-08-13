"use client"

import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const toggle = () => setTheme(theme === "dark" ? "light" : "dark")

  return (
    <Button variant="outline" size="icon" onClick={toggle} aria-label="Alternar tema">
      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  )
}
