import jwt from 'jsonwebtoken'

import config from '../../config'

export const decodeToken = (token: string) => {
  return jwt.verify(token, config.JWT_SIGNATURE || '')
}
