import { Router } from 'express'
import * as authController from './auth.controller'
import { authenticate } from '../../middleware/authenticate'

const router = Router()

router.post('/login', authController.login)
router.post('/refresh', authController.refresh)
router.get('/me', authenticate, authController.me)

export default router
