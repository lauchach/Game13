import { Room, Client, Delayed } from 'colyseus'
import { uuid } from 'uuidv4'

import { State } from './State'
import { Player } from './Player'
import { Action, Environment, EndType, Event, RankLevel, RoomStatus, Time, UserType } from '../helpers/constant'
import * as userInterface from '../interface/user.interface'
import * as controller from '../controller'
import { Delay, generateCustomRoomId } from '../utils'
import * as auth from '../utils/Authenticate'
import { coreLogic, specialCalculator } from '../utils/Calculator'
import { processRetry } from '../utils/ProcessRetry'
import { Redis } from '../utils/Redis'
import { response } from '../utils/Response'
import config from '../../config'

const {
  ENVIRONMENT
} = config

export class GameRoom extends Room<State> {
  autoDispose = true
  availableBots: number = 0
  availableSequence: number[] = []
  bots: any = {}
  botsAmount: any = {}
  closeRoom: boolean = false
  currentCrown: string = ''
  deck: number[] = []
  isMockingState: boolean = false
  isReady: boolean = false
  lastRoundPlayerList: string[] = []
  limit: any
  maintenance: boolean = true
  minClients!: number
  password!: string
  randomCountdown: any
  randomState: boolean = false
  rankFactor!: string
  rankId!: string
  rankLevel!: string
  rankPrefix!: string
  roundId!: string
  rooms: any
  roomMetadata: object = {}
  Redis!: Redis

  public botsInterval!: Delayed
  public openInterval!: Delayed
  public playingStateInterval!: Delayed
  public prepareInterval!: Delayed
  public resultInterval!: Delayed
  public roundInterval!: Delayed
  
  async onCreate(options: any) {
    this.roomId = await generateCustomRoomId()
    this.setSeatReservationTime(3)
    this.rooms = options.rooms
    this.rooms[this.roomId] = this
    this.maxClients = options.maxClients
    this.minClients = options.minClients
    this.limit = options.limit
    this.availableSequence = Array.from(Array(options.maxClients).keys())
    this.roomMetadata = {
      rank: options.prefix.split('-')[1],
      limit: options.limit,
    }
    this.botsAmount = {
      amount: [2, 4],
      index: 0,
      count: 0,
      endCount: 1
    }
    this.randomCountdown = {
      close: false,
      time: ~~(Math.random() * 5) + 1
    }
    this.rankPrefix = options.prefix
    this.rankFactor = options.rankFactor
    this.rankId = options.rankId
    this.rankLevel = options.prefix.split('-')[1]
    this.maintenance = await controller.getGameMaintenanceStatus()
    if (ENVIRONMENT !== Environment.DEMO) this.Redis = options.redis
    let allowMockingState: boolean = this.randomState ? Math.random() < 0.5 ? true : false : false
    if (allowMockingState) {
      this.isMockingState = true
      this.initial()
      // this.prepareMockState()
    } else {
      this.initial()
    }
  }

  async onAuth(client: Client, options: any, req: any) {
    if (ENVIRONMENT !== Environment.DEMO) {
      if (this.maintenance) throw new Error('ปิดปรับปรุงระบบ กรุณาลองใหม่อีกครั้งภายหลัง')
      if (this.closeRoom) throw new Error('Full Players!')
      const decodedToken: any = auth.decodeToken(options.token)
      const user = await controller.getPlayerInfo(decodedToken.username, decodedToken.source)
      let rankFactor: string = user.rankFactor.substring(0, 2)
      let playerList: Player[] = Object.values(this.state.players).filter((v: Player) => v.isPlayer)
      if (!user) throw new Error('Invalid user data!')
      if (user && user.rankFactor !== this.rankFactor) throw new Error('Invalid factor!')
      if (rankFactor === UserType.SEAMLESS) {
        if (playerList.length) throw new Error('Full Players!')
      } else if (rankFactor === UserType.TRANSFER) {
        if (playerList.length === 2) throw new Error('Full Players!')
      }
      if (Object.values(this.state.players).find((v: any) => v._id === decodedToken._id)) throw new Error('You already have session in game!')
      if (Object.values(this.state.players).length >= this.maxClients) throw new Error('Full Players!')
      if (user.wallet.balance < this.limit.player) throw new Error('Insufficient balance!')
      return { user }
    } else {
      return true
    }
  }

  async onJoin(client: Client, options: any) {
    if (this.isMockingState) {
      while (!this.isReady) {
        await Delay(100)
      }
    }
    let players: Player[] = Object.values(this.state.players)
    if (ENVIRONMENT !== Environment.DEMO) {
      let rankFactor: string = client.auth.user.rankFactor.substring(0, 2)
      let playerList: Player[] = Object.values(this.state.players).filter((v: Player) => v.isPlayer)
      if (rankFactor === UserType.SEAMLESS) {
        if (playerList.length) throw new Error('Full Players!')
      } else if (rankFactor === UserType.TRANSFER) {
        if (playerList.length === 2) throw new Error('Full Players!')
      }
    }
    if (!players.filter((v: Player) => v._id === options._id).length && players.length < this.maxClients) {
      let player!: Player
      if (ENVIRONMENT !== Environment.DEMO) {
        player = new Player().setData(
          client.sessionId,
          client.auth.user._id,
          client.auth.user.username,
          client.auth.user.source,
          client.auth.user.role,
          client.auth.user.avatar,
          client.auth.user.profile,
          client.auth.user.wallet,
          client.auth.user.parent,
          client.auth.user.ancestor,
          options.token,
          this.availableSequence.splice(~~(Math.random() * this.availableSequence.length), 1)[0]
        )
      } else {
        player = new Player().demoPlayer(this.availableSequence.splice(0, 1)[0], client.sessionId)
      }
      if (player) {
        this.state.players[client.sessionId] = player
        this.send(client, response(Event.ENTER_ROOM, 0, {
          roomId: this.roomId,
          state: this.state.status,
          players: this.state.playersData(),
          prefix: this.rankPrefix,
          limit: this.limit,
          deck: this.state.deck.length,
          garbage: this.state.garbage.map((v: any) => v.cards),
          currentCrown: this.currentCrown,
          user: player.getData()
        }))

        this.broadcast(response(Event.PLAYER_IN, 0, {
          sessionId: player.sessionId,
          avatar: player.avatar,
          profile: {
            gender: player.profile.gender,
            nickname: player.encodeNickname(),
          },
          wallet: player.wallet,
          sequence: player.sequence,
        }), { except: client })


        if (ENVIRONMENT !== Environment.DEMO) {
          this.Redis.setPlayer(this.rankPrefix, player, this.roomId)
          let rankFactor: string = client.auth.user.rankFactor.substring(0, 2)
          let playerList: Player[] = Object.values(this.state.players).filter((v: Player) => v.isPlayer)
          if (rankFactor === UserType.SEAMLESS) {
            if (playerList.length) this.lock()
          } else if (rankFactor === UserType.TRANSFER) {
            if (playerList.length === 2) this.lock()
          }
        }
        this.setRoomMetadata()
        let players: Player[] = Object.values(this.state.players)
        if (players.length === this.maxClients) this.lock()
        if (Object.keys(this.state.players).length >= this.minClients && !this.state.isRunning) {
          this.prepare()
        }
      } else {
        this.send(client, response(Event.ENTER_ROOM, 999, {}))
      }
    } else {
      this.send(client, response(Event.ENTER_ROOM, 999, {}))
    }
  }

