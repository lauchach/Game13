import { matchMaker } from 'colyseus'

import config from '../../config'
import { gameConfig } from '../../config/game'
import { GameRoom } from '../rooms/GameRoom'
import { getGameList } from '../controller'
import { Redis } from '../utils/Redis'
import { Environment } from '../helpers/constant'

const {
  PREFIX,
  ENVIRONMENT
} = config

export const roomInitialize = async (gameServer: any, redis: Redis, rooms: any) => {
  const gamesData = await getGameList()
  const game = gamesData.find((v: any) => v.prefix === PREFIX)
  const rankFactors: string[] = ['SL', 'TFA', 'TFB', 'TFC', 'TFD', 'TFE', 'TFF', 'TFG', 'TFH', 'TFI', 'TFJ']

  if (ENVIRONMENT !== Environment.DEMO) {
    for (const rank of game.ranks) {
      for (let index = 0; index < rankFactors.length; index++) {
        gameServer.define(`${rank.prefix}-${rankFactors[index]}`, GameRoom, {
          rankId: rank._id,
          prefix: rank.prefix,
          rankFactor: rankFactors[index],
          limit: rank.limit,
          maxClients: gameConfig.MaxClients,
          minClients: gameConfig.MinClients,
          rooms,
          redis
        }).filterBy(['prefix'])
      }
    }
  } else {
    gameServer.define(game.ranks[4].prefix, GameRoom, {
      rankId: game.ranks[4]._id,
      prefix: game.ranks[4].prefix,
      limit: game.ranks[4].limit,
      maxClients: gameConfig.MaxClients,
      minClients: gameConfig.MinClients,
      rooms,
    }).filterBy(['prefix'])
  }
  console.log(`${PREFIX}'s Room initial successfully!`)
}
