// src/app/login/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      return setError(data.error || 'Credenciales inválidas');
    }

    // ✅ usa el redirect exacto que entrega la API
    if (data.redirect) return router.push(data.redirect);

    // Fallback por si algo faltó (no debería)
    if (data.role === 'ADMIN') return router.push('/dashboard/admin');
    if (data.role === 'CONTADOR') return router.push(`/dashboard/contador/${username}`);
    if (data.role === 'EMPRESA')  return router.push(`/dashboard/empresa/${username}`);
    router.push('/dashboard/admin');
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="bg-white shadow-lg p-8 rounded w-96">
        <h2 className="text-2xl font-bold text-center mb-4">Iniciar Sesión</h2>
        {error && <p className="text-red-500 mb-2">{error}</p>}

        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 border rounded mb-3"
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded mb-3"
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {loading ? 'Entrando...' : 'Iniciar Sesión →'}
        </button>
      </div>
    </div>
  );
}
