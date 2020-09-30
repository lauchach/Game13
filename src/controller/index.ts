import axios from 'axios'

import config from '../../config'
import { ApiPath, Environment } from '../helpers/constant'
import { Notify } from '../utils/Notify'

const { ENVIRONMENT, API_SIGNATURE, API_URL, PREFIX } = config
const game = PREFIX
const notify = new Notify()

export const setMaintenance = async (maintenance: boolean) => {
  const data: any = { maintenance, games: [PREFIX] }
  const url: string = `${API_URL}`
  const path: string = `${ApiPath.SET_MAINTENANCE}`
  try {
    delete axios.defaults.headers.common.Authorization
    axios.defaults.headers.common['x-ambpoker-signature'] = API_SIGNATURE
    const response: any = await axios.post(`${url}${path}`, data)
    if (response && response.data && response.data.status && response.data.status.code === 0) {
      return response.data.data
    } else {
      if (ENVIRONMENT !== Environment.LOCAL && ENVIRONMENT !== Environment.DEMO) notify.errorFire(
        (response && response.data && response.data.status && response.data.status.code) || 9,
        (response && response.data && response.data.status && response.data.status.message) || 'err',
        path,
        data
      )
    }
    return
  } catch (error) {
    if (ENVIRONMENT !== Environment.LOCAL && ENVIRONMENT !== Environment.DEMO) notify.errorFire((error && error.response && error.response.status) || 9, (error && error.response && error.response.statusText) || 'err', path, data)
    return
  }
}

export const getGameList = async () => {
  const data: any = {}
  const url: string = `${API_URL}`
  const path: string = `${ApiPath.GET_GAME_LIST}`
  try {
    delete axios.defaults.headers.common.Authorization
    axios.defaults.headers.common['x-ambpoker-signature'] = API_SIGNATURE
    const response: any = await axios.post(`${url}${path}`)
    if (response && response.data && response.data.status && response.data.status.code === 0) {
      return response.data.data
    } else {
      if (ENVIRONMENT !== Environment.LOCAL && ENVIRONMENT !== Environment.DEMO) notify.errorFire(
        (response && response.data && response.data.status && response.data.status.code) || 9,
        (response && response.data && response.data.status && response.data.status.message) || 'err',
        path,
        data
      )
    }
    return []
  } catch (error) {
    if (ENVIRONMENT !== Environment.LOCAL && ENVIRONMENT !== Environment.DEMO) notify.errorFire((error && error.response && error.response.status) || 9, (error && error.response && error.response.statusText) || 'err', path, data)
    return
  }
}

export const getConfig = async (prefix: string) => {
  const data: any = { prefix }
  const url: string = `${API_URL}`
  const path: string = `${ApiPath.GET_CONFIG}`
  try {
    delete axios.defaults.headers.common.Authorization
    axios.defaults.headers.common['x-ambpoker-signature'] = API_SIGNATURE
    const response: any = await axios.post(`${url}${path}`, data)
    if (response && response.data && response.data.status && response.data.status.code === 0) {
      return response.data.data
    }
    return {
      percentage: 0.5, round: 0, score: 21
    }
  } catch (error) {
    return {
      percentage: 0.5, round: 0, score: 21
    }
  }
}

export const getGameMaintenanceStatus = async () => {
  const data: any = { prefix: PREFIX }
  const url: string = `${API_URL}`
  const path: string = `${ApiPath.GET_GAME_STATUS}`
  try {
    delete axios.defaults.headers.common.Authorization
    axios.defaults.headers.common['x-ambpoker-signature'] = API_SIGNATURE
    const response: any = await axios.post(`${url}${path}`, data)
    if (response && response.data && response.data.status && response.data.status.code === 0) {
      return response.data.data.status !== 0
    } else {
      if (ENVIRONMENT !== Environment.LOCAL && ENVIRONMENT !== Environment.DEMO) notify.errorFire(
        (response && response.data && response.data.status && response.data.status.code) || 9,
        (response && response.data && response.data.status && response.data.status.message) || 'err',
        path,
        data
      )
    }
    return true
  } catch (error) {
    if (ENVIRONMENT !== Environment.LOCAL && ENVIRONMENT !== Environment.DEMO) notify.errorFire((error && error.response && error.response.status) || 9, (error && error.response && error.response.statusText) || 'err', path, data)
    return true
  }
}

export const getPlayerInfo = async (username: string, source: string) => {
  const data: any = { username, source, game }
  const url: string = `${API_URL}`
  const path: string = `${ApiPath.GET_PLAYER_INFO}`
  try {
    delete axios.defaults.headers.common.Authorization
    axios.defaults.headers.common['x-ambpoker-signature'] = API_SIGNATURE
    const response: any = await axios.post(`${url}${path}`, data)
    if (response && response.data && response.data.status && response.data.status.code === 0) {
      return response.data.data
    }
    return
  } catch (error) {
    return
  }
}

