'use client';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-center">
      <h1 className="text-3xl font-bold">Bienvenido a GNIO Contable</h1>
      <p className="mt-2 text-gray-600">
        El software que facilita la gestión contable, laboral y tributaria para administradores, contadores y empresas.
      </p>
      <button
        onClick={() => router.push('/login')}
        className="mt-6 px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Entrar al sistema
      </button>
    </div>
  );
}
