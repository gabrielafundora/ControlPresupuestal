import { Router } from 'express'
import * as paymentsController from './payments.controller'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'

const router = Router({ mergeParams: true })

router.use(authenticate)
router.get('/', paymentsController.getByContract)
router.post('/', authorize('admin', 'director', 'contador'), paymentsController.create)
router.get('/:id', paymentsController.getById)
router.post('/:id/submit', authorize('admin', 'director', 'contador'), paymentsController.submit)
router.post('/:id/approve', authorize('admin', 'director'), paymentsController.approve)
router.post('/:id/reject', authorize('admin', 'director'), paymentsController.reject)
router.post('/:id/mark-paid', authorize('admin', 'contador'), paymentsController.markPaid)

export default router
