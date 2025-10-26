import Sidebar from '@/components/Sidebar';

export default function ContadorDashboard() {
  return (
    <div className="flex">
      <Sidebar role="CONTADOR" />
      <main className="flex-1 p-10 bg-gray-100 min-h-screen">
        <h1 className="text-3xl font-bold mb-4">Sistema Contable GNIO 1.1 (Contador)</h1>
        <p>Bienvenido contador. Aquí puedes manejar balances y reportes.</p>
      </main>
    </div>
  );
}
