import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as authService from './auth.service'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body)
    const result = await authService.login(email, password)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) { res.status(400).json({ error: 'refreshToken requerido' }); return }
    const result = await authService.refresh(refreshToken)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function me(req: Request, res: Response) {
  res.json({ user: req.user })
}
