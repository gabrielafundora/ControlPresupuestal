import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/errorHandler'

const STATUSES = ['planning', 'active', 'on_hold', 'completed', 'cancelled'] as const

export const createProjectSchema = z.object({
  code: z.string().min(1, 'Código requerido'),
  name: z.string().min(2, 'Nombre requerido'),
  description: z.string().optional(),
  status: z.enum(STATUSES).default('planning'),
  startDate: z.string().datetime().optional().or(z.literal('')).transform(v => v || undefined),
  endDate: z.string().datetime().optional().or(z.literal('')).transform(v => v || undefined),
  location: z.string().optional(),
})

export const updateProjectSchema = createProjectSchema.partial()

export async function getAll() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { contracts: true } },
      budgets: { where: { isActive: true }, select: { totalAmount: true } },
    },
  })
  return projects.map(p => ({
    ...p,
    activeBudget: p.budgets[0] ?? null,
    budgets: undefined,
  }))
}

export async function getById(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      budgets: { orderBy: { version: 'desc' } },
      contracts: {
        include: { provider: true, additives: true, payments: { where: { status: { in: ['approved', 'paid'] } } } },
      },
    },
  })
  if (!project) throw new AppError(404, 'Proyecto no encontrado')
  return project
}

export async function create(data: z.infer<typeof createProjectSchema>) {
  return prisma.project.create({ data: {
    code: data.code,
    name: data.name,
    description: data.description,
    status: data.status,
    location: data.location,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    endDate: data.endDate ? new Date(data.endDate) : undefined,
  }})
}

export async function update(id: string, data: z.infer<typeof updateProjectSchema>) {
  return prisma.project.update({
    where: { id },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  })
}

export async function remove(id: string) {
  return prisma.project.delete({ where: { id } })
}
