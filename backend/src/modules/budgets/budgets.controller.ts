import { Request, Response, NextFunction } from 'express'
import * as budgetsService from './budgets.service'

export async function getByProject(req: Request, res: Response, next: NextFunction) {
  try { res.json(await budgetsService.getByProject(req.params.projectId)) } catch (err) { next(err) }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try { res.json(await budgetsService.getById(req.params.projectId, req.params.id)) } catch (err) { next(err) }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = budgetsService.createBudgetSchema.parse(req.body)
    res.status(201).json(await budgetsService.create(req.params.projectId, data, req.user!.name))
  } catch (err) { next(err) }
}

export async function createLineItem(req: Request, res: Response, next: NextFunction) {
  try {
    const data = budgetsService.lineItemSchema.parse(req.body)
    res.status(201).json(await budgetsService.createLineItem(req.params.id, data))
  } catch (err) { next(err) }
}

export async function updateLineItem(req: Request, res: Response, next: NextFunction) {
  try {
    const data = budgetsService.updateLineItemSchema.parse(req.body)
    res.json(await budgetsService.updateLineItem(req.params.id, req.params.itemId, data))
  } catch (err) { next(err) }
}

export async function deleteLineItem(req: Request, res: Response, next: NextFunction) {
  try { await budgetsService.deleteLineItem(req.params.id, req.params.itemId); res.status(204).send() } catch (err) { next(err) }
}

export async function createAditiva(req: Request, res: Response, next: NextFunction) {
  try {
    const data = budgetsService.aditivaSchema.parse(req.body)
    res.status(201).json(await budgetsService.createAditiva(req.params.id, data))
  } catch (err) { next(err) }
}

export async function createRebalanceo(req: Request, res: Response, next: NextFunction) {
  try {
    const data = budgetsService.rebalanceoSchema.parse(req.body)
    res.status(201).json(await budgetsService.createRebalanceo(req.params.id, data))
  } catch (err) { next(err) }
}
