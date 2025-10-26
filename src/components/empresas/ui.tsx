//src/components/empresas/ui.tsx
"use client";

import * as React from "react";

export const Option = ({ value, label }:{ value:string|number; label:string }) => (
  <option value={value}>{label}</option>
);

export const Field = ({ label, children }:{ label:string; children:React.ReactNode }) => (
  <label className="flex flex-col gap-2">
    <span className="text-sm text-neutral-600">{label}</span>
    {children}
  </label>
);

export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...p}
    className={`w-full rounded-xl border border-neutral-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 ${p.className||""}`}
  />
);

export const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...p}
    className={`w-full rounded-xl border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 ${p.className||""}`}
  />
);
