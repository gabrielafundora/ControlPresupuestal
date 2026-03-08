import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/errorHandler'

export const createBudgetSchema = z.object({
  label: z.string().optional(),
  notes: z.string().optional(),
  approvedAt: z.string().optional(),
  approvedBy: z.string().optional(),
})

export const lineItemSchema = z.object({
  code: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
})

export const updateLineItemSchema = lineItemSchema.partial()

async function recalcTotal(budgetId: string) {
  const items = await prisma.budgetLineItem.findMany({ where: { budgetId } })
  const total = items.reduce((sum, i) => sum + i.totalAmount, 0)
  await prisma.budget.update({ where: { id: budgetId }, data: { totalAmount: total } })
}

export async function getByProject(projectId: string) {
  return prisma.budget.findMany({
    where: { projectId },
    include: { _count: { select: { lineItems: true } } },
    orderBy: { version: 'desc' },
  })
}

export async function getById(projectId: string, id: string) {
  const budget = await prisma.budget.findFirst({
    where: { id, projectId },
    include: { lineItems: { orderBy: { code: 'asc' } } },
  })
  if (!budget) throw new AppError(404, 'Presupuesto no encontrado')
  return budget
}

export async function create(projectId: string, data: z.infer<typeof createBudgetSchema>, approvedBy: string) {
  const last = await prisma.budget.findFirst({ where: { projectId }, orderBy: { version: 'desc' } })
  const version = (last?.version ?? 0) + 1
  return prisma.budget.create({
    data: {
      projectId,
      version,
      label: data.label || `Versión ${version}`,
      notes: data.notes,
      approvedAt: data.approvedAt ? new Date(data.approvedAt) : undefined,
      approvedBy: data.approvedBy || approvedBy,
    },
  })
}

export async function activate(projectId: string, id: string) {
  await prisma.budget.updateMany({ where: { projectId }, data: { isActive: false } })
  return prisma.budget.update({ where: { id }, data: { isActive: true } })
}

export async function createLineItem(budgetId: string, data: z.infer<typeof lineItemSchema>) {
  const totalAmount = data.quantity * data.unitPrice
  const item = await prisma.budgetLineItem.create({
    data: { budgetId, ...data, totalAmount },
  })
  await recalcTotal(budgetId)
  return item
}

export async function updateLineItem(budgetId: string, itemId: string, data: z.infer<typeof updateLineItemSchema>) {
  const current = await prisma.budgetLineItem.findFirst({ where: { id: itemId, budgetId } })
  if (!current) throw new AppError(404, 'Partida no encontrada')
  const quantity = data.quantity ?? current.quantity
  const unitPrice = data.unitPrice ?? current.unitPrice
  const totalAmount = quantity * unitPrice
  const item = await prisma.budgetLineItem.update({
    where: { id: itemId },
    data: { ...data, totalAmount },
  })
  await recalcTotal(budgetId)
  return item
}

export async function deleteLineItem(budgetId: string, itemId: string) {
  await prisma.budgetLineItem.delete({ where: { id: itemId } })
  await recalcTotal(budgetId)
}
