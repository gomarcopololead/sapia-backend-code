import * as express from 'express'

import UserService, { ErrorResponse } from '@src/api/services/user'
import { writeJsonResponse } from '@src/utils/express'
import logger from '@src/utils/logger'

export function auth(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const token = req.headers.authorization!
  UserService.auth(token)
    .then(authResponse => {
      if (!(authResponse as any).error) {
        res.locals.auth = {
          userId: (authResponse as { userId: string }).userId
        }
        next()
      } else {
        writeJsonResponse(res, 401, authResponse)
      }
    })
    .catch(err => {
      logger.error(`auth: ${err}`)
      writeJsonResponse(res, 500, { error: { type: 'internal_server_error', message: 'Internal Server Error' } })
    })
}

export function login(req: express.Request, res: express.Response): void {
  const { username, password } = req.body

  UserService.login(username, password)
    .then(resp => {
      if ((resp as any).error) {
        if ((resp as ErrorResponse).error.type === 'non_existing_user') {
          writeJsonResponse(res, 404, resp)
        } else if ((resp as ErrorResponse).error.type === 'invalid_password') {
          writeJsonResponse(res, 401, resp)
        } else if ((resp as ErrorResponse).error.type === 'user_locked') {
          writeJsonResponse(res, 423, resp)
        } else {
          throw new Error(`unsupported ${resp}`)
        }
      } else {
        const { userId, token, expireAt } = resp as { token: string, userId: string, expireAt: Date }
        writeJsonResponse(res, 200, { userId: userId, token: token }, { 'X-Expires-After': expireAt.toISOString() })
      }
    })
    .catch((err: any) => {
      logger.error(`login: ${err}`)
      writeJsonResponse(res, 500, { error: { type: 'internal_server_error', message: 'Internal Server Error' } })
    })
}

export function createUser(req: express.Request, res: express.Response): void {
  const { username, password } = req.body

  UserService.createUser(username, password)
    .then(resp => {
      if ((resp as any).error) {
        if ((resp as ErrorResponse).error.type === 'account_already_exists') {
          writeJsonResponse(res, 409, resp)
        } else {
          throw new Error(`unsupported ${resp}`)
        }
      } else {
        writeJsonResponse(res, 201, resp)
      }
    })
    .catch((err: any) => {
      logger.error(`createUser: ${err}`)
      writeJsonResponse(res, 500, { error: { type: 'internal_server_error', message: 'Internal Server Error' } })
    })
}
