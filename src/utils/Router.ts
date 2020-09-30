import express, { Request, Response, NextFunction } from 'express'
import { Client } from 'colyseus'

import { Player } from '../rooms/Player'
import { Event } from '../helpers/constant'
import { Redis } from '../utils/Redis'
import { apiResponse, response } from '../utils/Response'

export const router = (app: express.Application, redis: Redis, rooms: any) => {
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET') return next()
    if (req.headers['x-ambpoker-socket-token'] !== 'eyJ0b2tlbiI6IkFMTE9XX1RPX1VTRV9TT0NLRVRfQVBJIn0') return res.send(apiResponse(888, {}))
    next()
  })
  app.use('/colyseus', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      if (req.headers['x-ambpoker-socket-token'] === 'eyJ0b2tlbiI6IkFMTE9XX1RPX1VTRV9TT0NLRVRfQVBJIn0') return next()
    }
    res.send(apiResponse(999, {}))
  })

  app.post('/api/setMaintenance', (req: Request, res: Response) => {
    const { maintenance, message } = req.body
    if (typeof maintenance !== 'boolean') return res.send(apiResponse(1100, {}))
    if (!maintenance) redis.clear()
    for (const id in rooms) {
      rooms[id].maintenance = maintenance
      rooms[id].broadcast(response(Event.BROADCAST_MESSAGE, 0, { message }))
    }
    res.send(apiResponse(0, {}))
  })

  app.post('/api/closeRoom', (req: Request, res: Response) => {
    const { roomId } = req.body
    if (roomId) {
      if (typeof roomId !== 'string') return res.send(apiResponse(1100, {}))
      if (rooms[roomId]) {
        rooms[roomId].closeRoom = true
        return res.send(apiResponse(0, {}))
      }
    }
    res.send(apiResponse(999, {}))
  })

  app.post('/api/userLogin', async (req: Request, res: Response) => {
    const { username, source } = req.body
    let playerData: any[] = await redis.getPlayerDetail(username, source)
    if (playerData.length) {
      for (const data of playerData) {
        let room: any = rooms[data.roomId]
        if (!room) return res.send(apiResponse(601, {}))
        let player: Player = room.state.players[data.sessionId]
        if (player) {
          room.disconnectPlayer(player, 4104)
          return res.send(apiResponse(0, {}))
        }
      }
    }
    res.send(apiResponse(999, {}))
  })

  app.post('/api/userLogout', async (req: Request, res: Response) => {
    const { username, source } = req.body
    let playerData: any[] = await redis.getPlayerDetail(username, source)
    if (playerData.length) {
      for (const data of playerData) {
        let room: any = rooms[data.roomId]
        if (!room) return res.send(apiResponse(601, {}))
        let player: Player = room.state.players[data.sessionId]
        if (player) {
          room.disconnectPlayer(player, 4104)
          return res.send(apiResponse(0, {}))
        }
      }
    }
    res.send(apiResponse(999, {}))
  })

  app.post('/api/kickPlayer', async (req: Request, res: Response) => {
    const { username, source } = req.body
    let playerData: any[] = await redis.getPlayerDetail(username, source)
    if (playerData.length) {
      for (const data of playerData) {
        let room: any = rooms[data.roomId]
        if (!room) return res.send(apiResponse(601, {}))
        let player: Player = room.state.players[data.sessionId]
        if (player) {
          room.disconnectPlayer(player, 4999)
          return res.send(apiResponse(0, {}))
        }
      }
    }
    res.send(apiResponse(999, {}))
  })

  app.post('/api/broadcastMarquee', (req: Request, res: Response) => {
    const { messages } = req.body
    if (!messages.length) return res.send(apiResponse(1100, {}))
    for (const id in rooms) {
      rooms[id].broadcast(response(Event.BROADCAST_MARQUEE, 0, { messages }))
    }
    res.send(apiResponse(0, {}))
  })

  app.post('/api/broadcastMessage', (req: Request, res: Response) => {
    const { roomId, message } = req.body
    if (roomId !== roomId && roomId !== 'all') return res.send(apiResponse(601, {}))
    if (!message) return res.send(apiResponse(1100, {}))
    for (const id in rooms) {
      rooms[id].broadcast(response(Event.BROADCAST_MESSAGE, 0, { message }))
    }
    res.send(apiResponse(0, {}))
  })

  app.post('/api/privateMessage', async (req: Request, res: Response) => {
    const { message, username, source } = req.body
    let playerData: any[] = await redis.getPlayerDetail(username, source)
    if (playerData.length) {
      for (const data of playerData) {
        let room: any = rooms[data.roomId]
        if (!room) return res.send(apiResponse(601, {}))
        let client: Client | undefined = room.clients.find((v: any) => v.sessionId === data.sessionId)
        if (!client) return res.send(apiResponse(603, {}))
        room.send(client, response(Event.BROADCAST_MESSAGE, 0, { message }))
      }
    }
    res.send(apiResponse(0, {}))
  })

  app.post('/api/updateBalance', async (req: Request, res: Response) => {
    const { data, username, source } = req.body
    let playerData: any[] = await redis.getPlayerDetail(username, source)
    if (playerData.length) {
      for (const data of playerData) {
        let room: any = rooms[data.roomId]
        if (!room) return res.send(apiResponse(601, {}))
        let client: Client | undefined = room.clients.find((v: any) => v.sessionId === data.sessionId)
        if (!client) return res.send(apiResponse(603, {}))
        room.send(client, response(Event.UPDATE_BALANCE, 0, data))
      }
    }
    res.send(apiResponse(0, {}))
  })

  app.get('/api/service/health-check', (req: Request, res: Response) => {
    res.status(200).send()
  })
}
