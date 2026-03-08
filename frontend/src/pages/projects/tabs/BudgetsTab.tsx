import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../api/client'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { PageSpinner } from '../../../components/ui/Spinner'
import { fmt } from '../../../lib/formatters'
import { useAuthStore } from '../../../store/authStore'
import { canUser } from '../../../lib/permissions'

interface Adjustment {
  id: string
  type: 'aditiva' | 'rebalanceo'
  amount: number
  groupId?: string
  description: string
  approvedAt?: string
  approvedBy?: string
}

interface LineItem {
  id: string
  code: string
  category: string
  description: string
  unit: string
  quantity: number
  unitPrice: number
  approvedAmount: number
  totalAmount: number
  adjustments: Adjustment[]
}

interface Budget {
  id: string
  projectId: string
  totalAmount: number
  notes?: string
  approvedAt?: string
  approvedBy?: string
  lineItems: LineItem[]
}

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget', 'project'] }); onClose() },
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

function AditivaForm({ budgetId, lineItems, onClose }: { budgetId: string; lineItems: LineItem[]; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ lineItemId: '', amount: '', description: '', approvedAt: '', approvedBy: '' })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (data: Record<string, string | number>) => api.post(`/projects/any/budgets/${budgetId}/aditivas`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget', 'project'] }); onClose() },
    onError: (err: unknown) => { const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error; setError(msg || 'Error') },
  })
  function set(f: string, v: string) { setForm(p => ({ ...p, [f]: v })) }
  return (
    <form onSubmit={e => {
      e.preventDefault()
      const payload: Record<string, string | number> = { lineItemId: form.lineItemId, amount: Number(form.amount), description: form.description }
      if (form.approvedAt) payload.approvedAt = form.approvedAt
      if (form.approvedBy) payload.approvedBy = form.approvedBy
      mutation.mutate(payload)
    }} className="space-y-4">
      <Select
        label="Partida"
        value={form.lineItemId}
        onChange={e => set('lineItemId', e.target.value)}
        required
        options={lineItems.map(i => ({ value: i.id, label: `${i.code} — ${i.description}` }))}
        placeholder="Seleccionar partida..."
      />
      <Input label="Monto a incrementar" type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} required />
      <Input label="Descripción / motivo" value={form.description} onChange={e => set('description', e.target.value)} required />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Fecha de aprobación" type="date" value={form.approvedAt} onChange={e => set('approvedAt', e.target.value)} />
        <Input label="Aprobado por" value={form.approvedBy} onChange={e => set('approvedBy', e.target.value)} />
      </div>
      {form.lineItemId && form.amount && (
        <div className="bg-green-50 rounded-lg p-3 text-sm">
          <span className="text-gray-600">El presupuesto actualizado de la partida se incrementará en: </span>
          <span className="font-bold text-green-700">{fmt.money(Number(form.amount))}</span>
        </div>
      )}
      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending || !form.lineItemId}>{mutation.isPending ? 'Guardando...' : 'Registrar aditiva'}</Button>
      </div>
    </form>
  )
}

