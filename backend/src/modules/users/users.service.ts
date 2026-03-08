import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/errorHandler'

const ROLES = ['admin', 'director', 'contador', 'readonly'] as const

export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nombre requerido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  role: z.enum(ROLES),
})

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
})

export async function getAll() {
  return prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    orderBy: { name: 'asc' },
  })
}

export async function getById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
  })
  if (!user) throw new AppError(404, 'Usuario no encontrado')
  return user
}

export async function create(data: z.infer<typeof createUserSchema>) {
  const passwordHash = await bcrypt.hash(data.password, 10)
  return prisma.user.create({
    data: { email: data.email, name: data.name, role: data.role, passwordHash },
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
  })
}

export async function update(id: string, data: z.infer<typeof updateUserSchema>) {
  const updateData: Record<string, unknown> = { ...data }
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10)
    delete updateData.password
  }
  return prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
  })
}
