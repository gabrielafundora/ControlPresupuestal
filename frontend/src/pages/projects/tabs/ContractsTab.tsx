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

interface Provider { id: string; name: string }
interface Contract {
  id: string; contractNumber: string; description: string; originalAmount: number; authorizedAmount: number; executedAmount: number;
  provider: Provider; startDate?: string; endDate?: string;
  additives: Array<{ id: string; type: string; number: number; description: string; amount: number; approvedAt?: string }>;
  payments: Array<{ id: string; estimateNumber: number; amount: number; status: string; percentComplete: number; periodStart: string; periodEnd: string; paidAt?: string }>;
}

function AdditiveForm({ contractId, onClose }: { contractId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ type: 'additive', description: '', amount: '', approvedAt: '' })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (data: Record<string, string | number>) => api.post(`/contracts/${contractId}/additives`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); onClose() },
    onError: (err: unknown) => { const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error; setError(msg || 'Error') },
  })
  function set(f: string, v: string) { setForm(p => ({ ...p, [f]: v })) }
  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate({ ...form, amount: Number(form.amount) }) }} className="space-y-4">
      <Select label="Tipo" value={form.type} onChange={e => set('type', e.target.value)} options={[{ value: 'additive', label: 'Aditiva (incremento)' }, { value: 'deductive', label: 'Deductiva (reducción)' }]} />
      <Input label="Descripción" value={form.description} onChange={e => set('description', e.target.value)} required />
      <Input label="Monto" type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} required />
      <Input label="Fecha de aprobación" type="date" value={form.approvedAt} onChange={e => set('approvedAt', e.target.value)} />
      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando...' : 'Registrar'}</Button>
      </div>
    </form>
  )
}

function PaymentForm({ contractId, onClose }: { contractId: string; onClose: () => void }) {
  const qc = useQueryClient()
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
      <div className="grid grid-cols-2 gap-4">
        <Input label="Periodo inicio" type="date" value={form.periodStart} onChange={e => set('periodStart', e.target.value)} required />
        <Input label="Periodo fin" type="date" value={form.periodEnd} onChange={e => set('periodEnd', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="% Avance acumulado" type="number" step="0.1" min="0" max="100" value={form.percentComplete} onChange={e => set('percentComplete', e.target.value)} required />
        <Input label="Monto de la estimación" type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="No. Factura" value={form.invoiceNumber} onChange={e => set('invoiceNumber', e.target.value)} />
        <Input label="Fecha factura" type="date" value={form.invoiceDate} onChange={e => set('invoiceDate', e.target.value)} />
      </div>
      <Input label="Notas" value={form.notes} onChange={e => set('notes', e.target.value)} />
      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando...' : 'Registrar estimación'}</Button>
      </div>
    </form>
  )
}

function ContractDetail({ contract, onClose }: { contract: Contract; onClose: () => void }) {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [showAdditive, setShowAdditive] = useState(false)
  const [showPayment, setShowPayment] = useState(false)

  const statusMutation = useMutation({
    mutationFn: ({ paymentId, action }: { paymentId: string; action: string }) =>
      api.post(`/contracts/${contract.id}/payments/${paymentId}/${action}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-gray-500">Proveedor:</span> <span className="font-medium">{contract.provider.name}</span></div>
        <div><span className="text-gray-500">Monto original:</span> <span className="font-medium">{fmt.money(contract.originalAmount)}</span></div>
        <div><span className="text-gray-500">Monto autorizado:</span> <span className="font-bold text-blue-700">{fmt.money(contract.authorizedAmount)}</span></div>
        <div><span className="text-gray-500">Ejecutado:</span> <span className="font-medium">{fmt.money(contract.executedAmount)}</span></div>
        <div><span className="text-gray-500">Inicio:</span> <span className="font-medium">{fmt.date(contract.startDate)}</span></div>
        <div><span className="text-gray-500">Fin:</span> <span className="font-medium">{fmt.date(contract.endDate)}</span></div>
      </div>

      {/* Additives */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900">Aditivas / Deductivas</h4>
          {canUser(user?.role, 'create:additive') && (
            <Button size="sm" onClick={() => setShowAdditive(true)}>+ Agregar</Button>
          )}
        </div>
        {contract.additives.length === 0 ? (
          <p className="text-sm text-gray-400">Sin aditivas registradas</p>
        ) : (
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead><tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-2 text-gray-600 font-medium">#</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Tipo</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Descripción</th>
              <th className="text-right px-4 py-2 text-gray-600 font-medium">Monto</th>
              <th className="text-right px-4 py-2 text-gray-600 font-medium">Aprobado</th>
            </tr></thead>
            <tbody>
              {contract.additives.map(a => (
                <tr key={a.id} className="border-b">
                  <td className="px-4 py-2">{a.number}</td>
                  <td className="px-4 py-2"><Badge status={a.type} /></td>
                  <td className="px-4 py-2">{a.description}</td>
                  <td className={`px-4 py-2 text-right font-medium ${a.type === 'additive' ? 'text-green-600' : 'text-red-600'}`}>
                    {a.type === 'deductive' ? '-' : '+'}{fmt.money(a.amount)}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-500">{fmt.date(a.approvedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Payments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900">Estimaciones / Pagos</h4>
          {canUser(user?.role, 'create:payment') && (
            <Button size="sm" onClick={() => setShowPayment(true)}>+ Nueva estimación</Button>
          )}
        </div>
        {contract.payments.length === 0 ? (
          <p className="text-sm text-gray-400">Sin estimaciones registradas</p>
        ) : (
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead><tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Est.</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Periodo</th>
              <th className="text-right px-4 py-2 text-gray-600 font-medium">Avance</th>
              <th className="text-right px-4 py-2 text-gray-600 font-medium">Monto</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Estatus</th>
              <th className="px-4 py-2"></th>
            </tr></thead>
            <tbody>
              {contract.payments.map(p => (
                <tr key={p.id} className="border-b">
                  <td className="px-4 py-2 font-medium">{p.estimateNumber}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{fmt.date(p.periodStart)} - {fmt.date(p.periodEnd)}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${p.percentComplete}%` }} />
                      </div>
                      <span className="text-xs">{p.percentComplete}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right font-medium">{fmt.money(p.amount)}</td>
                  <td className="px-4 py-2"><Badge status={p.status} /></td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      {p.status === 'draft' && canUser(user?.role, 'create:payment') && (
                        <Button size="sm" variant="ghost" onClick={() => statusMutation.mutate({ paymentId: p.id, action: 'submit' })}>Enviar</Button>
                      )}
                      {p.status === 'submitted' && canUser(user?.role, 'approve:payment') && (
                        <Button size="sm" variant="ghost" onClick={() => statusMutation.mutate({ paymentId: p.id, action: 'approve' })}>Aprobar</Button>
                      )}
                      {p.status === 'approved' && canUser(user?.role, 'mark_paid:payment') && (
                        <Button size="sm" variant="ghost" onClick={() => statusMutation.mutate({ paymentId: p.id, action: 'mark-paid' })}>Pagar</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showAdditive} onClose={() => setShowAdditive(false)} title="Nueva aditiva / deductiva">
        <AdditiveForm contractId={contract.id} onClose={() => setShowAdditive(false)} />
      </Modal>
      <Modal open={showPayment} onClose={() => setShowPayment(false)} title="Registrar estimación" size="lg">
        <PaymentForm contractId={contract.id} onClose={() => setShowPayment(false)} />
      </Modal>
    </div>
  )
}

function ContractForm({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: providers } = useQuery<Provider[]>({ queryKey: ['providers'], queryFn: () => api.get('/providers').then(r => r.data) })
  const [form, setForm] = useState({ providerId: '', contractNumber: '', description: '', originalAmount: '', startDate: '', endDate: '', notes: '' })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (data: Record<string, string | number>) => api.post(`/projects/${projectId}/contracts`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts', projectId] }); onClose() },
    onError: (err: unknown) => { const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error; setError(msg || 'Error') },
  })
  function set(f: string, v: string) { setForm(p => ({ ...p, [f]: v })) }
  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate({ ...form, originalAmount: Number(form.originalAmount) }) }} className="space-y-4">
      <Select label="Proveedor" value={form.providerId} onChange={e => set('providerId', e.target.value)} required options={providers?.map(p => ({ value: p.id, label: p.name })) || []} placeholder="Seleccionar proveedor..." />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Número de contrato" value={form.contractNumber} onChange={e => set('contractNumber', e.target.value)} required placeholder="CON-2024-001" />
        <Input label="Monto original" type="number" step="0.01" value={form.originalAmount} onChange={e => set('originalAmount', e.target.value)} required />
      </div>
      <Input label="Descripción" value={form.description} onChange={e => set('description', e.target.value)} required />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Fecha inicio" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        <Input label="Fecha fin" type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
      </div>
      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando...' : 'Crear contrato'}</Button>
      </div>
    </form>
  )
}

