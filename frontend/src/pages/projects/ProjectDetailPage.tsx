import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { PageSpinner } from '../../components/ui/Spinner'
import { KpiCard } from '../../components/ui/Card'
import { fmt } from '../../lib/formatters'
import { useAuthStore } from '../../store/authStore'
import { canUser } from '../../lib/permissions'
import { BudgetsTab } from './tabs/BudgetsTab'
import { ContractsTab } from './tabs/ContractsTab'
import { ReportTab } from './tabs/ReportTab'

const TABS = ['Resumen', 'Presupuesto', 'Contratos', 'Reporte']

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planeación' },
  { value: 'active', label: 'Activo' },
  { value: 'on_hold', label: 'En espera' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
]

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('Resumen')
  const [editOpen, setEditOpen] = useState(false)

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then(r => r.data),
  })

  const { data: summary } = useQuery({
    queryKey: ['report', id, 'summary'],
    queryFn: () => api.get(`/reports/projects/${id}/summary`).then(r => r.data),
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, string>) => api.patch(`/projects/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', id] }); setEditOpen(false) },
  })

  if (isLoading) return <PageSpinner />
  if (!project) return <div className="p-8 text-gray-500">Proyecto no encontrado</div>

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-start justify-between">
          <div>
            <Link to="/projects" className="text-sm text-gray-400 hover:text-gray-600 mb-2 block">← Proyectos</Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <Badge status={project.status} />
            </div>
            <p className="text-sm text-gray-500 mt-1 font-mono">{project.code}</p>
            {project.location && <p className="text-sm text-gray-500">📍 {project.location}</p>}
          </div>
          {canUser(user?.role, 'edit:project') && (
            <Button variant="secondary" onClick={() => setEditOpen(true)}>Editar</Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-6">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {activeTab === 'Resumen' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Presupuesto aprobado" value={fmt.money(summary?.budgetTotal ?? 0)} color="gray" />
              <KpiCard label="Total contratado" value={fmt.money(summary?.totalContracted ?? 0)} sub={summary?.budgetTotal > 0 ? `${((summary.totalContracted / summary.budgetTotal) * 100).toFixed(1)}%` : undefined} color="blue" />
              <KpiCard label="Total ejecutado" value={fmt.money(summary?.totalExecuted ?? 0)} color="green" />
              <KpiCard label="Varianza" value={fmt.money(summary?.variance ?? 0)} sub={summary?.variancePercent != null ? `${summary.variancePercent.toFixed(1)}%` : undefined} color={summary?.variance >= 0 ? 'green' : 'red'} />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Información del proyecto</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">Inicio</dt>
                  <dd className="font-medium">{fmt.date(project.startDate)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Fin estimado</dt>
                  <dd className="font-medium">{fmt.date(project.endDate)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-gray-500">Descripción</dt>
                  <dd className="font-medium">{project.description || '—'}</dd>
                </div>
              </dl>
            </div>

            {summary?.contracts?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-5 border-b"><h3 className="font-semibold text-gray-900">Contratos</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-gray-50">
                      <th className="text-left px-5 py-3 text-gray-600 font-medium">Contrato</th>
                      <th className="text-right px-4 py-3 text-gray-600 font-medium">Original</th>
                      <th className="text-right px-4 py-3 text-gray-600 font-medium">Autorizado</th>
                      <th className="text-right px-4 py-3 text-gray-600 font-medium">Ejecutado</th>
                      <th className="text-right px-4 py-3 text-gray-600 font-medium">Avance</th>
                    </tr></thead>
                    <tbody>
                      {summary.contracts.map((c: { contractId: string; contractNumber: string; description: string; originalAmount: number; authorizedAmount: number; executedAmount: number; progressPercent: number }) => (
                        <tr key={c.contractId} className="border-b hover:bg-gray-50">
                          <td className="px-5 py-3">
                            <div className="font-medium">{c.contractNumber}</div>
                            <div className="text-xs text-gray-400">{c.description}</div>
                          </td>
                          <td className="px-4 py-3 text-right">{fmt.money(c.originalAmount)}</td>
                          <td className="px-4 py-3 text-right">{fmt.money(c.authorizedAmount)}</td>
                          <td className="px-4 py-3 text-right">{fmt.money(c.executedAmount)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-1.5">
                                <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${c.progressPercent}%` }} />
                              </div>
                              <span className="text-xs">{c.progressPercent}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Presupuesto' && <BudgetsTab projectId={id!} />}
        {activeTab === 'Contratos' && <ContractsTab projectId={id!} />}
        {activeTab === 'Reporte' && <ReportTab projectId={id!} />}
      </div>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar proyecto" size="lg">
        <EditProjectForm project={project} onClose={() => setEditOpen(false)} onSave={data => updateMutation.mutate(data)} loading={updateMutation.isPending} />
      </Modal>
    </div>
  )
}

function EditProjectForm({ project, onClose, onSave, loading }: { project: Record<string, string>; onClose: () => void; onSave: (d: Record<string, string>) => void; loading: boolean }) {
  const [form, setForm] = useState({
    name: project.name || '',
    description: project.description || '',
    status: project.status || 'active',
    location: project.location || '',
    startDate: project.startDate ? project.startDate.slice(0, 10) : '',
    endDate: project.endDate ? project.endDate.slice(0, 10) : '',
  })
  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="space-y-4">
      <Input label="Nombre" value={form.name} onChange={e => set('name', e.target.value)} required />
      <Select label="Estatus" value={form.status} onChange={e => set('status', e.target.value)} options={STATUS_OPTIONS} />
      <Input label="Descripción" value={form.description} onChange={e => set('description', e.target.value)} />
      <Input label="Ubicación" value={form.location} onChange={e => set('location', e.target.value)} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Fecha inicio" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        <Input label="Fecha fin" type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar cambios'}</Button>
      </div>
    </form>
  )
}
