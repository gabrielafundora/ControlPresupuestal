import { Router } from 'express'
import * as paymentsController from './payments.controller'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'

const router = Router({ mergeParams: true })

router.use(authenticate)
router.get('/', paymentsController.getByContract)
router.post('/', authorize('admin', 'director', 'contador'), paymentsController.create)
router.get('/:id', paymentsController.getById)

export default router
