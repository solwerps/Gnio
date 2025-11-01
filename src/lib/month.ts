export function getDefaultYYYYMM(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function monthRange(yyyyMM: string) {
  const [y, m] = yyyyMM.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1); // semi-abierto
  return { start, end };
}
