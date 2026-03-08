import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/errorHandler'

export async function getProjectSummary(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      budgets: { where: { isActive: true }, include: { lineItems: true } },
      contracts: {
        include: {
          additives: true,
          payments: true,
        },
      },
    },
  })
  if (!project) throw new AppError(404, 'Proyecto no encontrado')

  const activeBudget = project.budgets[0]
  const budgetTotal = activeBudget?.totalAmount ?? 0

  const contractSummary = project.contracts.map(c => {
    const authorized = c.originalAmount + c.additives.reduce((sum, a) =>
      sum + (a.type === 'additive' ? a.amount : -a.amount), 0)
    const executed = c.payments.filter(p => ['approved', 'paid'].includes(p.status))
      .reduce((sum, p) => sum + p.amount, 0)
    const paid = c.payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
    const lastPayment = c.payments.sort((a, b) => b.estimateNumber - a.estimateNumber)[0]
    return {
      contractId: c.id,
      contractNumber: c.contractNumber,
      description: c.description,
      originalAmount: c.originalAmount,
      authorizedAmount: authorized,
      executedAmount: executed,
      paidAmount: paid,
      progressPercent: lastPayment?.percentComplete ?? 0,
    }
  })

  const totalContracted = contractSummary.reduce((s, c) => s + c.authorizedAmount, 0)
  const totalExecuted = contractSummary.reduce((s, c) => s + c.executedAmount, 0)
  const totalPaid = contractSummary.reduce((s, c) => s + c.paidAmount, 0)

  return {
    project: { id: project.id, code: project.code, name: project.name, status: project.status },
    budgetTotal,
    totalContracted,
    totalExecuted,
    totalPaid,
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
        where: { isActive: true },
        include: { lineItems: true },
      },
      contracts: {
        include: { additives: true, payments: true, budgetLineItem: true },
      },
    },
  })
  if (!project) throw new AppError(404, 'Proyecto no encontrado')

  const activeBudget = project.budgets[0]
  if (!activeBudget) return { categories: [] }

  const categories = activeBudget.lineItems.map(item => {
    const relatedContracts = project.contracts.filter(c => c.budgetLineItemId === item.id)
    const contracted = relatedContracts.reduce((sum, c) => {
      const authorized = c.originalAmount + c.additives.reduce((s, a) =>
        s + (a.type === 'additive' ? a.amount : -a.amount), 0)
      return sum + authorized
    }, 0)
    const executed = relatedContracts.reduce((sum, c) =>
      sum + c.payments.filter(p => ['approved', 'paid'].includes(p.status))
        .reduce((s, p) => s + p.amount, 0), 0)

    return {
      code: item.code,
      category: item.category,
      description: item.description,
      budgetAmount: item.totalAmount,
      contractedAmount: contracted,
      executedAmount: executed,
      variance: item.totalAmount - contracted,
    }
  })

  return { categories }
}

export async function getDashboard() {
  const projects = await prisma.project.findMany({
    where: { status: { in: ['planning', 'active', 'on_hold'] } },
    include: {
      budgets: { where: { isActive: true } },
      contracts: { include: { additives: true, payments: { where: { status: { in: ['approved', 'paid'] } } } } },
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
      variance: budgetTotal - totalContracted,
      variancePercent: budgetTotal > 0 ? ((budgetTotal - totalContracted) / budgetTotal) * 100 : 0,
    }
  })
}