function RebalanceoForm({ budgetId, lineItems, onClose }: { budgetId: string; lineItems: LineItem[]; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ fromLineItemId: '', toLineItemId: '', amount: '', description: '' })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (data: Record<string, string | number>) => api.post(`/projects/any/budgets/${budgetId}/rebalanceos`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget', 'project'] }); onClose() },
    onError: (err: unknown) => { const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error; setError(msg || 'Error') },
  })
  function set(f: string, v: string) { setForm(p => ({ ...p, [f]: v })) }
  const fromItem = lineItems.find(i => i.id === form.fromLineItemId)
  const toItem = lineItems.find(i => i.id === form.toLineItemId)
  return (
    <form onSubmit={e => {
      e.preventDefault()
      mutation.mutate({ fromLineItemId: form.fromLineItemId, toLineItemId: form.toLineItemId, amount: Number(form.amount), description: form.description })
    }} className="space-y-4">
      <Select
        label="Partida origen (descuenta presupuesto)"
        value={form.fromLineItemId}
        onChange={e => set('fromLineItemId', e.target.value)}
        required
        options={lineItems.map(i => ({ value: i.id, label: `${i.code} — ${i.description}` }))}
        placeholder="Seleccionar partida..."
      />
      <Select
        label="Partida destino (recibe presupuesto)"
        value={form.toLineItemId}
        onChange={e => set('toLineItemId', e.target.value)}
        required
        options={lineItems.filter(i => i.id !== form.fromLineItemId).map(i => ({ value: i.id, label: `${i.code} — ${i.description}` }))}
        placeholder="Seleccionar partida..."
      />
      <Input label="Monto a transferir" type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} required />
      <Input label="Descripción / motivo" value={form.description} onChange={e => set('description', e.target.value)} required />
      {form.fromLineItemId && form.toLineItemId && form.amount && (
        <div className="bg-amber-50 rounded-lg p-3 text-sm space-y-1">
          <div><span className="text-gray-600">De: </span><span className="font-medium">{fromItem?.code} {fromItem?.description}</span></div>
          <div><span className="text-gray-600">A: </span><span className="font-medium">{toItem?.code} {toItem?.description}</span></div>
          <div><span className="text-gray-600">Monto: </span><span className="font-bold text-amber-700">{fmt.money(Number(form.amount))}</span></div>
        </div>
      )}
      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending || !form.fromLineItemId || !form.toLineItemId}>{mutation.isPending ? 'Guardando...' : 'Aplicar rebalanceo'}</Button>
      </div>
    </form>
  )
}

