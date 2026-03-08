import { ReactNode } from 'react'
import clsx from 'clsx'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('bg-white rounded-xl border border-gray-200 shadow-sm', className)}>{children}</div>
}

export function KpiCard({ label, value, sub, color = 'blue' }: { label: string; value: string; sub?: string; color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray' }) {
  const colors = { blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700', red: 'bg-red-50 text-red-700', yellow: 'bg-yellow-50 text-yellow-700', gray: 'bg-gray-50 text-gray-700' }
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className={clsx('mt-1 text-2xl font-bold', colors[color].split(' ')[1])}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}
