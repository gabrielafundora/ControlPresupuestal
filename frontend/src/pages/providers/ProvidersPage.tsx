import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { PageSpinner } from '../../components/ui/Spinner'
import { useAuthStore } from '../../store/authStore'
import { canUser } from '../../lib/permissions'

interface Provider { id: string; name: string; rfc?: string; contact?: string; email?: string; phone?: string }

function ProviderForm({ provider, onClose }: { provider?: Provider; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: provider?.name || '', rfc: provider?.rfc || '', contact: provider?.contact || '', email: provider?.email || '', phone: provider?.phone || '' })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (data: typeof form) => provider ? api.patch(`/providers/${provider.id}`, data) : api.post('/providers', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['providers'] }); onClose() },
    onError: (err: unknown) => { const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error; setError(msg || 'Error') },
  })
  function set(f: string, v: string) { setForm(p => ({ ...p, [f]: v })) }
  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <Input label="Nombre / Razón social" value={form.name} onChange={e => set('name', e.target.value)} required />
      <Input label="RFC" value={form.rfc} onChange={e => set('rfc', e.target.value)} />
      <Input label="Contacto" value={form.contact} onChange={e => set('contact', e.target.value)} />
      <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
      <Input label="Teléfono" value={form.phone} onChange={e => set('phone', e.target.value)} />
      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando...' : provider ? 'Guardar' : 'Crear proveedor'}</Button>
      </div>
    </form>
  )
}

export function ProvidersPage() {
  const { user } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Provider | null>(null)

  const { data: providers, isLoading } = useQuery<Provider[]>({
    queryKey: ['providers'],
    queryFn: () => api.get('/providers').then(r => r.data),
  })

  if (isLoading) return <PageSpinner />

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
          <p className="text-gray-500 mt-1">{providers?.length ?? 0} proveedores registrados</p>
        </div>
        {canUser(user?.role, 'create:contract') && (
          <Button onClick={() => setShowForm(true)}>+ Nuevo proveedor</Button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-gray-50">
            <th className="text-left px-6 py-3 text-gray-600 font-medium">Nombre</th>
            <th className="text-left px-4 py-3 text-gray-600 font-medium">RFC</th>
            <th className="text-left px-4 py-3 text-gray-600 font-medium">Contacto</th>
            <th className="text-left px-4 py-3 text-gray-600 font-medium">Email</th>
            <th className="text-left px-4 py-3 text-gray-600 font-medium">Teléfono</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {providers?.map(p => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{p.name}</td>
                <td className="px-4 py-4 font-mono text-xs text-gray-500">{p.rfc || '—'}</td>
                <td className="px-4 py-4">{p.contact || '—'}</td>
                <td className="px-4 py-4 text-blue-600">{p.email || '—'}</td>
                <td className="px-4 py-4">{p.phone || '—'}</td>
                <td className="px-4 py-4">
                  {canUser(user?.role, 'create:contract') && (
                    <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Editar</Button>
                  )}
                </td>
              </tr>
            ))}
            {(!providers || providers.length === 0) && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Sin proveedores registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo proveedor">
        <ProviderForm onClose={() => setShowForm(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar proveedor">
        {editing && <ProviderForm provider={editing} onClose={() => setEditing(null)} />}
      </Modal>
    </div>
  )
}
