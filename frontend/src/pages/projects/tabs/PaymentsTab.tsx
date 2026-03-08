import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../api/client'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { PageSpinner } from '../../../components/ui/Spinner'
import { fmt } from '../../../lib/formatters'
import { useAuthStore } from '../../../store/authStore'
import { canUser } from '../../../lib/permissions'

interface Payment {
  id: string
  estimateNumber: number
  amount: number
  status: string
  percentComplete: number
  periodStart: string
  periodEnd: string
  paidAt?: string
  invoiceNumber?: string
}

interface Contract {
  id: string
  contractNumber: string
  description: string
  authorizedAmount: number
  executedAmount: number
  payments: Payment[]
}

function NewPaymentForm({ contracts, onClose }: { contracts: Contract[]; onClose: () => void }) {
  const qc = useQueryClient()
  const [contractId, setContractId] = useState('')
  const [form, setForm] = useState({ periodStart: '', periodEnd: '', percentComplete: '', amount: '', invoiceNumber: '', invoiceDate: '', notes: '' })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (data: Record<string, string | number>) => api.post(`/contracts/${contractId}/payments`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); onClose() },
    onError: (err: unknown) => { const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error; setError(msg || 'Error') },
  })
  function set(f: string, v: string) { setForm(p => ({ ...p, [f]: v })) }

  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate({ ...form, percentComplete: Number(form.percentComplete), amount: Number(form.amount) }) }} className="space-y-4">
      <Select
        label="Contrato"
        value={contractId}
        onChange={e => setContractId(e.target.value)}
        required
        options={contracts.map(c => ({ value: c.id, label: `${c.contractNumber} — ${c.description}` }))}
        placeholder="Seleccionar contrato..."
      />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Periodo inicio" type="date" value={form.periodStart} onChange={e => set('periodStart', e.target.value)} required />
        <Input label="Periodo fin" type="date" value={form.periodEnd} onChange={e => set('periodEnd', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="% Avance acumulado" type="number" step="0.1" min="0" max="100" value={form.percentComplete} onChange={e => set('percentComplete', e.target.value)} required />
        <Input label="Monto" type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="No. Factura" value={form.invoiceNumber} onChange={e => set('invoiceNumber', e.target.value)} />
        <Input label="Fecha factura" type="date" value={form.invoiceDate} onChange={e => set('invoiceDate', e.target.value)} />
      </div>
      <Input label="Notas" value={form.notes} onChange={e => set('notes', e.target.value)} />
      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending || !contractId}>{mutation.isPending ? 'Guardando...' : 'Registrar pago'}</Button>
      </div>
    </form>
  )
}

export function PaymentsTab({ projectId }: { projectId: string }) {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data: contracts, isLoading } = useQuery<Contract[]>({
    queryKey: ['contracts', projectId],
    queryFn: () => api.get(`/projects/${projectId}/contracts`).then(r => r.data),
  })

  const statusMutation = useMutation({
    mutationFn: ({ contractId, paymentId, action }: { contractId: string; paymentId: string; action: string }) =>
      api.post(`/contracts/${contractId}/payments/${paymentId}/${action}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts', projectId] }),
  })

  if (isLoading) return <PageSpinner />

  const contractsWithPayments = contracts?.filter(c => c.payments.length > 0) || []
  const allPayments = contracts?.flatMap(c => c.payments) || []
  const totalExecuted = contracts?.reduce((s, c) => s + c.executedAmount, 0) ?? 0
  const totalPaid = contracts?.flatMap(c => c.payments).filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0) ?? 0
  const pendingCount = allPayments.filter(p => ['draft', 'submitted'].includes(p.status)).length

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Total ejecutado</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{fmt.money(totalExecuted)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Total pagado</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{fmt.money(totalPaid)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Pendientes de autorizar</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">{allPayments.length} estimaciones / pagos</h3>
        {canUser(user?.role, 'create:payment') && (
          <Button size="sm" onClick={() => setShowForm(true)}>+ Nuevo pago</Button>
        )}
      </div>

      {/* Payments grouped by contract */}
      {contractsWithPayments.map(c => (
        <div key={c.id} className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b bg-gray-50 rounded-t-xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono text-xs text-gray-400">{c.contractNumber}</span>
                <h4 className="font-semibold text-gray-900">{c.description}</h4>
              </div>
              <div className="text-sm text-right">
                <span className="text-gray-500">Autorizado: </span>
                <span className="font-bold text-blue-700">{fmt.money(c.authorizedAmount)}</span>
                <span className="mx-2 text-gray-300">·</span>
                <span className="text-gray-500">Ejecutado: </span>
                <span className="font-medium">{fmt.money(c.executedAmount)}</span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b">
                <th className="text-left px-5 py-3 text-gray-600 font-medium">Est.</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Periodo</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">Avance</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">Monto</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Factura</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Estatus</th>
                <th className="px-4 py-3"></th>
              </tr></thead>
              <tbody>
                {c.payments.map(p => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium">{p.estimateNumber}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmt.date(p.periodStart)} – {fmt.date(p.periodEnd)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${p.percentComplete}%` }} />
                        </div>
                        <span className="text-xs">{p.percentComplete}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{fmt.money(p.amount)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.invoiceNumber || '—'}</td>
                    <td className="px-4 py-3"><Badge status={p.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {p.status === 'draft' && canUser(user?.role, 'create:payment') && (
                          <Button size="sm" variant="ghost" onClick={() => statusMutation.mutate({ contractId: c.id, paymentId: p.id, action: 'submit' })}>Enviar</Button>
                        )}
                        {p.status === 'submitted' && canUser(user?.role, 'approve:payment') && (
                          <Button size="sm" variant="ghost" onClick={() => statusMutation.mutate({ contractId: c.id, paymentId: p.id, action: 'approve' })}>Aprobar</Button>
                        )}
                        {p.status === 'approved' && canUser(user?.role, 'mark_paid:payment') && (
                          <Button size="sm" variant="ghost" onClick={() => statusMutation.mutate({ contractId: c.id, paymentId: p.id, action: 'mark-paid' })}>Pagar</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {allPayments.length === 0 && (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
          No hay pagos registrados. Créalos desde aquí o desde la pestaña de Contratos.
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Registrar pago / estimación" size="lg">
        {contracts && <NewPaymentForm contracts={contracts} onClose={() => setShowForm(false)} />}
      </Modal>
    </div>
  )
}
