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
    include: { additives: true, payments: { orderBy: { estimateNumber: 'desc' } } },
  })
  if (!contract) throw new AppError(404, 'Contrato no encontrado')

  // Validar porcentaje mayor que el anterior
  const lastPayment = contract.payments[0]
  if (lastPayment && data.percentComplete < lastPayment.percentComplete) {
    throw new AppError(422, `El porcentaje de avance debe ser mayor o igual al anterior (${lastPayment.percentComplete}%)`)
  }

  // Calcular monto autorizado
  const authorized = contract.originalAmount + contract.additives.reduce((sum, a) => {
    return sum + (a.type === 'additive' ? a.amount : -a.amount)
  }, 0)

  // Validar que el acumulado no supere el monto autorizado
  const paid = contract.payments
    .filter(p => ['approved', 'paid'].includes(p.status))
    .reduce((sum, p) => sum + p.amount, 0)
  if (paid + data.amount > authorized * 1.01) { // 1% tolerancia
    throw new AppError(422, `El monto acumulado excede el monto autorizado del contrato (${authorized.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })})`)
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
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
      notes: data.notes,
    },
    include: { submittedBy: { select: { name: true } } },
  })
}

export async function updateStatus(contractId: string, id: string, status: string, userId: string) {
  const payment = await prisma.payment.findFirst({ where: { id, contractId } })
  if (!payment) throw new AppError(404, 'Estimación no encontrada')

  const validTransitions: Record<string, string[]> = {
    draft: ['submitted'],
    submitted: ['approved', 'rejected'],
    approved: ['paid'],
    rejected: ['draft'],
  }

  if (!validTransitions[payment.status]?.includes(status)) {
    throw new AppError(422, `No se puede cambiar de "${payment.status}" a "${status}"`)
  }

  return prisma.payment.update({
    where: { id },
    data: {
      status,
      paidAt: status === 'paid' ? new Date() : undefined,
    },
  })
}
