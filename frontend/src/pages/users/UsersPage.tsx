import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { PageSpinner } from '../../components/ui/Spinner'
import { fmt } from '../../lib/formatters'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'director', label: 'Director de obra' },
  { value: 'contador', label: 'Contador' },
  { value: 'readonly', label: 'Solo lectura' },
]

const ROLE_LABELS: Record<string, string> = { admin: 'Administrador', director: 'Director de obra', contador: 'Contador', readonly: 'Solo lectura' }

interface User { id: string; name: string; email: string; role: string; active: boolean; createdAt: string }

function UserForm({ user, onClose }: { user?: User; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', role: user?.role || 'readonly', password: '' })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (data: typeof form) => {
      const payload = { ...data, ...(data.password ? {} : { password: undefined }) }
      return user ? api.patch(`/users/${user.id}`, payload) : api.post('/users', payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose() },
    onError: (err: unknown) => { const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error; setError(msg || 'Error') },
  })
  function set(f: string, v: string) { setForm(p => ({ ...p, [f]: v })) }
  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <Input label="Nombre completo" value={form.name} onChange={e => set('name', e.target.value)} required />
      <Input label="Correo electrónico" type="email" value={form.email} onChange={e => set('email', e.target.value)} required disabled={!!user} />
      <Select label="Rol" value={form.role} onChange={e => set('role', e.target.value)} options={ROLE_OPTIONS} />
      <Input label={user ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'} type="password" value={form.password} onChange={e => set('password', e.target.value)} required={!user} placeholder="Mínimo 8 caracteres" />
      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando...' : user ? 'Guardar' : 'Crear usuario'}</Button>
      </div>
    </form>
  )
}

export function UsersPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  })

  const toggleActive = useMutation({
    mutationFn: (u: User) => api.patch(`/users/${u.id}`, { active: !u.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  if (isLoading) return <PageSpinner />

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500 mt-1">Gestión de accesos y roles</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Nuevo usuario</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-gray-50">
            <th className="text-left px-6 py-3 text-gray-600 font-medium">Usuario</th>
            <th className="text-left px-4 py-3 text-gray-600 font-medium">Rol</th>
            <th className="text-left px-4 py-3 text-gray-600 font-medium">Estatus</th>
            <th className="text-left px-4 py-3 text-gray-600 font-medium">Creado</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {users?.map(u => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-gray-400">{u.email}</div>
                </td>
                <td className="px-4 py-4">{ROLE_LABELS[u.role] || u.role}</td>
                <td className="px-4 py-4"><Badge status={u.active ? 'active' : 'cancelled'} /></td>
                <td className="px-4 py-4 text-gray-500">{fmt.date(u.createdAt)}</td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActive.mutate(u)}>
                      {u.active ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo usuario">
        <UserForm onClose={() => setShowForm(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar usuario">
        {editing && <UserForm user={editing} onClose={() => setEditing(null)} />}
      </Modal>
    </div>
  )
}
