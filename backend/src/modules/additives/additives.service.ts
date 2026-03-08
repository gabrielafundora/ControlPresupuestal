import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/errorHandler'

export const createAdditiveSchema = z.object({
  type: z.enum(['additive', 'deductive']),
  description: z.string().min(1),
  amount: z.number().positive(),
  approvedAt: z.string().optional(),
  notes: z.string().optional(),
})

export async function getByContract(contractId: string) {
  return prisma.additive.findMany({
    where: { contractId },
    orderBy: { number: 'asc' },
  })
}

export async function create(contractId: string, data: z.infer<typeof createAdditiveSchema>) {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } })
  if (!contract) throw new AppError(404, 'Contrato no encontrado')

  const last = await prisma.additive.findFirst({ where: { contractId }, orderBy: { number: 'desc' } })
  const number = (last?.number ?? 0) + 1

  return prisma.additive.create({
    data: {
      contractId,
      type: data.type,
      number,
      description: data.description,
      amount: data.amount,
      approvedAt: data.approvedAt ? new Date(data.approvedAt) : undefined,
      notes: data.notes,
    },
  })
}

export async function update(contractId: string, id: string, data: Partial<z.infer<typeof createAdditiveSchema>>) {
  const additive = await prisma.additive.findFirst({ where: { id, contractId } })
  if (!additive) throw new AppError(404, 'Aditiva no encontrada')
  return prisma.additive.update({
    where: { id },
    data: {
      ...data,
      approvedAt: data.approvedAt ? new Date(data.approvedAt) : undefined,
    },
  })
}
