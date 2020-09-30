import { Schema, type } from '@colyseus/schema'

import { ResponseData } from '../helpers/constant'
import { Base64 } from '../utils'

class ResponseMessage extends Schema {
  @type('string') data: string = '{}'
}

export const response = (action: string, type: keyof typeof ResponseData | 0, data: object | {}) => {
  const _data = new ResponseMessage()
  _data.data = Base64.encode(JSON.stringify({
    action,
    data,
    status: {
      code: type,
      message: ResponseData[type].message,
    },
  }))
  return _data
}

export const apiResponse = (type: keyof typeof ResponseData | 0, data: object | {}) => {
  return {
    status: {
      code: type,
      message: ResponseData[type].message,
    },
    data,
  }
}
