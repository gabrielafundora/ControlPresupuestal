import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../api/client'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { PageSpinner } from '../../../components/ui/Spinner'
import { fmt } from '../../../lib/formatters'
import { useAuthStore } from '../../../store/authStore'
import { canUser } from '../../../lib/permissions'

interface BudgetVersion { id: string; version: number; label: string; isActive: boolean; totalAmount: number; approvedAt: string; approvedBy: string; _count?: { lineItems: number } }
interface LineItem { id: string; code: string; category: string; description: string; unit: string; quantity: number; unitPrice: number; totalAmount: number }

function LineItemForm({ budgetId, item, onClose }: { budgetId: string; item?: LineItem; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    code: item?.code || '',
    category: item?.category || '',
    description: item?.description || '',
    unit: item?.unit || 'm²',
    quantity: item?.quantity?.toString() || '',
    unitPrice: item?.unitPrice?.toString() || '',
  })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (data: Record<string, string | number>) => item
      ? api.patch(`/projects/any/budgets/${budgetId}/line-items/${item.id}`, data)
      : api.post(`/projects/any/budgets/${budgetId}/line-items`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget'] }); onClose() },
    onError: (err: unknown) => { const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error; setError(msg || 'Error') },
  })
  function set(f: string, v: string) { setForm(p => ({ ...p, [f]: v })) }
  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate({ ...form, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) }) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Código" value={form.code} onChange={e => set('code', e.target.value)} required placeholder="01.01" />
        <Input label="Categoría" value={form.category} onChange={e => set('category', e.target.value)} required placeholder="Estructura" />
      </div>
      <Input label="Descripción" value={form.description} onChange={e => set('description', e.target.value)} required />
      <div className="grid grid-cols-3 gap-4">
        <Input label="Unidad" value={form.unit} onChange={e => set('unit', e.target.value)} required />
        <Input label="Cantidad" type="number" step="0.01" value={form.quantity} onChange={e => set('quantity', e.target.value)} required />
        <Input label="Precio unitario" type="number" step="0.01" value={form.unitPrice} onChange={e => set('unitPrice', e.target.value)} required />
      </div>
      {form.quantity && form.unitPrice && (
        <div className="bg-blue-50 rounded-lg p-3 text-sm">
          <span className="text-gray-600">Total estimado: </span>
          <span className="font-bold text-blue-700">{fmt.money(Number(form.quantity) * Number(form.unitPrice))}</span>
        </div>
      )}
      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando...' : item ? 'Actualizar' : 'Agregar partida'}</Button>
      </div>
    </form>
  )
}

export function BudgetsTab({ projectId }: { projectId: string }) {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewBudget, setShowNewBudget] = useState(false)
  const [showLineItem, setShowLineItem] = useState(false)
  const [newBudgetLabel, setNewBudgetLabel] = useState('')

  const { data: budgets, isLoading } = useQuery<BudgetVersion[]>({
    queryKey: ['budgets', projectId],
    queryFn: () => api.get(`/projects/${projectId}/budgets`).then(r => r.data),
  })

  const { data: budget, isLoading: budgetLoading } = useQuery({
    queryKey: ['budget', selectedId],
    queryFn: () => api.get(`/projects/${projectId}/budgets/${selectedId}`).then(r => r.data),
    enabled: !!selectedId,
  })

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/projects/${projectId}/budgets/${id}/activate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets', projectId] }),
  })

  const createBudgetMutation = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/budgets`, { label: newBudgetLabel }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets', projectId] }); setShowNewBudget(false); setNewBudgetLabel('') },
  })

  // Auto-select active or first budget
  const activeId = budgets?.find(b => b.isActive)?.id || budgets?.[0]?.id
  const currentId = selectedId || activeId

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      {/* Version selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {budgets?.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedId(b.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${currentId === b.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'}`}
            >
              {b.label || `v${b.version}`}
              {b.isActive && <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Activo</span>}
            </button>
          ))}
        </div>
        {canUser(user?.role, 'create:budget') && (
          <Button variant="secondary" size="sm" onClick={() => setShowNewBudget(true)}>+ Nueva versión</Button>
        )}
      </div>

      {currentId && (
        <>
          {budgetLoading ? <PageSpinner /> : (
            <>
              {/* Budget header */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{budget?.label}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Aprobado por: {budget?.approvedBy || '—'} · {fmt.date(budget?.approvedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{fmt.money(budget?.totalAmount ?? 0)}</div>
                    <div className="text-sm text-gray-500">{budget?.lineItems?.length ?? 0} partidas</div>
                  </div>
                </div>
                {!budget?.isActive && canUser(user?.role, 'activate:budget') && (
                  <div className="mt-4 pt-4 border-t">
                    <Button size="sm" onClick={() => activateMutation.mutate(currentId)} disabled={activateMutation.isPending}>
                      Activar esta versión
                    </Button>
                  </div>
                )}
              </div>

              {/* Line items */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="flex items-center justify-between p-5 border-b">
                  <h3 className="font-semibold text-gray-900">Partidas de presupuesto</h3>
                  {canUser(user?.role, 'edit:budget') && (
                    <Button size="sm" onClick={() => setShowLineItem(true)}>+ Agregar partida</Button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-gray-50">
                      <th className="text-left px-5 py-3 text-gray-600 font-medium w-16">Cód.</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Categoría / Descripción</th>
                      <th className="text-right px-4 py-3 text-gray-600 font-medium">Und.</th>
                      <th className="text-right px-4 py-3 text-gray-600 font-medium">Cantidad</th>
                      <th className="text-right px-4 py-3 text-gray-600 font-medium">P. Unit.</th>
                      <th className="text-right px-5 py-3 text-gray-600 font-medium">Total</th>
                    </tr></thead>
                    <tbody>
                      {budget?.lineItems?.map((item: LineItem) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="px-5 py-3 font-mono text-xs text-gray-500">{item.code}</td>
                          <td className="px-4 py-3">
                            <div className="text-xs font-medium text-blue-600">{item.category}</div>
                            <div className="text-gray-700">{item.description}</div>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500">{item.unit}</td>
                          <td className="px-4 py-3 text-right">{fmt.number(item.quantity)}</td>
                          <td className="px-4 py-3 text-right">{fmt.money(item.unitPrice)}</td>
                          <td className="px-5 py-3 text-right font-semibold">{fmt.money(item.totalAmount)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-semibold">
                        <td colSpan={5} className="px-5 py-3 text-right">TOTAL</td>
                        <td className="px-5 py-3 text-right text-blue-700">{fmt.money(budget?.totalAmount ?? 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <Modal open={showNewBudget} onClose={() => setShowNewBudget(false)} title="Nueva versión de presupuesto">
        <div className="space-y-4">
          <Input label="Etiqueta" value={newBudgetLabel} onChange={e => setNewBudgetLabel(e.target.value)} placeholder="Revisión Abril 2024" />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowNewBudget(false)}>Cancelar</Button>
            <Button onClick={() => createBudgetMutation.mutate()} disabled={createBudgetMutation.isPending}>Crear</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showLineItem} onClose={() => setShowLineItem(false)} title="Agregar partida" size="lg">
        {currentId && <LineItemForm budgetId={currentId} onClose={() => setShowLineItem(false)} />}
      </Modal>
    </div>
  )
}
