import Sidebar from '@/components/Sidebar';

type PageProps = {
  params: { usuario: string };
};

export default function EmpresaDashboard({ params }: PageProps) {
  return (
    <div className="flex">
      <Sidebar role="EMPRESA" usuario={params.usuario} />
      <main className="flex-1 p-10 bg-gray-100 min-h-screen">
        <h1 className="text-3xl font-bold mb-4">Sistema Contable GNIO 1.2 (Empresa)</h1>
        <p>Bienvenido empresa. Aquí puedes gestionar tu régimen y operaciones.</p>
      </main>
    </div>
  );
}
