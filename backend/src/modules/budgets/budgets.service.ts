import { z } from 'zod'
import { randomUUID } from 'crypto'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/errorHandler'

export const createBudgetSchema = z.object({
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

export const aditivaSchema = z.object({
  lineItemId: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().min(1),
  approvedAt: z.string().optional(),
  approvedBy: z.string().optional(),
})

export const rebalanceoSchema = z.object({
  fromLineItemId: z.string().min(1),
  toLineItemId: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().min(1),
})

async function recalcBudgetTotal(budgetId: string) {
  const items = await prisma.budgetLineItem.findMany({ where: { budgetId } })
  const total = items.reduce((sum, i) => sum + i.totalAmount, 0)
  await prisma.budget.update({ where: { id: budgetId }, data: { totalAmount: total } })
}

async function recalcLineItemTotal(lineItemId: string) {
  const item = await prisma.budgetLineItem.findUnique({
    where: { id: lineItemId },
    include: { adjustments: true },
  })
  if (!item) return
  const netAdjustments = item.adjustments.reduce((sum, a) => sum + a.amount, 0)
  const totalAmount = item.approvedAmount + netAdjustments
  await prisma.budgetLineItem.update({ where: { id: lineItemId }, data: { totalAmount } })
  await recalcBudgetTotal(item.budgetId)
}

export async function getByProject(projectId: string) {
  return prisma.budget.findUnique({
    where: { projectId },
    include: {
      lineItems: {
        orderBy: { code: 'asc' },
        include: { adjustments: { orderBy: { createdAt: 'asc' } } },
      },
    },
  })
}

export async function getById(projectId: string, id: string) {
  const budget = await prisma.budget.findFirst({
    where: { id, projectId },
    include: {
      lineItems: {
        orderBy: { code: 'asc' },
        include: { adjustments: { orderBy: { createdAt: 'asc' } } },
      },
    },
  })
  if (!budget) throw new AppError(404, 'Presupuesto no encontrado')
  return budget
}

export async function create(projectId: string, data: z.infer<typeof createBudgetSchema>, approvedBy: string) {
  const existing = await prisma.budget.findUnique({ where: { projectId } })
  if (existing) throw new AppError(409, 'El proyecto ya tiene un presupuesto')
  return prisma.budget.create({
    data: {
      projectId,
      notes: data.notes,
      approvedAt: data.approvedAt ? new Date(data.approvedAt) : undefined,
      approvedBy: data.approvedBy || approvedBy,
    },
  })
}

export async function createLineItem(budgetId: string, data: z.infer<typeof lineItemSchema>) {
  const approvedAmount = data.quantity * data.unitPrice
  const item = await prisma.budgetLineItem.create({
    data: { budgetId, ...data, approvedAmount, totalAmount: approvedAmount },
  })
  await recalcBudgetTotal(budgetId)
  return item
}

export async function updateLineItem(budgetId: string, itemId: string, data: z.infer<typeof updateLineItemSchema>) {
  const current = await prisma.budgetLineItem.findFirst({ where: { id: itemId, budgetId } })
  if (!current) throw new AppError(404, 'Partida no encontrada')
  const quantity = data.quantity ?? current.quantity
  const unitPrice = data.unitPrice ?? current.unitPrice
  const approvedAmount = quantity * unitPrice
  // Recalculate totalAmount preserving existing adjustments
  const adjustments = await prisma.budgetAdjustment.findMany({ where: { lineItemId: itemId } })
  const netAdjustments = adjustments.reduce((sum, a) => sum + a.amount, 0)
  const totalAmount = approvedAmount + netAdjustments
  const item = await prisma.budgetLineItem.update({
    where: { id: itemId },
    data: { ...data, approvedAmount, totalAmount },
  })
  await recalcBudgetTotal(budgetId)
  return item
}

export async function deleteLineItem(budgetId: string, itemId: string) {
  await prisma.budgetAdjustment.deleteMany({ where: { lineItemId: itemId } })
  await prisma.budgetLineItem.delete({ where: { id: itemId } })
  await recalcBudgetTotal(budgetId)
}

export async function createAditiva(budgetId: string, data: z.infer<typeof aditivaSchema>) {
  // Verify lineItem belongs to this budget
  const item = await prisma.budgetLineItem.findFirst({ where: { id: data.lineItemId, budgetId } })
  if (!item) throw new AppError(404, 'Partida no encontrada en este presupuesto')

  const adjustment = await prisma.budgetAdjustment.create({
    data: {
      lineItemId: data.lineItemId,
      type: 'aditiva',
      amount: data.amount,
      description: data.description,
      approvedAt: data.approvedAt ? new Date(data.approvedAt) : undefined,
      approvedBy: data.approvedBy,
    },
  })
  await recalcLineItemTotal(data.lineItemId)
  return adjustment
}

export async function createRebalanceo(budgetId: string, data: z.infer<typeof rebalanceoSchema>) {
  if (data.fromLineItemId === data.toLineItemId) {
    throw new AppError(422, 'La partida origen y destino no pueden ser la misma')
  }
  const [fromItem, toItem] = await Promise.all([
    prisma.budgetLineItem.findFirst({ where: { id: data.fromLineItemId, budgetId } }),
    prisma.budgetLineItem.findFirst({ where: { id: data.toLineItemId, budgetId } }),
  ])
  if (!fromItem) throw new AppError(404, 'Partida origen no encontrada')
  if (!toItem) throw new AppError(404, 'Partida destino no encontrada')

  const groupId = randomUUID()

  await prisma.budgetAdjustment.createMany({
    data: [
      { lineItemId: data.fromLineItemId, type: 'rebalanceo', amount: -data.amount, groupId, description: data.description },
      { lineItemId: data.toLineItemId, type: 'rebalanceo', amount: data.amount, groupId, description: data.description },
    ],
  })
  await recalcLineItemTotal(data.fromLineItemId)
  await recalcLineItemTotal(data.toLineItemId)

  return { groupId, fromLineItemId: data.fromLineItemId, toLineItemId: data.toLineItemId, amount: data.amount }
}
