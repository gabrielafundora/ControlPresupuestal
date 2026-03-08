import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { KpiCard } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { PageSpinner } from '../../components/ui/Spinner'
import { fmt } from '../../lib/formatters'
import { Link } from 'react-router-dom'

interface ProjectSummary {
  id: string
  code: string
  name: string
  status: string
  budgetTotal: number
  totalContracted: number
  totalExecuted: number
  variance: number
  variancePercent: number
}

export function DashboardPage() {
  const { data: projects, isLoading } = useQuery<ProjectSummary[]>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/reports/dashboard').then(r => r.data),
  })

  if (isLoading) return <PageSpinner />

  const totals = projects?.reduce((acc, p) => ({
    budget: acc.budget + p.budgetTotal,
    contracted: acc.contracted + p.totalContracted,
    executed: acc.executed + p.totalExecuted,
  }), { budget: 0, contracted: 0, executed: 0 }) ?? { budget: 0, contracted: 0, executed: 0 }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Resumen general de proyectos activos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Proyectos activos" value={String(projects?.length ?? 0)} color="blue" />
        <KpiCard label="Presupuesto total" value={fmt.money(totals.budget)} color="gray" />
        <KpiCard label="Total contratado" value={fmt.money(totals.contracted)} sub={totals.budget > 0 ? `${((totals.contracted / totals.budget) * 100).toFixed(1)}% del presupuesto` : undefined} color="blue" />
        <KpiCard label="Total ejecutado" value={fmt.money(totals.executed)} sub={totals.contracted > 0 ? `${((totals.executed / totals.contracted) * 100).toFixed(1)}% de lo contratado` : undefined} color="green" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b">
          <h2 className="font-semibold text-gray-900">Proyectos en curso</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-6 py-3 text-gray-600 font-medium">Proyecto</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Estatus</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">Presupuesto</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">Contratado</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">Ejecutado</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">Varianza</th>
              </tr>
            </thead>
            <tbody>
              {projects?.map(p => (
                <tr key={p.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link to={`/projects/${p.id}`} className="hover:text-blue-600">
                      <div className="font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.code}</div>
                    </Link>
                  </td>
                  <td className="px-4 py-4"><Badge status={p.status} /></td>
                  <td className="px-4 py-4 text-right text-gray-700">{fmt.money(p.budgetTotal)}</td>
                  <td className="px-4 py-4 text-right text-gray-700">{fmt.money(p.totalContracted)}</td>
                  <td className="px-4 py-4 text-right text-gray-700">{fmt.money(p.totalExecuted)}</td>
                  <td className={`px-4 py-4 text-right font-medium ${p.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmt.money(p.variance)}
                    <div className="text-xs font-normal">{p.variancePercent.toFixed(1)}%</div>
                  </td>
                </tr>
              ))}
              {(!projects || projects.length === 0) && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No hay proyectos activos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