  async onLeave(client: Client, consented: boolean) {
    let player: Player = this.state.players[client.sessionId]
    if (player) {
      player.connected = false
      try {
        if ((this.state.status === RoomStatus.PLAYING) && player.isPlaying && !player.insuffBalanceForce) {
          await this.allowReconnection(client, 3000)
        } else {
          throw new Error('Consented leave')
        }
      } catch (e) {
        this.deletePlayer(player)
      }
    }
  }

  onMessage(client: Client, message: any) {
    if (!message) return
    if (!this.state.players[client.sessionId]) return client.close(4106)
    if (!message.auto && String(message.action) !== Event.READY) this.state.players[client.sessionId].lastActive = new Date().getTime()
    let action: string = message.action
    switch (action) {
      case Event.GET_ROOM_DATA: this.sendRoomData(client)
        break
      case Event.OPEN_CARD: this.playerOpenCard(client)
        break
      case Event.ACTION: this.playerAction(client, message.data)
        break
      case Event.FIRE_EMOJI: this.fireEmoji(client, message.data)
        break
      case Event.READY: this.playerIsReady(client)
        break
    }
  }

  onDispose() {
    if (ENVIRONMENT !== Environment.DEMO) {
      for (const player of Object.values(this.state.players)) {
        this.Redis.delPlayer(this.roomId, player.username, player.source)
      }
    }
    delete this.rooms[this.roomId]
  }

  initial() {
    let state = new State()
    this.setState(state)
    this.state.rankPrefix = this.rankPrefix
    this.setRoomMetadata()
    if (!this.maintenance) {
      this.botsActive()
    }
  }

  newGame() {
    this.state.status = RoomStatus.WAITING
    this.state.isRunning = false
    this.state.deck = Array.from(Array(52).keys()).sort((a: number, b: number) => Math.random() - 0.5)
    this.state.garbage = []
    if (Object.keys(this.state.players).length) {
      for (const id in this.state.players) {
        let player: Player = this.state.players[id]
        if (player.isPlayer && player.isReady) player.isReady = false
        player.cards = []
        player.isPlaying = false
        player.skipResult = false
        player.action = ''
        player.doneOpening = false
        player.isDropState = false
        player.canKang = false
        player.canDraw = false
        player.canFlow = false
        player.kang = false
        player.cards = []
        player.flow = []
        player.flowed = []
        player.flowEarn = 0
      }
    }
    if (!this.maintenance && !this.closeRoom && !this.isMockingState) {
      this.prepare()
    } else {
      this.lock()
      this.disconnect()
      this.forceSetNewState()
    }
  }

  async prepare() {
    this.state.isRunning = true
    let roundTime: number = this.randomCountdown.close ? Time.BEFORE_START : Object.keys(this.state.players).length > this.minClients ? this.randomCountdown.time : Time.BEFORE_START
    this.prepareInterval = this.clock.setInterval(async () => {
      if (this.maintenance || this.closeRoom) {
        this.lock()
        this.disconnect()
        this.forceSetNewState()
      } else if (Object.keys(this.state.players).length < this.minClients) {
        this.state.isRunning = false
        this.prepareInterval.clear()
      } else if (--roundTime === -1) {
        this.prepareInterval.clear()
        this.removeDuplicateSequence()
        this.state.status = RoomStatus.PLAYING
        if (Object.keys(this.state.players).length >= this.minClients) {
          let numberPlayers: number = 0
          let playerList: Player[] = Object.values(this.state.players).filter((v: any) => v.isPlayer && v.isReady)
          for (const player of playerList) {
            player.isPlaying = true
          }
          if (ENVIRONMENT !== Environment.DEMO && playerList.length) {
            let _round: any = await controller.getRound(this.rankId, this.roomId)
            if (_round) {
              this.roundId = _round.roundId
              let _users: userInterface.IUserBet[] = playerList.map((v: any): userInterface.IUserBet => ({
                username: v.username,
                source: v.source,
                type: 'PLAYER',
                amount: this.limit.player,
              }))
              let paidPlayer: number = 0
              for (const user of _users) {
                let _uuid: string = uuid()
                const _bet: any = await controller.betting(this.roomId, this.rankId, this.roundId, user, _uuid)
                if (_bet) {
                  paidPlayer++
                  let player: Player = Object.values(this.state.players).find((v: Player) => v._id === _bet.data._id)
                  if (player && player.isReady) player.isPlaying = true
                } else {
                  let player: Player = Object.values(this.state.players).find((v: Player) => v.username === user.username)
                  if (player) {
                    player.insuffBalanceForce = true
                    this.kickPlayer(player, 4105)
                  }
                }
              }
              if (paidPlayer === 0) {
                this.disconnect()
                return
              }
            } else {
              this.disconnect()
              return
            }
          }
          for (let id in this.state.players) {
            numberPlayers++
            let player: Player = this.state.players[id]
            if (player && !player.isPlayer) {
              player.isPlaying = true
            }
          }
          await this.state.shuffler()
          let startSequence: number = 0
          this.currentCrown = ''
          for (const id of this.lastRoundPlayerList) {
            if (this.state.players[id]) {
              startSequence = this.state.players[id].sequence
              this.currentCrown = id
            }
          }
          for (let id in this.state.players) {
            let client: Client = this.clients.filter((v: any) => v.sessionId === this.state.players[id].sessionId)[0]
            if (client) {
              if (this.state.players[id].isPlaying) {
                this.send(client, response(Event.START_PLAYING, 0, {
                  players: this.state.dealingData(startSequence, this.maxClients),
                  cards: this.state.players[id].cards,
                  score: this.state.players[id].cards.reduce((p: number, c: number) => p + (((c % 13) + 1) > 9 ? 10 : ((c % 13) + 1)), 0),
                  deck: this.state.deck.length,
                }))
              } else {
                this.send(client, response(Event.START_PLAYING, 0, { players: this.state.dealingData(startSequence, this.maxClients), cards: [], deck: this.state.deck.length }))
              }
            }
          }
          this.clock.setTimeout(() => {
            this.cardOpenState()
            return
          }, (Time.DEALING * 1000) + ((Time.DEALING_PER_PLAYER * 1000) * Object.values(this.state.players).filter((v: Player) => v.isPlaying).length) * 5)
        } else {
          if (!Object.keys(this.state.players).length) {
            this.state.isRunning = false
            this.initial()
            return
          } else {
            this.state.isRunning = false
            return
          }
        }
      } else if (roundTime < -1) {
        this.disconnect()
      } else if (Object.keys(this.state.players).length < this.minClients) {
        this.state.status = RoomStatus.WAITING
        this.prepareInterval.clear()
        this.state.isRunning = false
      } else {
        this.broadcast(response(Event.BEFORE_START, 0, { cd: roundTime }))
      }
    }, 1000)
  }

