import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt'
import { AppError } from '../../middleware/errorHandler'

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.active) throw new AppError(401, 'Credenciales inválidas')

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw new AppError(401, 'Credenciales inválidas')

  const payload = { userId: user.id, email: user.email, role: user.role, name: user.name }
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  }
}

export async function refresh(token: string) {
  try {
    const payload = verifyRefreshToken(token)
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user || !user.active) throw new AppError(401, 'Usuario inactivo')
    const newPayload = { userId: user.id, email: user.email, role: user.role, name: user.name }
    return { accessToken: signAccessToken(newPayload) }
  } catch {
    throw new AppError(401, 'Refresh token inválido o expirado')
  }
}
