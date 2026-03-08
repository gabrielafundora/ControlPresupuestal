import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { PageSpinner } from '../../components/ui/Spinner'
import { fmt } from '../../lib/formatters'
import { useAuthStore } from '../../store/authStore'
import { canUser } from '../../lib/permissions'

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planeación' },
  { value: 'active', label: 'Activo' },
  { value: 'on_hold', label: 'En espera' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
]

function ProjectForm({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ code: '', name: '', description: '', status: 'planning', location: '', startDate: '', endDate: '' })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/projects', { ...data, startDate: data.startDate || undefined, endDate: data.endDate || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); onSuccess() },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'Error al crear proyecto')
    },
  })

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Código" value={form.code} onChange={e => set('code', e.target.value)} required placeholder="PRY-2024-001" />
        <Select label="Estatus" value={form.status} onChange={e => set('status', e.target.value)} options={STATUS_OPTIONS} />
      </div>
      <Input label="Nombre del proyecto" value={form.name} onChange={e => set('name', e.target.value)} required />
      <Input label="Descripción" value={form.description} onChange={e => set('description', e.target.value)} />
      <Input label="Ubicación" value={form.location} onChange={e => set('location', e.target.value)} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Fecha inicio" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        <Input label="Fecha fin estimada" type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
      </div>
      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando...' : 'Crear proyecto'}</Button>
      </div>
    </form>
  )
}

export function ProjectsListPage() {
  const { user } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  })

  if (isLoading) return <PageSpinner />

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
          <p className="text-gray-500 mt-1">{projects?.length ?? 0} proyectos en total</p>
        </div>
        {canUser(user?.role, 'create:project') && (
          <Button onClick={() => setShowForm(true)}>+ Nuevo proyecto</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects?.map((p: { id: string; code: string; name: string; status: string; location?: string; activeBudget?: { totalAmount: number }; _count?: { contracts: number } }) => (
          <Link key={p.id} to={`/projects/${p.id}`} className="block bg-white rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-gray-400 font-mono">{p.code}</p>
                <h3 className="font-semibold text-gray-900 mt-0.5">{p.name}</h3>
              </div>
              <Badge status={p.status} />
            </div>
            {p.location && <p className="text-sm text-gray-500 mb-3">📍 {p.location}</p>}
            <div className="flex justify-between text-sm pt-3 border-t border-gray-100">
              <span className="text-gray-500">Presupuesto aprobado</span>
              <span className="font-medium text-gray-900">{p.activeBudget ? fmt.money(p.activeBudget.totalAmount) : '—'}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-500">Contratos</span>
              <span className="font-medium">{p._count?.contracts ?? 0}</span>
            </div>
          </Link>
        ))}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo proyecto" size="lg">
        <ProjectForm onSuccess={() => setShowForm(false)} onClose={() => setShowForm(false)} />
      </Modal>
    </div>
  )
}
