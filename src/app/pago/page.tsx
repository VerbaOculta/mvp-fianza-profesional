import { Suspense } from 'react';
import PagoClient from './PagoClient';

// Evita SSG para esta ruta (usa render dinámico en runtime)
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Cargando pago…</div>}>
      <PagoClient />
    </Suspense>
  );
}
