import { Router } from 'express'
import * as projectsController from './projects.controller'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'

const router = Router()

router.use(authenticate)
router.get('/', projectsController.getAll)
router.post('/', authorize('admin', 'director'), projectsController.create)
router.get('/:id', projectsController.getById)
router.patch('/:id', authorize('admin', 'director'), projectsController.update)
router.delete('/:id', authorize('admin'), projectsController.remove)

export default router
