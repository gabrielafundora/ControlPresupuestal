import { Request, Response, NextFunction } from 'express'
import * as additivesService from './additives.service'

export async function getByContract(req: Request, res: Response, next: NextFunction) {
  try { res.json(await additivesService.getByContract(req.params.contractId)) } catch (err) { next(err) }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = additivesService.createAdditiveSchema.parse(req.body)
    res.status(201).json(await additivesService.create(req.params.contractId, data))
  } catch (err) { next(err) }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = additivesService.createAdditiveSchema.partial().parse(req.body)
    res.json(await additivesService.update(req.params.contractId, req.params.id, data))
  } catch (err) { next(err) }
}
