import Image from "next/image";
import { Form } from "@/components/Form";
import { ModeToggle } from "@/components/mode-toggle";

export default function Home() {
  return (
    <main className="min-h-screen p-6 grid place-items-center">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 text-center">
            {/* Logo responsive y optimizado */}
            <div className="relative w-full max-w-[280px] h-[100px] mx-auto mb-4">
              <Image
                src="/Logo-Fianza.png"
                alt="Fianza Profesional Logo"
                fill
                priority
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 280px"
              />
            </div>
            <h1 className="text-2xl font-bold leading-tight">
              Solicitud de Arrendamiento
            </h1>
          </div>
          <ModeToggle />
        </div>
        <Form />
      </div>
    </main>
  );
}
