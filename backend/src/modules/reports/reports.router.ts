import { Router } from 'express'
import * as reportsController from './reports.controller'
import { authenticate } from '../../middleware/authenticate'

const router = Router()

router.use(authenticate)
router.get('/dashboard', reportsController.getDashboard)
router.get('/projects/:projectId/summary', reportsController.getProjectSummary)
router.get('/projects/:projectId/budget-vs-actual', reportsController.getBudgetVsActual)

export default router
