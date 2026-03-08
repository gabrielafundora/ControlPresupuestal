import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }

  if (err instanceof ZodError) {
    res.status(422).json({
      error: 'Datos inválidos',
      details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
    })
    return
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un registro con ese valor único' })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Registro no encontrado' })
      return
    }
  }

  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
}
