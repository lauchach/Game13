import { Schema, type, ArraySchema } from '@colyseus/schema'
import { Action } from '../helpers/constant'

class Commission extends Schema {
  @type('number') commission: number = 0
  @type('number') pt: number = 0
  @type('number') rtp: number = 0
}

class Wallet extends Schema {
  @type('number') balance: number = 0
}

class Profile extends Schema {
  @type('string') gender: string = 'M'
  @type('string') nickname: string = ''
}

export class Player extends Schema {
  @type('string') sessionId: string = ''
  @type('string') _id: string = ''
  @type('string') parent: string = ''
  @type('string') source: string = ''
  @type('string') role: string = ''
  @type('string') username: string = ''
  @type('number') avatar: number = 0
  @type('string') token: string = ''
  @type('string') type: string = 'PLAYER'
  @type(Profile) profile: Profile = new Profile()
  @type(Wallet) wallet: Wallet = new Wallet()
  @type(Commission) commission: Commission = new Commission()
  @type(['string']) ancestor: ArraySchema<string> = new ArraySchema<string>()
  @type('number') sequence: number = -1
  @type('number') queue: number = -1
  @type('boolean') connected: boolean = true
  @type('boolean') isPlaying: boolean = false
  @type('boolean') isPlayer: boolean = false
  @type('boolean') isPlayerRound: boolean = false
  @type('boolean') doneOpening: boolean = false
  @type('boolean') dropRound: boolean = false
  @type('number') lastActive: number = new Date().getTime()
  @type('boolean') skipResult: boolean = false
  @type('boolean') insuffBalanceForce: boolean = false
  @type('boolean') isReady: boolean = false
  action: string = ''
  isDropState: boolean = false
  canKang: boolean = false
  canDraw: boolean = false
  canFlow: boolean = false
  kang: boolean = false
  cards: number[] = []
  flow: any[] = []
  flowed: any[] = []
  flowEarn: number = 0

  constructor() {
    super()
  }

  public setData(
    sessionId: string,
    _id: string,
    username: string,
    source: string,
    role: string,
    avatar: number,
    profile: {
      gender: string,
      nickname: string,
    },
    wallet: {
      balance: number,
    },
    parent: string,
    ancestor: string[],
    token: string,
    sequence: number
  ) {
    this.sessionId = sessionId
    this._id = _id
    this.parent = parent
    this.source = source
    this.role = role
    this.username = username
    this.avatar = avatar
    this.token = token
    this.profile.gender = profile.gender
    this.profile.nickname = profile.nickname
    this.wallet.balance = wallet.balance
    this.sequence = sequence
    this.isPlayer = true
    for (let index = 0; index < ancestor.length; index++) {
      this.ancestor[index] = ancestor[index]
    }
    return this
  }

  public dummyPlayer(limit: any, availableSequence: number) {
    const rdStr = (n: number) => Math.random().toString(n)
    const randomObjectId = () => (~~(new Date().getTime() / 1000)).toString(16) + (rdStr(16).substring(2, 10)) + rdStr(16).substring(2, 7)
    const randomSessionId = () => rdStr(32).substring(2, 10)
    const SOURCE = ['V8B', '16B', 'MMB', 'QPB', 'B8K', 'G69', 'ASB', 'KMB', 'N9N', 'SYB', 'U22', 'PBG', 'HKB', 'AGG', 'ST6', '99B', 'FIF', 'SS8', 'ZAB', 'VI9', '2B', 'ST', '4G', 'MB', 'BM', '68', '08', 'AN', '191', '66', '168', '88', '99', '34', 'OT']
    const source = SOURCE[~~(Math.random() * SOURCE.length - 1)]
    const username = `${source.toLowerCase()}${String(Math.random()).substring(2, ~~(Math.random() * 6) + 7)}`
    this.sessionId = randomSessionId()
    this._id = randomObjectId()
    this.username = username
    this.parent = randomObjectId()
    this.source = source
    this.role = 'MEMBER'
    this.token = ''
    this.avatar = ~~(Math.random() * 6)
    this.profile.gender = 'M'
    this.profile.nickname = `${username}@${source}`
    this.wallet.balance = Number(this.getBalance(limit))
    this.isPlayer = false
    this.sequence = availableSequence
    return this
  }

