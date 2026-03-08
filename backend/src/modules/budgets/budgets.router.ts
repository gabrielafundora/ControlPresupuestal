import { Router } from 'express'
import * as budgetsController from './budgets.controller'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'

const router = Router({ mergeParams: true })

router.use(authenticate)

router.get('/', budgetsController.getByProject)
router.post('/', authorize('admin', 'director'), budgetsController.create)
router.get('/:id', budgetsController.getById)
router.post('/:id/activate', authorize('admin', 'director'), budgetsController.activate)
router.post('/:id/line-items', authorize('admin', 'director'), budgetsController.createLineItem)
router.patch('/:id/line-items/:itemId', authorize('admin', 'director'), budgetsController.updateLineItem)
router.delete('/:id/line-items/:itemId', authorize('admin'), budgetsController.deleteLineItem)

export default router
