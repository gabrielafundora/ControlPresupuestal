import { Request, Response, NextFunction } from 'express'
import * as providersService from './providers.service'

export async function getAll(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await providersService.getAll()) } catch (err) { next(err) }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = providersService.providerSchema.parse(req.body)
    res.status(201).json(await providersService.create(data))
  } catch (err) { next(err) }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = providersService.providerSchema.partial().parse(req.body)
    res.json(await providersService.update(req.params.id, data as Parameters<typeof providersService.update>[1]))
  } catch (err) { next(err) }
}