  cardOpenState() {
    let roundTime = Time.OPENING
    this.state.isOpeningState = true
    this.openInterval = this.clock.setInterval(async () => {
      for (const id in this.state.players) {
        let player: Player = this.state.players[id]
        if (player && !player.isPlayer && player.isPlaying && !player.doneOpening && Math.random() > 0.35) {
          this.bots[player.sessionId].value = Math.random() > 0.1 ? (~~(Math.random() * 2) + 4) : (~~(Math.random() * 3) + 1)
          player.doneOpening = true
          this.broadcast(response(Event.PLAYER_OPEN, 0, player.getOpenData()))
        }
      }
      let unOpeningList: Player[] = Object.values(this.state.players).filter((v: Player) => v.isPlaying && !v.doneOpening)
      if (--roundTime <= -1 || !unOpeningList.length) {
        this.state.isOpeningState = false
        this.openInterval.clear()
        let special: any = specialCalculator(Object.values(this.state.players))
        if (special.length) {
          this.broadcast(response(Event.OPENING_STATE_END, 0, { special: special }))
          return this.endRound(EndType.SPECIAL, 0, special)
        } else {
          this.broadcast(response(Event.OPENING_STATE_END, 0, {}))
        }
        this.playingState()
      } else {
        this.broadcast(response(Event.OPENING_STATE, 0, { cd: roundTime, start: Time.OPENING - 1 }))
      }
    }, 1000)
  }

  async playingState() {
    let start: number = 0
    let playingPlayers: Player[] = Object.values(this.state.players).filter((v: Player) => v.isPlaying)
    this.currentCrown = ''
    for (const id of this.lastRoundPlayerList) {
      if (this.state.players[id]) {
        start = this.state.players[id].sequence
        this.currentCrown = id
      }
    }
    let queue: any[] = playingPlayers.map((v: Player) => ({ sequence: v.sequence, time: Time.ROUND, dropState: false, endFlowState: false })).sort((a: any, b: any) => ((a.sequence + this.maxClients - start) % this.maxClients) - ((b.sequence + this.maxClients - start) % this.maxClients))
    let index: number = 0
    let round: number = 0
    this.state.deck = this.state.deck.sort((a: number, b: number) => Math.random() - 0.5)
    this.playingStateInterval = this.clock.setInterval(() => {
      if (index === queue.length) {
        index = 0
        round++
        this.checkInactiveWarning()
        let nextPlayer: Player = Object.values(this.state.players).find((v: Player) => v.sequence === queue[index].sequence)
        if (!nextPlayer.isPlayer) this.bots[nextPlayer.sessionId].value = Math.random() > 0.1 ? (~~(Math.random() * 2) + 4) : (~~(Math.random() * 3) + 1)
      }
      let player: Player = Object.values(this.state.players).find((v: Player) => v.sequence === queue[index].sequence)
      if (queue[index].dropState) {
        if (!player.isPlayer && this.bots[player.sessionId].value === queue[index].time) {
          this.botDrop(player)
        }
        if (player.action === Action.KNOCK) {
          this.playingStateInterval.clear()
          this.endRound(player.action, round)
          player.action = ''
          return
        }
        if (--queue[index].time < 0 || player.action === Action.DROP) {
          if (!player.action) {
            player.isPlayerRound = false
            player.dropRound = false
            let highestScore: number = player.cards.map((v: number) => v % 13).sort((a: number, b: number) => b - a)[0]
            let dropSet: number[] = player.cards.filter((v: number) => v % 13 === highestScore)
            this.state.garbage = [...this.state.garbage, { target: player.sessionId, cards: dropSet, level: 0 }]
            player.cards = player.cards.filter((v: number) => !new Set(dropSet).has(v))
            let client: Client | undefined = this.clients.find((v: any) => v.sessionId === player.sessionId)
            if (client) {
              this.send(client, response(Event.PLAYER_ACTION, 0, {
                action: Action.DROP,
                sessionId: player.sessionId,
                sequence: player.sequence,
                cards: player.cards,
                cardsNumber: player.cards.length,
                drop: dropSet,
                score: player.cards.reduce((p: number, c: number) => p + (((c % 13) + 1) > 9 ? 10 : ((c % 13) + 1)), 0),
              }))
              this.broadcast(response(Event.PLAYER_ACTION, 0, player.getDropData(dropSet, this.state.deck.length)), { except: client })
            } else {
              this.broadcast(response(Event.PLAYER_ACTION, 0, player.getDropData(dropSet, this.state.deck.length)))
            }
            if (player.cards.length === 0) {
              player.action = Action.KNOCK
              this.playingStateInterval.clear()
              this.endRound(player.action, round)
              player.action = ''
              return
            }
            if (!player.cards.length) {
              player.action = Action.KNOCK
            }
          }
          if (!this.state.deck.length) {
            player.action = Action.END
            this.playingStateInterval.clear()
            this.endRound(player.action, round)
            player.action = ''
            return
          } else {
            player.action = ''
            queue[index].time = Time.ROUND
            queue[index].dropState = false
            index++
          }
        } else {
          let client: Client | undefined = this.clients.find((v: any) => v.sessionId === player.sessionId)
          if (client) {
            let highestScore: number = player.cards.map((v: number) => v % 13).sort((a: number, b: number) => b - a)[0]
            let dropSet: number[] = player.cards.filter((v: number) => v % 13 === highestScore)
            this.broadcast(response(Event.DROP_STATE, 0, {
              sessionId: player.sessionId,
              sequence: player.sequence,
              cardsNumber: player.cards.length,
              cd: queue[index].time,
              start: Time.ROUND - 1,
            }), { except: client })
            this.send(client, response(Event.DROP_STATE, 0, {
              sessionId: player.sessionId,
              sequence: player.sequence,
              cardsNumber: player.cards.length,
              suggestion: dropSet,
              cd: queue[index].time,
              start: Time.ROUND - 1,
            }))
          } else {
            this.broadcast(response(Event.DROP_STATE, 0, {
              sessionId: player.sessionId,
              sequence: player.sequence,
              cardsNumber: player.cards.length,
              cd: queue[index].time,
              start: Time.ROUND - 1,
            }))
          }
        }
      } else {
        if (!player.isPlayer) {
          if (player.canFlow && this.bots[player.sessionId].value === queue[index].time) {
            this.botFlow(player)
          } else if (player.canDraw && this.bots[player.sessionId].value === queue[index].time) {
            this.botDraw(player, round)
          }
        }
        if (player.action === Action.KANG) {
          player.kang = true
          this.playingStateInterval.clear()
          this.endRound(round === 0 ? EndType.KANG_FIRST_ROUND : EndType.KANG, round)
          player.action = ''
          return
        } else if (player.action === Action.END) {
          this.playingStateInterval.clear()
          this.endRound(player.action, round)
          player.action = ''
          return
        } else if (player.action === Action.FLOW && !player.cards.length) {
          this.playingStateInterval.clear()
          this.endRound(player.action, round)
          player.action = ''
          return
        } else if (--queue[index].time < 0 || player.action) {
          if (!player.action && this.state.deck.length) {
            player.isPlayerRound = false
            player.dropRound = true
            queue[index].dropState = true
            queue[index].time = Time.ROUND
            let card: number = this.state.deck.splice(0, 1)[0]
            player.cards = [...player.cards, card]
            let client: Client | undefined = this.clients.find((v: any) => v.sessionId === player.sessionId)
            if (client) {
              this.send(client, response(Event.PLAYER_ACTION, 0, {
                action: Action.DRAW,
                sessionId: player.sessionId,
                sequence: player.sequence,
                cards: player.cards,
                cardsNumber: player.cards.length,
                draw: card,
                deck: this.state.deck.length,
                score: player.cards.reduce((p: number, c: number) => p + (((c % 13) + 1) > 9 ? 10 : ((c % 13) + 1)), 0),
              }))
              this.broadcast(response(Event.PLAYER_ACTION, 0, player.getDrawData(this.state.deck.length)), { except: client })
            } else {
              this.broadcast(response(Event.PLAYER_ACTION, 0, player.getDrawData(this.state.deck.length)))
            }
          }
          queue[index].time = Time.ROUND
          if (player.action === Action.DRAW) {
            player.isPlayerRound = false
            player.dropRound = true
            queue[index].dropState = true
            queue[index].time = Time.ROUND
          } else if (player.action === Action.FLOW) {
            player.isPlayerRound = false
            player.dropRound = false
            queue[index].dropState = false
            queue[index].time = Time.ROUND
            index++
          }
          player.action = ''
        } else {
          let flow: any = {}
          player.isPlayerRound = true
          player.canKang = true
          player.canDraw = this.state.deck.length > 0
          player.canFlow = false
          if (this.state.garbage.length > 0 && player.cards.map((v: number) => v % 13).indexOf(this.state.garbage[this.state.garbage.length - 1].cards[0] % 13) > -1) {
            player.canFlow = true
            flow = { flow: player.cards.filter((v: number) => v % 13 === this.state.garbage[this.state.garbage.length - 1].cards[0] % 13) }
          }
          let client: Client | undefined = this.clients.find((v: any) => v.sessionId === player.sessionId)
          if (client) {
            this.broadcast(response(Event.PLAYING_STATE, 0, {
              sessionId: player.sessionId,
              sequence: player.sequence,
              cd: queue[index].time,
              start: Time.ROUND - 1,
            }), { except: client })
            this.send(client, response(Event.PLAYING_STATE, 0, {
              sessionId: player.sessionId,
              sequence: player.sequence,
              cd: queue[index].time,
              start: Time.ROUND - 1,
              canKang: player.canKang,
              canDraw: player.canDraw,
              canFlow: player.canFlow,
              ...flow,
            }))
          } else {
            this.broadcast(response(Event.PLAYING_STATE, 0, {
              sessionId: player.sessionId,
              sequence: player.sequence,
              cd: queue[index].time,
              start: Time.ROUND - 1,
            }))
          }
        }
      }
    }, 1000)
  }

