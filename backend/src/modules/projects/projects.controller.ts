import { Request, Response, NextFunction } from 'express'
import * as projectsService from './projects.service'

export async function getAll(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await projectsService.getAll()) } catch (err) { next(err) }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try { res.json(await projectsService.getById(req.params.id)) } catch (err) { next(err) }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = projectsService.createProjectSchema.parse(req.body)
    res.status(201).json(await projectsService.create(data))
  } catch (err) { next(err) }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = projectsService.updateProjectSchema.parse(req.body)
    res.json(await projectsService.update(req.params.id, data))
  } catch (err) { next(err) }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try { await projectsService.remove(req.params.id); res.status(204).send() } catch (err) { next(err) }
}
