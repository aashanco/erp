'use client';

export function formatMoney(value: any) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function PrintEngine() {
  return null;
}
