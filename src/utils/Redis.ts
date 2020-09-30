import { RedisClient } from 'redis'
import { promisify } from 'util'

import config from '../../config'
import { Player } from '../rooms/Player'
import { Environment } from '../helpers/constant'

const {
  ENVIRONMENT,
  PREFIX
} = config

export class Redis {
  redis!: RedisClient
  redisDel: any
  redisGet: any
  redisKeys: any
  redisActive: boolean = ENVIRONMENT !== Environment.LOCAL && ENVIRONMENT !== Environment.DEMO

  constructor(redis: any = {}) {
    if (this.redisActive) {
      this.redis = redis
      this.redisDel = promisify(this.redis.del).bind(this.redis)
      this.redisGet = promisify(this.redis.get).bind(this.redis)
      this.redisKeys = promisify(this.redis.keys).bind(this.redis)
    }
  }

  async getPlayerDetail(username: string, source: string) {
    if (this.redisActive) {
      let keys: any[] = await this.redisKeys(`${PREFIX}:*:player:${username}:${source}:*`)
      if (keys.length) {
        keys = keys.map((key: any) => {
          const [game, rank, type, username, source, ancestor, roomId, sessionId] = key.split(':')
          return { game, rank, type, username, source, ancestor, roomId, sessionId }
        })
      }
      return keys
    }
    return []
  }

  async setPlayer(prefix: string, player: Player, roomId: string) {
    if (this.redisActive) {
      this.redis.set(`${PREFIX}:${prefix}:${player.isPlayer ? 'player' : 'bot'}:${player.username}:${player.source}:${player.isPlayer ? player.ancestor[0] : 'AI'}:${roomId}:${player.sessionId}`, '')
    }
  }

  async delPlayer(roomId: string, username: string, source: string) {
    if (this.redisActive) {
      const keys: string[] = await this.redisKeys(`*:${username}:${source}:*:${roomId}:*`)
      if (keys.length) {
        await this.redisDel(keys[0])
      }
    }
  }

  async clear() {
    if (this.redisActive) {
      const keys: string[] = [...await this.redisKeys(`${PREFIX}:*`), ...await this.redisKeys(`ROOMS:${PREFIX}:*`)]
      for (const key of keys) {
        this.redisDel(key)
      }
    }
    return
  }
}
