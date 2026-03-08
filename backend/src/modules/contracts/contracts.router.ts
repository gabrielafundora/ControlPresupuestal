import { Router } from 'express'
import * as contractsController from './contracts.controller'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'

const router = Router({ mergeParams: true })

router.use(authenticate)
router.get('/', contractsController.getByProject)
router.post('/', authorize('admin', 'director'), contractsController.create)
router.get('/:id', contractsController.getById)
router.patch('/:id', authorize('admin', 'director'), contractsController.update)

export default router
