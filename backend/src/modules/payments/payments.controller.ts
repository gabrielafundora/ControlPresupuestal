import { Request, Response, NextFunction } from 'express'
import * as paymentsService from './payments.service'

export async function getByContract(req: Request, res: Response, next: NextFunction) {
  try { res.json(await paymentsService.getByContract(req.params.contractId)) } catch (err) { next(err) }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try { res.json(await paymentsService.getById(req.params.contractId, req.params.id)) } catch (err) { next(err) }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = paymentsService.createPaymentSchema.parse(req.body)
    res.status(201).json(await paymentsService.create(req.params.contractId, req.user!.userId, data))
  } catch (err) { next(err) }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try { res.json(await paymentsService.updateStatus(req.params.contractId, req.params.id, 'approved', req.user!.userId)) } catch (err) { next(err) }
}

export async function reject(req: Request, res: Response, next: NextFunction) {
  try { res.json(await paymentsService.updateStatus(req.params.contractId, req.params.id, 'rejected', req.user!.userId)) } catch (err) { next(err) }
}

export async function markPaid(req: Request, res: Response, next: NextFunction) {
  try { res.json(await paymentsService.updateStatus(req.params.contractId, req.params.id, 'paid', req.user!.userId)) } catch (err) { next(err) }
}

export async function submit(req: Request, res: Response, next: NextFunction) {
  try { res.json(await paymentsService.updateStatus(req.params.contractId, req.params.id, 'submitted', req.user!.userId)) } catch (err) { next(err) }
}