export function ContractsTab({ projectId }: { projectId: string }) {
  const { user } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Contract | null>(null)

  const { data: contracts, isLoading } = useQuery<Contract[]>({
    queryKey: ['contracts', projectId],
    queryFn: () => api.get(`/projects/${projectId}/contracts`).then(r => r.data),
  })

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">{contracts?.length ?? 0} contratos</h3>
        {canUser(user?.role, 'create:contract') && (
          <Button size="sm" onClick={() => setShowForm(true)}>+ Nuevo contrato</Button>
        )}
      </div>

      <div className="space-y-3">
        {contracts?.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-200 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-400">{c.contractNumber}</span>
                </div>
                <h4 className="font-semibold text-gray-900 mt-0.5">{c.description}</h4>
                <p className="text-sm text-gray-500">{c.provider.name}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setSelected(c)}>Ver detalle</Button>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100 text-sm">
              <div>
                <div className="text-gray-500">Original</div>
                <div className="font-medium">{fmt.money(c.originalAmount)}</div>
              </div>
              <div>
                <div className="text-gray-500">Autorizado</div>
                <div className="font-bold text-blue-700">{fmt.money(c.authorizedAmount)}</div>
              </div>
              <div>
                <div className="text-gray-500">Ejecutado</div>
                <div className="font-medium">{fmt.money(c.executedAmount)}</div>
              </div>
            </div>
            {c.additives.length > 0 && (
              <div className="mt-2 text-xs text-gray-400">
                {c.additives.length} aditiva(s) · {c.payments.length} estimación(es)
              </div>
            )}
          </div>
        ))}
        {(!contracts || contracts.length === 0) && (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
            No hay contratos registrados
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo contrato" size="lg">
        <ContractForm projectId={projectId} onClose={() => setShowForm(false)} />
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.contractNumber} — ${selected.description}` : ''} size="xl">
        {selected && <ContractDetail contract={selected} onClose={() => setSelected(null)} />}
      </Modal>
    </div>
  )
}
