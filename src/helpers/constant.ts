export enum ApiPath {
  SET_MAINTENANCE = 'game/maintenance',
  GET_CONFIG = 'config/get',
  GET_PLAYER_INFO = 'player/info',
  GET_GAME_LIST = 'game/list',
  GET_GAME_STATUS = 'game/status',
  GET_BALANCE = 'dealing/balance',
  GET_ROUND = 'dealing/round',
  BET = 'dealing/bet',
  PAYOUT = 'dealing/payout',
  CANCEL = 'dealing/cancel/socket',
}

export enum Event {
  GET_ROOM_DATA = 'GET_ROOM_DATA',
  ENTER_ROOM = 'ENTER_ROOM',
  BEFORE_START = 'BEFORE_START',
  START_PLAYING = 'START_PLAYING',
  PLAYING = 'PLAYING',
  BETTING = 'BETTING',
  PLAYER_BET = 'PLAYER_BET',
  BET_RESPONSE = 'BET_RESPONSE',
  PLAYING_STATE = 'PLAYING_STATE',
  OPENING_STATE = 'OPENING_STATE',
  OPENING_STATE_END = 'OPENING_STATE_END',
  OPEN_CARD = 'OPEN_CARD',
  OPEN_CARD_RESPONSE = 'OPEN_CARD_RESPONSE',
  PLAYER_OPEN = 'PLAYER_OPEN',
  DROP_STATE = 'DROP_STATE',
  ACTION = 'ACTION',
  PLAYER_ACTION = 'PLAYER_ACTION',
  ACTION_RESPONSE = 'ACTION_RESPONSE',
  END_ROUND = 'END_ROUND',
  SUMMARY = 'SUMMARY',
  RESULT = 'RESULT',
  PLAYER_IN = 'PLAYER_IN',
  PLAYER_OUT = 'PLAYER_OUT',
  ACTIVE_TRIGGER = 'ACTIVE_TRIGGER',
  INACTIVE_WARNING = 'INACTIVE_WARNING',
  MAINTENANCE = 'MAINTENANCE',
  BROADCAST_MESSAGE = 'BROADCAST_MESSAGE',
  BROADCAST_MARQUEE = 'BROADCAST_MARQUEE',
  UPDATE_BALANCE = 'UPDATE_BALANCE',
  SKIP_RESULT = 'SKIP_RESULT',
  SKIP_RESPONSE = 'SKIP_RESPONSE',
  FIRE_EMOJI = 'FIRE_EMOJI',
  FIRE_EMOJI_ERROR = 'FIRE_EMOJI_ERROR',
  READY = 'READY',
}

export enum UserType {
  SEAMLESS = 'SL',
  TRANSFER = 'TF'
}

export enum Environment {
  LOCAL = 'local',
  DEMO = 'demo',
  DEVELOPMENT = 'development',
  MARKETING = 'marketing',
  PRODUCTION = 'production',
}

export enum RankLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum RoomStatus {
  WAITING = 'WAITING',
  PLAYING = 'PLAYING',
  OPENING = 'OPENING',
  RESULTING = 'RESULTING',
}

export enum Time {
  BEFORE_START = 6,
  DEALING = 3,
  DEALING_PER_PLAYER = 0.1,
  OPENING = 11,
  ROUND = 6,
  KNOCK = 2,
  SUMMARY = 11,
}

export enum Action {
  DRAW = 'DRAW',
  DROP = 'DROP',
  FLOW = 'FLOW',
  FLOW_END = 'FLOW_END',
  KANG = 'KANG',
  KNOCK = 'KNOCK',
  END = 'END',
}

export enum EndType {
  KANG = 'KANG',
  KANG_FIRST_ROUND = 'KANG_FIRST_ROUND',
  KNOCK = 'KNOCK',
  END = 'END',
  FLOW = 'FLOW',
  SPECIAL = 'SPECIAL',
}

export const ResponseData = {
  0: {
    code: 0,
    message: 'Success',
  },
  601: {
    code: 601,
    message: 'Room not found'
  },
  602: {
    code: 602,
    message: 'Player not found'
  },
  603: {
    code: 603,
    message: 'Session not found'
  },
  604: {
    code: 604,
    message: 'You already have session in game'
  },
  701: {
    code: 701,
    message: 'ผู้เล่นในห้องเต็มแล้ว กรุณาเลือกห้องใหม่'
  },
  702: {
    code: 702,
    message: 'ห้องนี้มีผู้เล่นเป็นเจ้ามือแล้ว'
  },
  801: {
    code: 801,
    message: 'ยอดเงินของคุณไม่เพียงพอ'
  },
  888: {
    code: 888,
    message: 'Authentication error'
  },
  901: {
    code: 901,
    message: 'ปิดปรับปรุงระบบ กรุณาลองใหม่อีกครั้งภายหลัง'
  },
  1100: {
    code: 1100,
    message: 'Invalid data'
  },
  999: {
    code: 999,
    message: 'พบข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
  },
}