  async endRound(type: string, round: number = 0, special: any[] = []) {
    this.state.status = RoomStatus.OPENING
    let ms: number = 0
    switch (type) {
      case EndType.END: ms = 1000
        break;
      case EndType.FLOW: ms = 1000
        break;
      case EndType.KANG: ms = 1000
        break;
      case EndType.KANG_FIRST_ROUND: ms = 1000
        break;
      case EndType.KNOCK: ms = 2000
        break;
      case EndType.SPECIAL: ms = 0
        break;
    }

    setTimeout(async () => {
      let COMMISSION: number = ENVIRONMENT === Environment.DEMO ? 0.03 : 0
      let _users: userInterface.IUserPayout[] = []
      let players: Player[] = Object.values(this.state.players).filter((v: any) => v.isPlaying)
      let result: any[] = []
      if (type === EndType.SPECIAL) {
        result = special
        result[0].earn = 0
        let balance: number = 0
        for (let index = 1; index < result.length; index++) {
          result[index].earn = 0
          result[index].multiplier = -result[0].multiplier
          result[index].wallet = {
            balance: this.state.players[result[index].sessionId].wallet.balance - (result[0].multiplier * this.limit.bet.min)
          }
          balance += result[0].multiplier * this.limit.bet.min
        }
        result[0].multiplier *= (result.length - 1)
        result[0].wallet = {
          balance: this.state.players[result[0].sessionId].wallet.balance + balance
        }
      } else {
        result = coreLogic(players, round, this.state.deck.length, type === EndType.FLOW ? this.state.flowTarget : '')
      }
      for (let i = 0; i < result.length; i++) {
        if (ENVIRONMENT !== Environment.DEMO && this.state.players[result[i].sessionId].isPlayer) {
          _users = [..._users, {
            username: this.state.players[result[i].sessionId].username,
            source: this.state.players[result[i].sessionId].source,
            type: 'PLAYER',
            amount: this.limit.player + (result[i].multiplier * this.limit.bet.min) + result[i].earn,
            returnAmount: this.limit.player,
            winlose: (result[i].multiplier * this.limit.bet.min) + result[i].earn,
            detail: result[i].cards,
          }]
        }
        result[i].value = result[i].multiplier * this.limit.bet.min
        result[i].flow.flowValue = (result[i].flow.flowScore * this.limit.bet.min) / 2
        result[i].flow.flowedValue = -((result[i].flow.flowedScore * this.limit.bet.min) / 2)
        result[i].earn = result[i].value + result[i].flow.flowValue + result[i].flow.flowedValue
        result[i].winlose = result[i].earn
        result[i].wallet = this.state.players[result[i].sessionId].wallet
      }

      if (_users.length) {
        let _result = {
          type,
          players: result.map((v: any): userInterface.IUserResult => ({
            username: this.state.players[v.sessionId].isPlayer ? v.username : '',
            nickname: this.state.players[v.sessionId].encodeNickname(),
            source: v.source,
            avatar: v.avatar,
            amount: v.earn,
            detail: {
              kang: v.kang,
              win: v.win,
              cards: v.cards,
              flower: v.flower,
              isFlowed: v.isFlowed,
              value: v.value,
              flow: v.flow,
              score: v.score,
            },
          }))
        }
        for (const user of _users) {
          let _uuid: string = uuid()
          let _payout = await controller.payout(this.roomId, this.rankId, this.roundId, user, _result, _uuid)
          if (_payout) {
            let player: Player = Object.values(this.state.players).find((v: Player) => v._id === _payout.data._id)
            let _res: any = result.find((v: any) => v.username === _payout.data.username)
            if (player && player.isPlaying && _res) {
              player.wallet.balance = _payout.data.balance.after
              _res.wallet.balance = _payout.data.balance.after
              _res.earn = _payout.data.amount
            }
            if (_payout.commission) COMMISSION = _payout.commission
          } else {
            let _payout: any = await processRetry('payout', { roomId: this.roomId, rankId: this.rankId, roundId: this.roundId, user: user, _result, uuid: _uuid })
            if (_payout) {
              let player: Player = Object.values(this.state.players).find((v: Player) => v._id === _payout.data._id)
              let _res: any = result.find((v: any) => v.username === _payout.data.username)
              if (player && player.isPlaying && _res) {
                player.wallet.balance = _payout.data.balance.after
                _res.wallet.balance = _payout.data.balance.after
                _res.earn = _payout.data.amount
              }
              if (_payout.data.commission) COMMISSION = _payout.data.commission
            }
          }
        }
      }
      if (COMMISSION) result.forEach((v: any) => {
        if (this.state.players[v.sessionId] && !this.state.players[v.sessionId].isPlayer || ENVIRONMENT === Environment.DEMO) {
          v.earn = v.earn > 0 ? Number((v.earn * (1 - COMMISSION)).toFixed(2)) : v.earn
          v.wallet = {
            balance: this.state.players[v.sessionId].wallet.balance + v.earn
          }
          this.state.players[v.sessionId].wallet.balance = v.wallet.balance
        }
      })

      result = result.sort((a: any, b: any) => b.earn - a.earn || a.score - b.score)
      this.broadcast(response(Event.RESULT, 0, { type, result }))
      if (type === EndType.SPECIAL) {
        this.lastRoundPlayerList = result.sort((a: any, b: any) => b.score === 50 ? 0 : b.score - a.score === 50 ? 0 : a.score).map((v: any, i: number) => v.sessionId)
      } else {
        this.lastRoundPlayerList = result.map((v: any, i: number) => v.sessionId)
      }
      this.lastRoundPlayerList.reverse()
      this.clock.setTimeout(() => {
        this.state.status = RoomStatus.RESULTING
        let roundTime = Time.SUMMARY
        for (const id in this.bots) {
          this.bots[id].value = ~~(Math.random() * 9) + 2
        }
        this.checkBotScript()
        this.resultInterval = this.clock.setInterval(() => {
          for (let id in this.bots) {
            if (this.bots[id].value === roundTime && !this.state.players[id].skipResult) this.state.players[id].skipResult = true
          }
          let isAlreadySkip: boolean = Object.values(this.state.players).filter((v: any) => v.isPlaying).every((v: any) => v.skipResult)
          this.broadcast(response(Event.SUMMARY, 0, {
            type,
            summary: result.sort((a: any, b: any) => b.earn - a.earn || a.score - b.score),
            cd: --roundTime,
            start: Time.SUMMARY - 1,
          }))
          if (roundTime === -1 || isAlreadySkip) {
            if (this.botsAmount.count === this.botsAmount.endCount) this.setBotsAmount()
            this.resultInterval.clear()
            this.randomCountdown.close = true
            this.clearPlayersLowBalance()
            this.clearPlayersDisconnect()
            this.checkInactivePlayer()
            this.newGame()
          } else if (roundTime < -1) {
            this.disconnect()
          }
        }, 1000)
      }, (result.length * 1300) + 2000)
    }, ms)
  }