export const getBalance = async (username: string, source: string) => {
  const data: any = { username, source }
  const url: string = `${API_URL}`
  const path: string = `${ApiPath.GET_BALANCE}`
  try {
    delete axios.defaults.headers.common.Authorization
    axios.defaults.headers.common['x-ambpoker-signature'] = API_SIGNATURE
    const response: any = await axios.post(`${url}${path}`, data)
    if (response && response.data && response.data.status && response.data.status.code === 0) {
      return response.data.data
    } else {
      if (ENVIRONMENT !== Environment.LOCAL && ENVIRONMENT !== Environment.DEMO) notify.errorFire(
        (response && response.data && response.data.status && response.data.status.code) || 9,
        (response && response.data && response.data.status && response.data.status.message) || 'err',
        path,
        data
      )
    }
    return
  } catch (error) {
    if (ENVIRONMENT !== Environment.LOCAL && ENVIRONMENT !== Environment.DEMO) notify.errorFire((error && error.response && error.response.status) || 9, (error && error.response && error.response.statusText) || 'err', path, data)
    return
  }
}

export const getRound = async (rank: string, room: string) => {
  const data: any = { game, rank, room }
  const url: string = `${API_URL}`
  const path: string = `${ApiPath.GET_ROUND}`
  try {
    delete axios.defaults.headers.common.Authorization
    axios.defaults.headers.common['x-ambpoker-signature'] = API_SIGNATURE
    const response: any = await axios.post(`${url}${path}`, data, { timeout: 3000 })
    if (response && response.data && response.data.status && response.data.status.code === 0) {
      return response.data.data
    } else {
      if (ENVIRONMENT !== Environment.LOCAL && ENVIRONMENT !== Environment.DEMO) notify.errorFire(
        (response && response.data && response.data.status && response.data.status.code) || 9,
        (response && response.data && response.data.status && response.data.status.message) || 'err',
        path,
        data
      )
    }
    return
  } catch (error) {
    if (ENVIRONMENT !== Environment.LOCAL && ENVIRONMENT !== Environment.DEMO) notify.errorFire((error && error.response && error.response.status) || 9, (error && error.response && error.response.statusText) || error.message, path, data)
    return
  }
}

export const cancelBet = async (roundId: string, username: string, source: string) => {
  const data: any = { roundId, username, source }
  const url: string = `${API_URL}`
  const path: string = `${ApiPath.CANCEL}`
  try {
    delete axios.defaults.headers.common.Authorization
    axios.defaults.headers.common['x-ambpoker-signature'] = API_SIGNATURE
    const response: any = await axios.post(`${url}${path}`, data)
    if (response && response.data && response.data.status && response.data.status.code === 0) {
      return response.data.data
    } else {
      if (ENVIRONMENT !== Environment.LOCAL && ENVIRONMENT !== Environment.DEMO) notify.errorFire(
        (response && response.data && response.data.status && response.data.status.code) || 9,
        (response && response.data && response.data.status && response.data.status.message) || 'err',
        path,
        data
      )
    }
  } catch (error) {

  }
}

export const betting = async (room: string, rank: string, roundId: string, user: any, uuid: string) => {
  const data: any = { game, rank, room, roundId, user, uuid }
  const url: string = `${API_URL}`
  const path: string = `${ApiPath.BET}`
  try {
    delete axios.defaults.headers.common.Authorization
    axios.defaults.headers.common['x-ambpoker-signature'] = API_SIGNATURE
    const response: any = await axios.post(`${url}${path}`, data, { timeout: 3000 })
    if (response && response.data && response.data.status && response.data.status.code === 0) {
      return response.data.data
    } else {
      if (ENVIRONMENT !== Environment.LOCAL && ENVIRONMENT !== Environment.DEMO) notify.errorFire(
        (response && response.data && response.data.status && response.data.status.code) || 9,
        (response && response.data && response.data.status && response.data.status.message) || 'err',
        path,
        data
      )
    }
    return
  } catch (error) {
    if (ENVIRONMENT !== Environment.LOCAL && ENVIRONMENT !== Environment.DEMO) notify.errorFire((error && error.response && error.response.status) || 9, (error && error.response && error.response.statusText) || error.message, path, data)
    setTimeout(() => cancelBet(roundId, user.username, user.source), 5000)
    return
  }
}

export const payout = async (room: string, rank: string, roundId: string, user: any, result: any, uuid: string) => {
  const data: any = { game, rank, room, roundId, user, result, uuid }
  const url: string = `${API_URL}`
  const path: string = `${ApiPath.PAYOUT}`
  try {
    delete axios.defaults.headers.common.Authorization
    axios.defaults.headers.common['x-ambpoker-signature'] = API_SIGNATURE
    const response: any = await axios.post(`${url}${path}`, data, { timeout: 5000 })
    if (response && response.data && response.data.status && response.data.status.code === 0) {
      return response.data.data
    } else {
      if (ENVIRONMENT !== Environment.LOCAL && ENVIRONMENT !== Environment.DEMO) notify.errorFire(
        (response && response.data && response.data.status && response.data.status.code) || 9,
        (response && response.data && response.data.status && response.data.status.message) || 'err',
        path,
        data
      )
    }
    return
  } catch (error) {
    if (ENVIRONMENT !== Environment.LOCAL && ENVIRONMENT !== Environment.DEMO) notify.errorFire((error && error.response && error.response.status) || 9, (error && error.response && error.response.statusText) || error.message, path, data)
    return
  }
}
