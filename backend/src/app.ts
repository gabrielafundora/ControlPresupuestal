import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import authRouter from './modules/auth/auth.router'
import usersRouter from './modules/users/users.router'
import projectsRouter from './modules/projects/projects.router'
import budgetsRouter from './modules/budgets/budgets.router'
import providersRouter from './modules/providers/providers.router'
import contractsRouter from './modules/contracts/contracts.router'
import additivesRouter from './modules/additives/additives.router'
import paymentsRouter from './modules/payments/payments.router'
import reportsRouter from './modules/reports/reports.router'
import { errorHandler } from './middleware/errorHandler'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }))
  app.use(morgan('dev'))
  app.use(express.json())

  const api = '/api/v1'

  app.use(`${api}/auth`, authRouter)
  app.use(`${api}/users`, usersRouter)
  app.use(`${api}/projects`, projectsRouter)
  app.use(`${api}/projects/:projectId/budgets`, budgetsRouter)
  app.use(`${api}/projects/:projectId/contracts`, contractsRouter)
  app.use(`${api}/providers`, providersRouter)
  app.use(`${api}/contracts/:contractId/additives`, additivesRouter)
  app.use(`${api}/contracts/:contractId/payments`, paymentsRouter)
  app.use(`${api}/reports`, reportsRouter)

  app.get('/health', (_req, res) => res.json({ ok: true }))

  app.use(errorHandler)

  return app
}