  playerOpenCard(client: Client) {
    let player: Player = this.state.players[client.sessionId]
    if ((this.state.status === RoomStatus.PLAYING && this.state.isOpeningState) && player && player.isPlaying && !player.doneOpening) {
      player.doneOpening = true
      this.send(client, response(Event.OPEN_CARD_RESPONSE, 0, {}))
      this.broadcast(response(Event.PLAYER_OPEN, 0, player.getOpenData()), { except: client })
    } else {
      this.send(client, response(Event.BET_RESPONSE, 999, {}))
    }
  }

  playerAction(client: Client, data: any) {
    const { action, cards } = data
    let player: Player = this.state.players[client.sessionId]
    if (cards && cards.length) {
      for (const card of cards) {
        if (!player.cards.includes(card)) return this.send(client, response(Event.ACTION_RESPONSE, 999, {}))
      }
    }
    if (!player.action && action === Action.DROP && this.state.status === RoomStatus.PLAYING && player.isPlaying && !player.isPlayerRound && player.dropRound) {
      player.action = action
      let dropSet: number[] = cards
      if (!cards.length) {
        let highestScore: number = player.cards.map((v: number) => v % 13).sort((a: number, b: number) => b - a)[0]
        dropSet = player.cards.filter((v: number) => v % 13 === highestScore)
      }
      this.state.garbage = [...this.state.garbage, { target: player.sessionId, cards: dropSet, level: 0 }]
      player.cards = player.cards.filter((v: number) => !new Set(dropSet).has(v))
      if (player.cards.length === 0) {
        player.action = Action.KNOCK
      }
      player.dropRound = false
      this.send(client, response(Event.ACTION_RESPONSE, 0, {
        action: Action.DROP,
        sessionId: player.sessionId,
        sequence: player.sequence,
        cards: player.cards,
        cardsNumber: player.cards.length,
        drop: dropSet,
        score: player.cards.reduce((p: number, c: number) => p + (((c % 13) + 1) > 9 ? 10 : ((c % 13) + 1)), 0),
      }))
      this.broadcast(response(Event.PLAYER_ACTION, 0, player.getDropData(cards, this.state.deck.length)), { except: client })
    } else if (this.state.status === RoomStatus.PLAYING && player.isPlaying && player.isPlayerRound) {
      let draw: any = {}
      let flow: any = {}
      let target: any = {}
      if (player.canDraw && action === Action.DRAW) {
        player.action = action
        let card: number = this.state.deck.splice(0, 1)[0]
        player.cards = [...player.cards, card]
        draw = { draw: card }
      } else if (player.canFlow && action === Action.FLOW && this.state.garbage.length) {
        player.action = action
        let lastFlow: any = this.state.garbage[this.state.garbage.length - 1]
        let flowedPlayer: Player = this.state.players[lastFlow.target]
        this.state.flowTarget = lastFlow.target
        if (player.cards.map((v: number) => v % 13).indexOf(this.state.garbage[this.state.garbage.length - 1].cards[0] % 13) > -1) {
          let flowSet = player.cards.filter((v: number) => v % 13 === lastFlow.cards[0] % 13)
          let level: number = lastFlow.level + flowSet.length
          let flowEarn: number = this.limit.bet.min * flowSet.length * 0.5
          player.cards = player.cards.filter((v: number) => v % 13 !== lastFlow.cards[0] % 13)
          flowedPlayer.flowed = [...flowedPlayer.flowed, ...flowSet]
          player.flow = [...player.flow, ...flowSet]
          player.flowEarn += flowEarn
          player.wallet.balance += flowEarn
          flowedPlayer.flowEarn -= flowEarn
          flowedPlayer.wallet.balance -= flowEarn
          this.state.garbage = [...this.state.garbage, { target: flowedPlayer.sessionId, cards: flowSet, level }]
          target = {
            sessionId: flowedPlayer.sessionId,
            sequence: flowedPlayer.sequence,
            wallet: {
              balance: flowedPlayer.wallet.balance,
            },
            earn: -flowEarn,
            level,
          }
          flow = {
            target,
            flow: flowSet,
            wallet: {
              balance: player.wallet.balance,
            },
            earn: flowEarn,
          }
        } else if (this.state.deck.length) {
          player.action = Action.DRAW
          let card: number = this.state.deck.splice(0, 1)[0]
          player.cards = [...player.cards, card]
          draw = { draw: card }
        }
        if (!this.state.deck.length) {
          player.action = Action.END
        }
      } else if (player.canKang && action === Action.KANG) {
        player.action = action
      } else if (this.state.deck.length) {
        player.action = Action.DRAW
        let card: number = this.state.deck.splice(0, 1)[0]
        player.cards = [...player.cards, card]
        draw = { draw: card }
      } else {
        player.action = Action.END
      }
      player.isPlayerRound = false
      let _action: string = (action === Action.FLOW && player.cards.length === 0) ? Action.FLOW_END : action
      this.send(client, response(Event.ACTION_RESPONSE, 0, {
        sessionId: player.sessionId,
        action: _action,
        sequence: player.sequence,
        cards: player.cards,
        cardsNumber: player.cards.length,
        deck: this.state.deck.length,
        score: player.cards.reduce((p: number, c: number) => p + (((c % 13) + 1) > 9 ? 10 : ((c % 13) + 1)), 0),
        ...draw,
        ...flow,
      }))
      this.broadcast(response(Event.PLAYER_ACTION, 0, player.getActionData(_action, cards, this.state.deck.length, flow)), { except: client })
    } else {
      this.send(client, response(Event.ACTION_RESPONSE, 999, {}))
      return
    }
  }

