import { Form } from "@/components/Form"
import { ModeToggle } from "@/components/mode-toggle"

export default function Home() {
  return (
    <main className="min-h-screen p-6 grid place-items-center">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-bold leading-tight">Fianza Profesional</h1>
            <p className="text-sm text-muted-foreground mt-1">Inicia Evaluación Inquilino</p>
          </div>
          <ModeToggle />
        </div>
        <Form />
      </div>
    </main>
  )
}
