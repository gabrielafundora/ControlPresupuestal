import { Router } from 'express'
import * as additivesController from './additives.controller'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'

const router = Router({ mergeParams: true })

router.use(authenticate)
router.get('/', additivesController.getByContract)
router.post('/', authorize('admin', 'director', 'contador'), additivesController.create)
router.patch('/:id', authorize('admin', 'director'), additivesController.update)

export default router
