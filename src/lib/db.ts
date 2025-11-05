// ==============================================
// API: conexión MySQL (pool y helpers)
// Archivo: src/lib/db.ts
// ==============================================
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 10,
  timezone: "Z",
  dateStrings: false,
});

export async function executeQuery<T = any>({ query, values = [] as any[] }: { query: string; values?: any[] }) {
  const [rows] = await pool.query(query, values);
  return rows as T;
}

export async function iniciarConnection() {
  const conn = await pool.getConnection();
  // Habilitamos transacciones cuando se necesiten (POST/PUT)
  // El caller debe: await conn.beginTransaction(); ... commit()/rollback(); conn.release();
  return conn;
}
