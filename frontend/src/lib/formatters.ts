const mxnFormatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
const percentFormatter = new Intl.NumberFormat('es-MX', { style: 'percent', minimumFractionDigits: 1 })
const dateFormatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' })

export const fmt = {
  money: (v: number) => mxnFormatter.format(v),
  percent: (v: number) => percentFormatter.format(v / 100),
  date: (v: string | Date | null | undefined) => v ? dateFormatter.format(new Date(v)) : '—',
  number: (v: number) => v.toLocaleString('es-MX'),
}

export const STATUS_LABELS: Record<string, string> = {
  planning: 'Planeación',
  active: 'Activo',
  on_hold: 'En espera',
  completed: 'Completado',
  cancelled: 'Cancelado',
  draft: 'Borrador',
  submitted: 'Enviado',
  approved: 'Aprobado',
  paid: 'Pagado',
  rejected: 'Rechazado',
  additive: 'Aditiva',
  deductive: 'Deductiva',
}

export const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  additive: 'bg-green-100 text-green-700',
  deductive: 'bg-red-100 text-red-700',
}
