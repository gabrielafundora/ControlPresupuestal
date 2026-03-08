import { Request, Response, NextFunction } from 'express'
import * as usersService from './users.service'

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try { res.json(await usersService.getAll()) } catch (err) { next(err) }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try { res.json(await usersService.getById(req.params.id)) } catch (err) { next(err) }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = usersService.createUserSchema.parse(req.body)
    res.status(201).json(await usersService.create(data))
  } catch (err) { next(err) }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = usersService.updateUserSchema.parse(req.body)
    res.json(await usersService.update(req.params.id, data))
  } catch (err) { next(err) }
}