  sendRoomData(client: Client) {
    let player: Player = this.state.players[client.sessionId]
    if (player && !player.connected) {
      player.connected = true
      this.send(client, response(Event.ENTER_ROOM, 0, {
        roomId: this.roomId,
        state: this.state.status,
        players: this.state.playersData(),
        prefix: this.rankPrefix,
        limit: this.limit,
        deck: this.state.deck.length,
        garbage: this.state.garbage.map((v: any) => v.cards),
        currentCrown: this.currentCrown,
        user: player.getData()
      }))
    }
  }

  skipResult(client: Client) {
    let player: Player = this.state.players[client.sessionId]
    if (this.state.status === RoomStatus.RESULTING && player && !player.skipResult) {
      player.skipResult = true
      this.send(client, response(Event.SKIP_RESPONSE, 0, {}))
    } else {
      this.send(client, response(Event.SKIP_RESPONSE, 999, {}))
    }
  }

  playerIsReady(client: Client) {
    let player: Player = this.state.players[client.sessionId]
    if (player && !player.isReady) player.isReady = true
  }

  clearPlayersLowBalance() {
    let playersArr: Player[] = Object.values(this.state.players).filter((v: Player) => v.isPlaying)
    if (playersArr.length) {
      for (let i = 0; i <= playersArr.length - 1; i++) {
        if (playersArr[i].wallet.balance < this.limit.player) {
          if (playersArr[i].isPlayer) {
            playersArr[i].insuffBalanceForce = true
            this.kickPlayer(playersArr[i], 4101)
          } else {
            this.deletePlayer(playersArr[i])
          }
        }
      }
    }
  }

  clearPlayersDisconnect() {
    for (const id in this.state.players) {
      let player: Player = this.state.players[id]
      if (player && player.isPlayer) {
        let client: Client | undefined = this.clients.find((v: any) => v.sessionId === player.sessionId)
        if (!client) player.connected = false
        if (!player.connected) {
          this.deletePlayer(player)
        }
      }
    }
  }

  checkInactivePlayer() {
    for (const id in this.state.players) {
      let player: Player = this.state.players[id]
      if (player && player.isPlayer && new Date().getTime() - player.lastActive > 4 * 60 * 1000) {
        this.kickPlayer(player, 4102)
      }
    }
  }

  checkInactiveWarning() {
    for (const id in this.state.players) {
      let player: Player = this.state.players[id]
      if (player && player.isPlayer && new Date().getTime() - player.lastActive > 3 * 60 * 1000) {
        let client: Client | undefined = this.clients.find((v: any) => v.sessionId === player.sessionId)
        if (client) {
          this.send(client, response(Event.INACTIVE_WARNING, 0, {}))
        }
      }
    }
  }

  kickPlayer(player: Player, code: number) {
    if (player) {
      let client: Client | undefined = this.clients.find((v: any) => v.sessionId === player.sessionId)
      if (client) {
        client.close(code)
        setTimeout(() => { this.deletePlayer(player) }, 100)
      } else if (this.state.status !== RoomStatus.PLAYING && this.state.status !== RoomStatus.OPENING) {
        this.deletePlayer(player)
      }
    }
  }

  disconnectPlayer(player: Player, code: number) {
    if (player) {
      let client: Client | undefined = this.clients.find((v: any) => v.sessionId === player.sessionId)
      if (client) {
        client.close(code)
      } else if (this.state.status !== RoomStatus.PLAYING && this.state.status !== RoomStatus.OPENING) {
        this.deletePlayer(player)
      }
    }
  }

  deletePlayer(player: Player) {
    if (player) {
      if (Object.values(this.state.players).filter((v: Player) => v.sequence === player.sequence).length === 1) this.availableSequence = [...this.availableSequence, player.sequence]
      this.playerOut(player)
      if (this.state.players[player.sessionId] && this.state.players[player.sessionId].isPlayer) this.unlock()
      if (ENVIRONMENT !== Environment.DEMO) this.Redis.delPlayer(this.roomId, player.username, player.source)
      delete this.bots[player.sessionId]
      delete this.state.players[player.sessionId]
      this.setRoomMetadata()
      if (this.state.isAllowDispose() && this.state.isAllBots()) {
        this.disconnect()
      }
    }
  }