export function BudgetsTab({ projectId }: { projectId: string }) {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [showLineItem, setShowLineItem] = useState(false)
  const [showAditiva, setShowAditiva] = useState(false)
  const [showRebalanceo, setShowRebalanceo] = useState(false)
  const [editItem, setEditItem] = useState<LineItem | undefined>()

  const { data: budget, isLoading } = useQuery<Budget | null>({
    queryKey: ['budget', 'project', projectId],
    queryFn: () => api.get(`/projects/${projectId}/budgets`).then(r => r.data),
  })

  const createBudgetMutation = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/budgets`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget', 'project', projectId] }),
  })

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => api.delete(`/projects/any/budgets/${budget?.id}/line-items/${itemId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget', 'project', projectId] }),
  })

  if (isLoading) return <PageSpinner />

  if (!budget) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <p className="text-gray-500 mb-4">No hay presupuesto registrado para este proyecto.</p>
        {canUser(user?.role, 'create:budget') && (
          <Button onClick={() => createBudgetMutation.mutate()} disabled={createBudgetMutation.isPending}>
            {createBudgetMutation.isPending ? 'Creando...' : 'Crear presupuesto'}
          </Button>
        )}
      </div>
    )
  }

  const approvedTotal = budget.lineItems.reduce((s, i) => s + i.approvedAmount, 0)
  const updatedTotal = budget.totalAmount

  return (
    <div className="space-y-6">
      {/* Budget header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">Presupuesto</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Aprobado por: {budget.approvedBy || '—'} · {fmt.date(budget.approvedAt)}
            </p>
            {budget.notes && <p className="text-sm text-gray-400 mt-1">{budget.notes}</p>}
          </div>
          <div className="text-right space-y-1">
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Aprobado</span>
              <div className="text-xl font-bold text-gray-700">{fmt.money(approvedTotal)}</div>
            </div>
            {updatedTotal !== approvedTotal && (
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">Actualizado</span>
                <div className={`text-xl font-bold ${updatedTotal > approvedTotal ? 'text-blue-700' : 'text-red-600'}`}>{fmt.money(updatedTotal)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Line items table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-semibold text-gray-900">Partidas de presupuesto</h3>
          {canUser(user?.role, 'edit:budget') && (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setShowAditiva(true)}>+ Aditiva</Button>
              <Button size="sm" variant="secondary" onClick={() => setShowRebalanceo(true)}>⇄ Rebalanceo</Button>
              <Button size="sm" onClick={() => { setEditItem(undefined); setShowLineItem(true) }}>+ Partida</Button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-5 py-3 text-gray-600 font-medium w-16">Cód.</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Categoría / Descripción</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">Aprobado</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">Aditivas</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">Rebalanceos</th>
                <th className="text-right px-5 py-3 text-gray-600 font-medium">Actualizado</th>
                {canUser(user?.role, 'edit:budget') && <th className="px-4 py-3 w-16" />}
              </tr>
            </thead>
            <tbody>
              {budget.lineItems.map((item) => {
                const aditivasSum = item.adjustments.filter(a => a.type === 'aditiva').reduce((s, a) => s + a.amount, 0)
                const rebalanceosSum = item.adjustments.filter(a => a.type === 'rebalanceo').reduce((s, a) => s + a.amount, 0)
                return (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{item.code}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium text-blue-600">{item.category}</div>
                      <div className="text-gray-700">{item.description}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt.money(item.approvedAmount)}</td>
                    <td className="px-4 py-3 text-right">
                      {aditivasSum > 0 ? <span className="text-green-600">+{fmt.money(aditivasSum)}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {rebalanceosSum !== 0
                        ? <span className={rebalanceosSum > 0 ? 'text-blue-600' : 'text-red-500'}>{rebalanceosSum > 0 ? '+' : ''}{fmt.money(rebalanceosSum)}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">{fmt.money(item.totalAmount)}</td>
                    {canUser(user?.role, 'edit:budget') && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => { setEditItem(item); setShowLineItem(true) }} className="text-gray-400 hover:text-blue-600 text-xs px-1">✏</button>
                          {user?.role === 'admin' && (
                            <button onClick={() => deleteItemMutation.mutate(item.id)} className="text-gray-400 hover:text-red-600 text-xs px-1">✕</button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={2} className="px-5 py-3 text-right">TOTAL</td>
                <td className="px-4 py-3 text-right text-gray-600">{fmt.money(approvedTotal)}</td>
                <td className="px-4 py-3 text-right text-green-600">
                  {(() => { const s = budget.lineItems.flatMap(i => i.adjustments).filter(a => a.type === 'aditiva').reduce((sum, a) => sum + a.amount, 0); return s > 0 ? `+${fmt.money(s)}` : '—' })()}
                </td>
                <td className="px-4 py-3 text-right">
                  {(() => {
                    const s = budget.lineItems.flatMap(i => i.adjustments).filter(a => a.type === 'rebalanceo').reduce((sum, a) => sum + a.amount, 0)
                    return s !== 0 ? <span className={s > 0 ? 'text-blue-600' : 'text-red-500'}>{s > 0 ? '+' : ''}{fmt.money(s)}</span> : <span>—</span>
                  })()}
                </td>
                <td className="px-5 py-3 text-right text-blue-700">{fmt.money(updatedTotal)}</td>
                {canUser(user?.role, 'edit:budget') && <td />}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showLineItem} onClose={() => { setShowLineItem(false); setEditItem(undefined) }} title={editItem ? 'Editar partida' : 'Agregar partida'} size="lg">
        <LineItemForm budgetId={budget.id} item={editItem} onClose={() => { setShowLineItem(false); setEditItem(undefined) }} />
      </Modal>

      <Modal open={showAditiva} onClose={() => setShowAditiva(false)} title="Registrar aditiva" size="lg">
        <AditivaForm budgetId={budget.id} lineItems={budget.lineItems} onClose={() => setShowAditiva(false)} />
      </Modal>

      <Modal open={showRebalanceo} onClose={() => setShowRebalanceo(false)} title="Aplicar rebalanceo" size="lg">
        <RebalanceoForm budgetId={budget.id} lineItems={budget.lineItems} onClose={() => setShowRebalanceo(false)} />
      </Modal>
    </div>
  )
}
