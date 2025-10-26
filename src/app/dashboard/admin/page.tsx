import Sidebar from '@/components/Sidebar';

export default function AdminDashboard() {
  return (
    <div className="flex">
      <Sidebar role="ADMIN" />
      <main className="flex-1 p-10 bg-gray-100 min-h-screen">
        <h1 className="text-3xl font-bold mb-4">Sistema Contable GNIO 1.0 (Admin)</h1>
        <p>Bienvenido administrador. Aquí puedes gestionar todo el sistema.</p>
      </main>
    </div>
  );
}
