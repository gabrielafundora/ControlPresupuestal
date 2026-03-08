import { Request, Response, NextFunction } from 'express'
import * as contractsService from './contracts.service'

export async function getByProject(req: Request, res: Response, next: NextFunction) {
  try { res.json(await contractsService.getByProject(req.params.projectId)) } catch (err) { next(err) }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try { res.json(await contractsService.getById(req.params.projectId, req.params.id)) } catch (err) { next(err) }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = contractsService.createContractSchema.parse(req.body)
    res.status(201).json(await contractsService.create(req.params.projectId, data))
  } catch (err) { next(err) }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = contractsService.updateContractSchema.parse(req.body)
    res.json(await contractsService.update(req.params.projectId, req.params.id, data))
  } catch (err) { next(err) }
}