  public demoPlayer(sequence: number, sessionId: any = undefined) {
    const rdStr = (n: number) => Math.random().toString(n)
    const randomObjectId = () => (~~(new Date().getTime() / 1000)).toString(16) + (rdStr(16).substring(2, 10)) + rdStr(16).substring(2, 7)
    const randomSessionId = () => rdStr(32).substring(2, 10)
    const SOURCE = ['V8B', '16B', 'MMB', 'QPB', 'B8K', 'G69', 'ASB', 'KMB', 'N9N', 'SYB', 'U22', 'PBG', 'HKB', 'AGG', 'ST6', '99B', 'FIF', 'SS8', 'ZAB', 'VI9', '2B', 'ST', '4G', 'MB', 'BM', '68', '08', 'AN', '191', '66', '168', '88', '99', '34', 'OT']
    const source = SOURCE[~~(Math.random() * SOURCE.length - 1)]
    const username = `${source.toLowerCase()}${String(Math.random()).substring(2, ~~(Math.random() * 6) + 7)}`
    this.sessionId = sessionId ? sessionId : randomSessionId()
    this._id = randomObjectId()
    this.username = username
    this.parent = randomObjectId()
    this.source = source
    this.role = 'MEMBER'
    this.token = ''
    this.avatar = ~~(Math.random() * 6)
    this.profile.gender = 'M'
    this.profile.nickname = `player_${sequence}`
    this.wallet.balance = 20000
    this.isPlayer = sessionId ? true : false
    this.sequence = sequence
    return this
  }

  private getBalance(limit: any) {
    let limitPlayer: number = limit.player
    let numberGroup: number[] = Array.from(Array(11).keys()).filter((v) => v % 2 === 0 && v !== 0 && v > 2)
    if (Math.random() < 0.7) {
      return (((limitPlayer * 2) * Math.random()) + limitPlayer).toFixed(2)
    } else {
      return ((limitPlayer * numberGroup[~~(numberGroup.length * Math.random())] * Math.random()) + limitPlayer).toFixed(2)
    }
  }

  private cryptAsterisk(str: string) {
    if (str.length < 3) return '****'
    switch (str.length) {
      case 3: return `${str.substring(0, 1)}${'*'.repeat(str.length - 2)}${str.substring(2, 3)}`
      case 4: return `${str.substring(0, 1)}${'*'.repeat(str.length - 2)}${str.substring(3, 4)}`
      case 5: return `${str.substring(0, 1)}${'*'.repeat(str.length - 3)}${str.substring(str.length - 2, str.length)}`
      default: return `${str.substring(0, 2)}${'*'.repeat(str.length - 4)}${str.substring(str.length - 2, str.length)}`
    }
  }

  private checkDefaultNickname(): boolean {
    return this.source === '' ? Boolean(this.profile.nickname === this.username) : Boolean(this.profile.nickname === `${this.username}@${this.source}`)
  }

  public encodeNickname(): string {
    return this.checkDefaultNickname() ? this.cryptAsterisk(this.profile.nickname) : this.profile.nickname
  }

  public getData() {
    return {
      sessionId: this.sessionId,
      username: this.username,
      source: this.source,
      profile: this.profile,
      avatar: this.avatar,
      wallet: this.wallet,
      sequence: this.sequence,
      isPlaying: this.isPlaying,
      cards: this.cards,
      cardsNumber: this.cards.length,
      score: this.cards.reduce((p: number, c: number) => p + (((c % 13) + 1) > 9 ? 10 : ((c % 13) + 1)), 0),
    }
  }

  public getDropData(cards: number[], deck: number) {
    return {
      action: Action.DROP,
      sessionId: this.sessionId,
      sequence: this.sequence,
      cards,
      cardsNumber: this.cards.length,
      deck,
    }
  }

  public getActionData(action: string, cards: number[], deck: number, flow: any) {
    if (action === Action.KANG) {
      cards = this.cards
    } else if (action === Action.FLOW || action === Action.FLOW_END) {
      cards = flow.flow
    }
    return {
      action,
      sessionId: this.sessionId,
      sequence: this.sequence,
      cards,
      cardsNumber: this.cards.length,
      deck,
      ...flow,
    }
  }

  public getDrawData(deck: number) {
    return {
      action: Action.DRAW,
      sessionId: this.sessionId,
      sequence: this.sequence,
      card: 1,
      cardsNumber: this.cards.length,
      deck
    }
  }

  public getOpenData() {
    return {
      sessionId: this.sessionId,
      sequence: this.sequence,
    }
  }
}
