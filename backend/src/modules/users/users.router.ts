import { Router } from 'express'
import * as usersController from './users.controller'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'

const router = Router()

router.use(authenticate)
router.get('/', authorize('admin'), usersController.getAll)
router.post('/', authorize('admin'), usersController.create)
router.get('/:id', authorize('admin'), usersController.getById)
router.patch('/:id', authorize('admin'), usersController.update)

export default router
