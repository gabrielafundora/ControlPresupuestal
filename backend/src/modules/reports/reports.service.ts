import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/errorHandler'

export async function getProjectSummary(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      budgets: { include: { lineItems: true } },
      contracts: {
        include: {
          additives: true,
          payments: true,
        },
      },
    },
  })
  if (!project) throw new AppError(404, 'Proyecto no encontrado')

  const budget = project.budgets[0]
  const approvedTotal = budget?.lineItems.reduce((s, i) => s + i.approvedAmount, 0) ?? 0
  const budgetTotal = budget?.totalAmount ?? 0

  const contractSummary = project.contracts.map(c => {
    const authorized = c.originalAmount + c.additives.reduce((sum, a) =>
      sum + (a.type === 'additive' ? a.amount : -a.amount), 0)
    const executed = c.payments.reduce((sum, p) => sum + p.amount, 0)
    const lastPayment = c.payments.sort((a, b) => b.estimateNumber - a.estimateNumber)[0]
    return {
      contractId: c.id,
      contractNumber: c.contractNumber,
      description: c.description,
      originalAmount: c.originalAmount,
      authorizedAmount: authorized,
      executedAmount: executed,
      progressPercent: lastPayment?.percentComplete ?? 0,
    }
  })

  const totalContracted = contractSummary.reduce((s, c) => s + c.authorizedAmount, 0)
  const totalExecuted = contractSummary.reduce((s, c) => s + c.executedAmount, 0)
  const availableAmount = budgetTotal - totalContracted

  return {
    project: { id: project.id, code: project.code, name: project.name, status: project.status },
    approvedTotal,
    budgetTotal,
    totalContracted,
    totalExecuted,
    availableAmount,
    variance: budgetTotal - totalContracted,
    variancePercent: budgetTotal > 0 ? ((budgetTotal - totalContracted) / budgetTotal) * 100 : 0,
    contracts: contractSummary,
  }
}

export async function getBudgetVsActual(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      budgets: {
        include: { lineItems: { include: { adjustments: true } } },
      },
      contracts: {
        include: { additives: true, payments: true, budgetLineItem: true },
      },
    },
  })
  if (!project) throw new AppError(404, 'Proyecto no encontrado')

  const budget = project.budgets[0]
  if (!budget) return { categories: [] }

  const categories = budget.lineItems.map(item => {
    const relatedContracts = project.contracts.filter(c => c.budgetLineItemId === item.id)
    const contracted = relatedContracts.reduce((sum, c) => {
      const authorized = c.originalAmount + c.additives.reduce((s, a) =>
        s + (a.type === 'additive' ? a.amount : -a.amount), 0)
      return sum + authorized
    }, 0)
    const executed = relatedContracts.reduce((sum, c) =>
      sum + c.payments.reduce((s, p) => s + p.amount, 0), 0)

    return {
      code: item.code,
      category: item.category,
      description: item.description,
      approvedAmount: item.approvedAmount,
      budgetAmount: item.totalAmount,
      contractedAmount: contracted,
      executedAmount: executed,
      available: item.totalAmount - contracted,
      variance: item.totalAmount - contracted,
    }
  })

  return { categories }
}

export async function getDashboard() {
  const projects = await prisma.project.findMany({
    where: { status: { in: ['planning', 'active', 'on_hold'] } },
    include: {
      budgets: true,
      contracts: { include: { additives: true, payments: true } },
    },
  })

  return projects.map(p => {
    const budgetTotal = p.budgets[0]?.totalAmount ?? 0
    const totalContracted = p.contracts.reduce((sum, c) => {
      return sum + c.originalAmount + c.additives.reduce((s, a) =>
        s + (a.type === 'additive' ? a.amount : -a.amount), 0)
    }, 0)
    const totalExecuted = p.contracts.reduce((sum, c) =>
      sum + c.payments.reduce((s, pay) => s + pay.amount, 0), 0)

    return {
      id: p.id,
      code: p.code,
      name: p.name,
      status: p.status,
      budgetTotal,
      totalContracted,
      totalExecuted,
      availableAmount: budgetTotal - totalContracted,
      variance: budgetTotal - totalContracted,
      variancePercent: budgetTotal > 0 ? ((budgetTotal - totalContracted) / budgetTotal) * 100 : 0,
    }
  })
}
