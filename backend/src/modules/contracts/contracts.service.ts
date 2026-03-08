import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/errorHandler'

export const createContractSchema = z.object({
  budgetLineItemId: z.string().optional(),
  providerId: z.string().min(1, 'Proveedor requerido'),
  contractNumber: z.string().min(1, 'Número de contrato requerido'),
  description: z.string().min(1),
  originalAmount: z.number().positive('Monto debe ser positivo'),
  currency: z.string().default('MXN'),
  signedAt: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
})

export const updateContractSchema = createContractSchema.partial()

function calcAuthorized(contract: { originalAmount: number; additives: Array<{ type: string; amount: number }> }) {
  const additivesTotal = contract.additives.reduce((sum, a) => {
    return sum + (a.type === 'additive' ? a.amount : -a.amount)
  }, 0)
  return contract.originalAmount + additivesTotal
}

export async function getByProject(projectId: string) {
  const contracts = await prisma.contract.findMany({
    where: { projectId },
    include: {
      provider: true,
      budgetLineItem: true,
      additives: true,
      payments: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return contracts.map(c => ({
    ...c,
    authorizedAmount: calcAuthorized(c),
    executedAmount: c.payments
      .filter(p => ['approved', 'paid'].includes(p.status))
      .reduce((sum, p) => sum + p.amount, 0),
  }))
}

export async function getById(projectId: string, id: string) {
  const contract = await prisma.contract.findFirst({
    where: { id, projectId },
    include: { provider: true, budgetLineItem: true, additives: { orderBy: { number: 'asc' } }, payments: { orderBy: { estimateNumber: 'asc' } } },
  })
  if (!contract) throw new AppError(404, 'Contrato no encontrado')
  return { ...contract, authorizedAmount: calcAuthorized(contract) }
}

export async function create(projectId: string, data: z.infer<typeof createContractSchema>) {
  return prisma.contract.create({
    data: {
      projectId,
      providerId: data.providerId,
      budgetLineItemId: data.budgetLineItemId,
      contractNumber: data.contractNumber,
      description: data.description,
      originalAmount: data.originalAmount,
      currency: data.currency,
      signedAt: data.signedAt ? new Date(data.signedAt) : undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      notes: data.notes,
    },
    include: { provider: true },
  })
}

export async function update(projectId: string, id: string, data: z.infer<typeof updateContractSchema>) {
  const contract = await prisma.contract.findFirst({ where: { id, projectId } })
  if (!contract) throw new AppError(404, 'Contrato no encontrado')
  return prisma.contract.update({
    where: { id },
    data: {
      ...data,
      signedAt: data.signedAt ? new Date(data.signedAt) : undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
    include: { provider: true },
  })
}
