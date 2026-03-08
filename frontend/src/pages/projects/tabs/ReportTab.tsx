import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { api } from '../../../api/client'
import { PageSpinner } from '../../../components/ui/Spinner'
import { fmt } from '../../../lib/formatters'

interface BvaCategory {
  code: string
  category: string
  description: string
  approvedAmount: number
  budgetAmount: number
  contractedAmount: number
  executedAmount: number
  available: number
  variance: number
}

const MXN = (v: number) => fmt.money(v)

export function ReportTab({ projectId }: { projectId: string }) {
  const { data: summary, isLoading: s } = useQuery({
    queryKey: ['report', projectId, 'summary'],
    queryFn: () => api.get(`/reports/projects/${projectId}/summary`).then(r => r.data),
  })

  const { data: bva, isLoading: b } = useQuery({
    queryKey: ['report', projectId, 'bva'],
    queryFn: () => api.get(`/reports/projects/${projectId}/budget-vs-actual`).then(r => r.data),
  })

  if (s || b) return <PageSpinner />

  const chartData = bva?.categories?.map((c: BvaCategory) => ({
    name: c.category.length > 12 ? c.category.slice(0, 12) + '…' : c.category,
    Aprobado: Math.round(c.approvedAmount),
    Actualizado: Math.round(c.budgetAmount),
    Contratado: Math.round(c.contractedAmount),
    Ejecutado: Math.round(c.executedAmount),
  })) ?? []

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Presupuesto aprobado', value: MXN(summary?.approvedTotal ?? 0), color: 'text-gray-700' },
          { label: 'Presupuesto actualizado', value: MXN(summary?.budgetTotal ?? 0), color: 'text-blue-700' },
          { label: 'Total contratado', value: MXN(summary?.totalContracted ?? 0), color: 'text-indigo-700' },
          { label: 'Total ejecutado', value: MXN(summary?.totalExecuted ?? 0), color: 'text-green-700' },
          { label: 'Disponible', value: MXN(summary?.availableAmount ?? 0), color: (summary?.availableAmount ?? 0) >= 0 ? 'text-green-700' : 'text-red-700' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{k.label}</p>
            <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-6">Presupuesto vs Contratado vs Ejecutado por partida</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `$${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => MXN(v)} />
              <Legend />
              <Bar dataKey="Aprobado" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Actualizado" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Contratado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Ejecutado" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detail table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b">
          <h3 className="font-semibold text-gray-900">Detalle por partida</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-gray-50">
              <th className="text-left px-5 py-3 text-gray-600 font-medium">Partida</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">Aprobado</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">Actualizado</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">Contratado</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">Ejecutado</th>
              <th className="text-right px-5 py-3 text-gray-600 font-medium">Disponible</th>
            </tr></thead>
            <tbody>
              {bva?.categories?.map((c: BvaCategory) => (
                <tr key={c.code} className="border-b hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="text-xs font-mono text-gray-400">{c.code}</div>
                    <div className="font-medium text-gray-900">{c.category}</div>
                    <div className="text-xs text-gray-500">{c.description}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{MXN(c.approvedAmount)}</td>
                  <td className="px-4 py-3 text-right">{MXN(c.budgetAmount)}</td>
                  <td className="px-4 py-3 text-right">{MXN(c.contractedAmount)}</td>
                  <td className="px-4 py-3 text-right">{MXN(c.executedAmount)}</td>
                  <td className={`px-5 py-3 text-right font-semibold ${c.available >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {MXN(c.available)}
                    {c.budgetAmount > 0 && <div className="text-xs font-normal">{((c.available / c.budgetAmount) * 100).toFixed(1)}%</div>}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-5 py-3">TOTAL</td>
                <td className="px-4 py-3 text-right text-gray-500">{MXN(summary?.approvedTotal ?? 0)}</td>
                <td className="px-4 py-3 text-right">{MXN(summary?.budgetTotal ?? 0)}</td>
                <td className="px-4 py-3 text-right">{MXN(summary?.totalContracted ?? 0)}</td>
                <td className="px-4 py-3 text-right">{MXN(summary?.totalExecuted ?? 0)}</td>
                <td className={`px-5 py-3 text-right ${(summary?.availableAmount ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{MXN(summary?.availableAmount ?? 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