  forceSetNewState() {
    if (this.state.status === RoomStatus.WAITING && (this.maintenance || this.closeRoom)) {
      if (ENVIRONMENT !== Environment.DEMO) {
        for (const player of Object.values(this.state.players)) {
          this.Redis.delPlayer(this.roomId, player.username, player.source)
        }
      }
      delete this.rooms[this.roomId]
      let state: any = new State
      this.setState(state)
    }
  }

  playerOut(player: Player) {
    if (player) {
      this.broadcast(response(Event.PLAYER_OUT, 0, {
        roomId: this.roomId,
        state: this.state.status,
        sessionId: player.sessionId,
        profile: {
          gender: player.profile.gender,
          nickname: player.encodeNickname(),
        },
        sequence: player.sequence,
      }))
    }
  }

  removeDuplicateSequence() {
    let duplicateSequence: number[] = Object.values(this.state.players).map((v: Player) => v.sequence).filter((v: number, i: number, a: number[]) => {
      return a.filter((w: number) => w === v).length > 1 ? a.filter((w: number) => w === v) : false
    })
    let distinctSequence: number[] = [...new Set(duplicateSequence)]
    if (distinctSequence.length) {
      for (let seq of distinctSequence) {
        let players: any[] = Object.values(this.state.players).filter((c: Player) => c.sequence === seq)
        if (players.length) {
          let player: Player = players.splice(0, 1)[0]
          for (let i = 0; i < players.length; i++) {
            if (!players[i].isPlayer) {
              this.deletePlayer(players[i])
            } else {
              this.kickPlayer(players[i], 4102)
            }
          }
          this.broadcast(response(Event.PLAYER_IN, 0, {
            sessionId: player.sessionId,
            avatar: player.avatar,
            profile: {
              gender: player.profile.gender,
              nickname: player.encodeNickname(),
            },
            isPlaying: player.isPlayer,
            wallet: player.wallet,
            sequence: player.sequence,
          }))
        }
      }
    }
    return
  }

  fireEmoji(client: Client, data: any) {
    let from: Player = this.state.players[client.sessionId]
    let to: Player = this.state.players[data.to.sessionId]
    if (from && to) {
      this.broadcast(response(Event.FIRE_EMOJI, 0, {
        emojiId: data.emojiId,
        from: {
          sessionId: from.sessionId,
          wallet: from.wallet,
        },
        to: {
          sessionId: to.sessionId,
          wallet: to.wallet,
        },
      }))
    } else {
      this.send(client, response(Event.FIRE_EMOJI_ERROR, 999, {}))
    }
  }

  /**
   * BOTS
   */

  botsActive() {
    let timeInterval: number = ENVIRONMENT === Environment.DEMO ? 60000
      : this.rankLevel === RankLevel.LOW || this.rankLevel === RankLevel.MEDIUM ? (~~(Math.random() * Object.keys(this.state.players).length) * 1000) + 5000
        : (~~(Math.random() * Object.keys(this.state.players).length) * 10000) + 60000
    let amountBots: number = ENVIRONMENT === Environment.DEMO || this.rankLevel === RankLevel.HIGH ? ~~(Math.random() * 2) + 2
      : ~~(Math.random() * 2) + 3
    this.setupBotScript(amountBots)
    this.clock.setTimeout(() => {
      this.botsInterval = this.clock.setInterval(() => {
        if (Object.keys(this.state.players).length !== this.maxClients) {
          this.setupBotScript()
        }
      }, timeInterval)
    }, 5000)
  }

  setBotsAmount() {
    if (this.rankLevel === RankLevel.LOW) {
      if (this.botsAmount.index === 0) {
        this.botsAmount.index = 1
        this.botsAmount.endCount = ~~(Math.random() * 11) + 5
      } else {
        this.botsAmount.index = 0
        this.botsAmount.amount[0] = ~~(Math.random() * 3) + 1
        this.botsAmount.endCount = ~~(Math.random() * 5) + 2
      }
    } else if (this.rankLevel === RankLevel.MEDIUM || this.rankLevel === RankLevel.HIGH) {
      if (this.botsAmount.index === 0) {
        this.botsAmount.index = 1
        this.botsAmount.amount[1] = ~~(Math.random() * 2) + 2
        this.botsAmount.endCount = ~~(Math.random() * 11) + 5
      } else {
        this.botsAmount.index = 0
        this.botsAmount.amount[0] = 1
        this.botsAmount.endCount = ~~(Math.random() * 6) + 2
      }
    }
    this.botsAmount.count = 0
  }

  setupBotScript(amount: number = 0) {
    if (!this.maintenance && !this.closeRoom) {
      this.availableBots = amount ? amount : this.botsAmount.amount[this.botsAmount.index]
      let playersNumber: number = Object.keys(this.state.players).length
      let botsNumber: number = Object.values(this.state.players).filter((v: Player) => !v.isPlayer).length
      if (playersNumber < this.maxClients && botsNumber < this.availableBots) {
        let availableSequence: number = ENVIRONMENT === Environment.DEMO ? this.availableSequence.splice(0, 1)[0] : this.availableSequence.splice(~~(Math.random() * this.availableSequence.length), 1)[0]
        let player!: Player
        if (ENVIRONMENT === Environment.DEMO) {
          player = new Player().demoPlayer(availableSequence)
        } else {
          player = new Player().dummyPlayer(this.limit, availableSequence)
        }
        if (player && player.wallet.balance >= this.limit.player) {
          this.bots[player.sessionId] = {
            value: 0,
            roundCount: 0,
            leaveCounter: Math.random() < 0.25 ? ~~(Math.random() * 10) + 5 : Math.random() < 0.15 ? 0 : ~~(Math.random() * 3) + 1
          }
          this.state.players[player.sessionId] = player
          this.broadcast(response(Event.PLAYER_IN, 0, {
            sessionId: player.sessionId,
            profile: {
              gender: player.profile.gender,
              nickname: player.encodeNickname(),
            },
            avatar: player.avatar,
            wallet: player.wallet,
            sequence: player.sequence,
          }))
          this.setRoomMetadata()
          if (ENVIRONMENT !== Environment.DEMO) this.Redis.setPlayer(this.rankPrefix, player, this.roomId)
          if (amount !== 0) this.setupBotScript(amount--)
          if (this.bots[player.sessionId].leaveCounter === 0) {
            if (this.state.status !== RoomStatus.WAITING) {
              this.clock.setTimeout(() => {
                this.deletePlayer(player)
              }, ~~(Math.random() * 5000) + 1500)
            } else {
              this.bots[player.sessionId].leaveCounter = ~~(Math.random() * 4) + 2
            }
          }
          if (Object.keys(this.state.players).length === this.maxClients) this.lock()
          if (Object.keys(this.state.players).length >= this.minClients && !this.state.isRunning) this.prepare()
        } else {
          if (player && Object.values(this.state.players).filter((v: Player) => v.sequence === player.sequence).length === 1) this.availableSequence = [...this.availableSequence, player.sequence]
        }
      }
    }
  }

