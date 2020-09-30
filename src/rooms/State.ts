import { Schema, type, MapSchema } from '@colyseus/schema'
import { Player } from './Player'
import { getConfig } from '../controller'
import { RoomStatus } from '../helpers/constant'
import { specialCoreLogic } from '../utils/Calculator'

export class State extends Schema {
  @type({ map: Player }) players: MapSchema<Player> = new MapSchema<Player>()
  @type('string') status: string = 'WAITING'
  @type('string') roundId: string = ''
  @type('string') rankPrefix: string = ''
  @type('boolean') isRunning: boolean = false
  @type('boolean') isOpeningState: boolean = false
  deck: number[] = Array.from(Array(52).keys()).sort((a: number, b: number) => Math.random() - 0.5)
  garbage: any[] = []
  flowTarget: string = ''
  config: any = {}

  public isAllowDispose(): boolean {
    return this.status === RoomStatus.WAITING || this.status === RoomStatus.RESULTING
  }

  public isAllBots(): boolean {
    return Object.values(this.players).every((v: Player) => !v.isPlayer)
  }

  public playersData() {
    return Object.values(this.players).map((v: Player) => ({
      sessionId: v.sessionId,
      profile: {
        gender: v.profile.gender,
        nickname: v.encodeNickname(),
      },
      avatar: v.avatar,
      wallet: v.wallet,
      sequence: v.sequence,
      isPlaying: v.isPlaying,
      cards: v.cards.length,
    }))
  }

  public dealingData(start: number, max: number) {
    let players = Object.values(this.players).filter((v: any) => v.isPlaying).map((v: any) => ({
      sessionId: v.sessionId,
      profile: {
        gender: v.profile.gender,
        nickname: v.encodeNickname(),
      },
      avatar: v.avatar,
      wallet: v.wallet,
      sequence: v.sequence,
      donePlaying: v.donePlaying,
      isPlaying: v.isPlaying,
      cards: v.cards.length,
    }))
    players = players.sort((a: any, b: any) => ((a.sequence + max - start) % max) - ((b.sequence + max - start) % max))
    return players
  }

  public async shuffler() {
    this.config = await getConfig(this.rankPrefix)
    for (let index = 0; index < 5; index++) {
      for (const id in this.players) {
        let player: Player = this.players[id]
        if (player.isPlaying) {
          player.cards = [...player.cards, this.deck.splice(0, 1)[0]]
        }
      }
    }
    for (const id in this.players) {
      if (this.players[id].isPlayer) {
        let score: number = this.players[id].cards.reduce((p: number, c: number) => p + (((c % 13) + 1) > 9 ? 10 : ((c % 13) + 1)), 0)
        if (score < this.config.score && Math.random() < this.config.round) {
          this.reShuffle(this.players[id])
        } else {
          let special: any = specialCoreLogic(this.players[id].cards)
          if (special.score > 0 && Math.random() < this.config.percentage) this.reShuffle(this.players[id])
        }
      }
    }
  }

  private reShuffle(player: Player) {
    this.deck = [...this.deck, ...player.cards].sort((a: number, b: number) => Math.random() - 0.5)
    player.cards = []
    for (let index = 0; index < 5; index++) {
      player.cards = [...player.cards, this.deck.splice(0, 1)[0]]
    }
  }
}
