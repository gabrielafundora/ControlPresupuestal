import { Request, Response, NextFunction } from 'express'
import * as reportsService from './reports.service'

export async function getProjectSummary(req: Request, res: Response, next: NextFunction) {
  try { res.json(await reportsService.getProjectSummary(req.params.projectId)) } catch (err) { next(err) }
}

export async function getBudgetVsActual(req: Request, res: Response, next: NextFunction) {
  try { res.json(await reportsService.getBudgetVsActual(req.params.projectId)) } catch (err) { next(err) }
}

export async function getDashboard(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await reportsService.getDashboard()) } catch (err) { next(err) }
}