  checkBotScript() {
    if (Object.keys(this.bots).length) {
      for (const id in this.bots) {
        let player: Player = this.state.players[id]
        if (player && player.isPlaying) {
          if (this.bots[id] && this.bots[id].roundCount === this.bots[id].leaveCounter) {
            this.clock.setTimeout(() => {
              this.deletePlayer(player)
            }, ~~(Math.random() * 7000))
          }
        }
      }
    }
  }

  setRoomMetadata() {
    this.setMetadata({
      players: Object.values(this.state.players).length,
      ...this.roomMetadata
    })
  }

  plusFact(n: number, v: number = 0): number {
    return n === 0 ? v : this.plusFact(n - 1, v + n)
  }

  botDraw(player: Player, round: number) {
    setTimeout(() => {
      if (player && player.isPlayerRound) {
        let players: Player[] = Object.values(this.state.players).filter((v: Player) => v.isPlaying)
        let playerScoreIndex: number = Object.values(this.state.players).map((v: Player) => ({ sessionId: v.sessionId, score: v.cards.reduce((p: number, c: number) => p + (((c % 13) + 1) > 9 ? 10 : ((c % 13) + 1)), 0) })).sort((a: any, b: any) => a.score - b.score).findIndex((v: any) => v.sessionId === player.sessionId)
        let score: number = player.cards.reduce((p: number, c: number) => p + (((c % 13) + 1) > 9 ? 10 : ((c % 13) + 1)), 0)
        let kang0: boolean = score < 27 && playerScoreIndex === 0 && Math.random() > 0.7
        let kang1: boolean = round === 0 && ((score < 19) || ((score < 22 || (score < 25 && Math.random() > 0.5)) && !players.some((v: Player) => v.cards.length < 5)))
        let kang2: boolean = round > 0 && !players.some((v: Player) => v.cards.length < player.cards.length) && score < this.plusFact(player.cards.length)
        if (kang0 || kang1 || kang2) {
          player.action = Action.KANG
          this.broadcast(response(Event.PLAYER_ACTION, 0, player.getActionData(Action.KANG, [], this.state.deck.length, {})))
          return
        }
        player.action = Action.DRAW
        let card: number = this.state.deck.splice(0, 1)[0]
        player.cards = [...player.cards, card]
        this.broadcast(response(Event.PLAYER_ACTION, 0, player.getActionData(Action.DRAW, [], this.state.deck.length, {})))
        this.bots[player.sessionId].value = Math.random() > 0.1 ? (~~(Math.random() * 2) + 4) : (~~(Math.random() * 3) + 1)
      }
    }, ~~(Math.random() * 600) + 200)
  }

  botFlow(player: Player) {
    setTimeout(() => {
      if (player && player.isPlayerRound) {
        let flow: any = {}
        let target: any = {}
        let lastFlow: any = this.state.garbage[this.state.garbage.length - 1]
        let flowedPlayer: Player = this.state.players[lastFlow.target]
        this.state.flowTarget = lastFlow.target
        if (player.cards.map((v: number) => v % 13).indexOf(this.state.garbage[this.state.garbage.length - 1].cards[0] % 13) > -1) {
          player.action = Action.FLOW
          let flowSet = player.cards.filter((v: number) => v % 13 === lastFlow.cards[0] % 13)
          let level: number = lastFlow.level + flowSet.length
          let flowEarn: number = this.limit.bet.min * flowSet.length * 0.5
          player.cards = player.cards.filter((v: number) => v % 13 !== lastFlow.cards[0] % 13)
          flowedPlayer.flowed = [...flowedPlayer.flowed, ...flowSet]
          player.flow = [...player.flow, ...flowSet]
          player.flowEarn += flowEarn
          player.wallet.balance += flowEarn
          flowedPlayer.flowEarn -= flowEarn
          flowedPlayer.wallet.balance -= flowEarn
          this.state.garbage = [...this.state.garbage, { target: flowedPlayer.sessionId, cards: flowSet, level }]
          target = {
            sessionId: flowedPlayer.sessionId,
            sequence: flowedPlayer.sequence,
            wallet: {
              balance: flowedPlayer.wallet.balance,
            },
            earn: -flowEarn,
            level,
          }
          flow = {
            target,
            flow: flowSet,
            wallet: {
              balance: player.wallet.balance,
            },
            earn: flowEarn,
          }
          let _action: string = player.cards.length === 0 ? Action.FLOW_END : Action.FLOW
          this.broadcast(response(Event.PLAYER_ACTION, 0, player.getActionData(_action, [], this.state.deck.length, flow)))
        }
      }
    }, ~~(Math.random() * 600) + 200)
  }

  botDrop(player: Player) {
    setTimeout(() => {
      if (player && player.dropRound) {
        player.dropRound = false
        player.action = Action.DROP
        let dropSet: number[] = []
        if (Math.random() > 0.2) {
          let group: any[] = player.cards.reduce((p: any[], c: number, i: number, a: number[]) => {
            if (!p.filter((v: any) => v.score === c % 13).length) {
              p = [...p, {
                score: c % 13,
                sum: a.filter((v: number) => v % 13 === c % 13).reduce((p: number, c: number) => p + (((c % 13) + 1) > 9 ? 10 : ((c % 13) + 1)), 0)
              }]
            }
            return p
          }, []).sort((a: any, b: any) => b.sum - a.sum)
          let highestSet: any[] = group.filter((v: any) => v.sum === group[0].sum)
          let selectedHighest: number = highestSet[~~(Math.random() * highestSet.length)].score
          dropSet = player.cards.filter((v: any) => v % 13 === selectedHighest)
        } else {
          let highestScore: number = player.cards.map((v: number) => v % 13).sort((a: number, b: number) => b - a)[0]
          let dropAvailable: number[] = player.cards.filter((v: number) => v % 13 === highestScore || v % 13 > (highestScore > 10 ? 10 : highestScore) - 3)
          let selectedDrop: number = dropAvailable[~~(Math.random() * dropAvailable.length - 1)] % 13
          dropSet = player.cards.filter((v: number) => v % 13 === selectedDrop)
        }
        this.state.garbage = [...this.state.garbage, { target: player.sessionId, cards: dropSet, level: 0 }]
        player.cards = player.cards.filter((v: number) => !new Set(dropSet).has(v))
        if (player.cards.length === 0) {
          player.action = Action.KNOCK
        }
        this.broadcast(response(Event.PLAYER_ACTION, 0, player.getDropData(dropSet, this.state.deck.length)))
      }
    }, ~~(Math.random() * 600) + 200)
  }
}
