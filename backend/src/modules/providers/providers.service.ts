import { z } from 'zod'
import { prisma } from '../../lib/prisma'

export const providerSchema = z.object({
  name: z.string().min(2),
  rfc: z.string().optional(),
  contact: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')).transform(v => v || undefined),
  phone: z.string().optional(),
  active: z.boolean().optional(),
})

export async function getAll() {
  return prisma.provider.findMany({ where: { active: true }, orderBy: { name: 'asc' } })
}

export async function create(data: z.infer<typeof providerSchema>) {
  return prisma.provider.create({ data })
}

export async function update(id: string, data: z.infer<typeof providerSchema>) {
  return prisma.provider.update({ where: { id }, data })
}
