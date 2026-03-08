import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/errorHandler'

export const createPaymentSchema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
  percentComplete: z.number().min(0).max(100),
  amount: z.number().positive(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  notes: z.string().optional(),
})

export async function getByContract(contractId: string) {
  return prisma.payment.findMany({
    where: { contractId },
    include: { submittedBy: { select: { name: true, email: true } } },
    orderBy: { estimateNumber: 'asc' },
  })
}

export async function getById(contractId: string, id: string) {
  const payment = await prisma.payment.findFirst({
    where: { id, contractId },
    include: { submittedBy: { select: { name: true, email: true } } },
  })
  if (!payment) throw new AppError(404, 'Estimación no encontrada')
  return payment
}

export async function create(contractId: string, userId: string, data: z.infer<typeof createPaymentSchema>) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { payments: { orderBy: { estimateNumber: 'desc' } } },
  })
  if (!contract) throw new AppError(404, 'Contrato no encontrado')

  const lastPayment = contract.payments[0]
  if (lastPayment && data.percentComplete < lastPayment.percentComplete) {
    throw new AppError(422, `El porcentaje de avance debe ser mayor o igual al anterior (${lastPayment.percentComplete}%)`)
  }

  const number = (lastPayment?.estimateNumber ?? 0) + 1

  return prisma.payment.create({
    data: {
      contractId,
      submittedById: userId,
      estimateNumber: number,
      periodStart: new Date(data.periodStart),
      periodEnd: new Date(data.periodEnd),
      percentComplete: data.percentComplete,
      amount: data.amount,
      status: 'approved',
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
      notes: data.notes,
    },
    include: { submittedBy: { select: { name: true } } },
  })
}
