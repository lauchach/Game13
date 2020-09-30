import http from 'http'
import redis from 'redis'
import express from 'express'
import cors from 'cors'
import { Server, RedisPresence } from 'colyseus'
import { MongooseDriver } from 'colyseus/lib/matchmaker/drivers/MongooseDriver'
import { monitor } from '@colyseus/monitor'

import config from '../config'
import { Redis } from './utils/Redis'
import { router } from './utils/Router'
import { roomInitialize } from './utils/RoomInitialize'
import { Environment } from '../src/helpers/constant'

const {
  ENVIRONMENT,
  REDIS_URL,
  REDIS_PORT,
  REDIS_PASSWORD,
  REDIS_PRESENCE_URL,
  MONGO_DRIVER_URI,
  PORT,
} = config

export class GameServer {
  private app!: express.Application
  private server!: http.Server
  private gameServer!: Server
  private redisClient!: Redis
  private rooms: any = {}

  constructor() {
    this.redisServer()
    this.createApp()
    this.createServer()
    this.sockets()
    this.roomInitial()
    this.listen()
  }

  private createApp(): void {
    this.app = express()
    this.app.use(cors())
    this.app.use(express.json())
    router(this.app, this.redisClient, this.rooms)
  }

  private redisServer(): void {
    if (ENVIRONMENT !== Environment.LOCAL) {
      const client = redis.createClient({
        port: Number(REDIS_PORT),
        host: REDIS_URL,
        password: REDIS_PASSWORD,
      })
      this.redisClient = new Redis(client)
    } else {
      this.redisClient = new Redis()
    }
  }

  private createServer(): void {
    this.server = http.createServer(this.app)
  }

  private sockets(): void {
    let presence: any = ENVIRONMENT === Environment.PRODUCTION ? {
      presence: new RedisPresence({
        url: REDIS_PRESENCE_URL,
      }),
      driver: new MongooseDriver(MONGO_DRIVER_URI)
    } : {}
    this.gameServer = new Server({
      server: this.server,
      ...presence
    })
    this.gameServer.onShutdown(() => {
      if (ENVIRONMENT !== Environment.LOCAL) this.redisClient.clear()
      console.log('Game Server is shutting down')
    })
  }

  private roomInitial(): void {
    roomInitialize(this.gameServer, this.redisClient, this.rooms)
  }

  private listen(): void {
    this.app.use('/colyseus', monitor({
      columns: [
        'roomId',
        'name',
        { metadata: 'players' },
        'clients',
        'locked',
      ]
    }))
    this.gameServer.listen(Number(PORT) + Number(process.env.NODE_APP_INSTANCE || 0))
    console.log(`Listening on port ${Number(PORT) + Number(process.env.NODE_APP_INSTANCE || 0)}`)
  }

  public getApp(): express.Application {
    return this.app
  }
}