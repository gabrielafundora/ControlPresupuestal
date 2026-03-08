import { Router } from 'express'
import * as providersController from './providers.controller'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'

const router = Router()

router.use(authenticate)
router.get('/', providersController.getAll)
router.post('/', authorize('admin', 'director'), providersController.create)
router.patch('/:id', authorize('admin', 'director'), providersController.update)

export default router
