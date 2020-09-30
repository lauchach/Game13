import axios from 'axios'

import config from '../../config'

const {
  LINE_NOTIFY_TOKEN
} = config
const url = 'https://notify-api.line.me/api/notify'
const method = 'POST'

export class Notify {
  constructor() {}

  async fire(message: string) {
    try {
      if (message.length > 247) message = `${message.substring(0, 247)}...`
      axios.defaults.headers.common['Authorization'] = `Bearer ${LINE_NOTIFY_TOKEN}`
      await axios({
        method,
        url,
        params: {
          message,
          notificationDisabled: false,
        },
      })
    } catch (error) {}
  }

  async errorFire(errCode: any, errMessage: string, _url: string, data: any) {
    try {
      let message: string = `Error code: ${errCode} | message: ${errMessage} | url: ${_url} | data: ${JSON.stringify(data)}`
      if (message.length > 247) message = `${message.substring(0, 247)}...`
      axios.defaults.headers.common['Authorization'] = `Bearer ${LINE_NOTIFY_TOKEN}`
      await axios({
        method,
        url,
        params: {
          message,
          notificationDisabled: false,
        },
      })
    } catch (error) {}
    return
  }
}
