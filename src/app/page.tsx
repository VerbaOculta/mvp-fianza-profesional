import { Form } from "@/components/Form"
import { ModeToggle } from "@/components/mode-toggle"

export default function Home() {
  return (
    <main className="min-h-screen p-6 grid place-items-center">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-center flex-1">
            Inicia Evaluación Inquilino
          </h1>
          <ModeToggle />
        </div>
        <Form />
      </div>
    </main>
  )
}
