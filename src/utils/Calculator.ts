import { Player } from '../rooms/Player'

export const coreLogic = (players: Player[], round: number, deckLength: number, flowedTarget: string = '') => {
  let isKang: boolean = false
  let isKnock: boolean = false
  let targetIndex: number = -1
  let result: any[] = players.map((v: Player, i: number) => {
    if (v.kang) {
      isKang = v.kang
      targetIndex = i
    } else if (v.cards.length === 0) {
      isKnock = !flowedTarget
      targetIndex = i
    }
    return {
      sessionId: v.sessionId,
      username: v.username,
      source: v.source,
      avatar: v.avatar,
      profile: {
        gender: v.profile.gender,
        nickname: v.encodeNickname(),
      },
      sequence: v.sequence,
      cards: v.cards,
      score: v.cards.reduce((p: number, c: number) => p + (((c % 13) + 1) > 9 ? 10 : ((c % 13) + 1)), 0),
      lowestScore: v.cards.map((c: number) => +(c / 4).toFixed(1)).sort((a: number, b: number) => a - b)[0],
      multiplier: 0,
      earn: v.flowEarn,
      kang: v.kang,
      win: false,
      flower: flowedTarget ? v.cards.length === 0 : false,
      isFlowed: flowedTarget ? v.sessionId === flowedTarget : false,
      flow: {
        flow: v.flow,
        flowed: v.flowed,
        flowScore: v.flow.length,
        flowedScore: v.flowed.length,
      },
    }
  })
  if (flowedTarget) {
    result[targetIndex].win = true
    for (let index = 0; index < result.length; index++) {
      if (index !== targetIndex) {
        result[targetIndex].multiplier += result[index].isFlowed ? 3 : 1
        result[index].multiplier = result[index].isFlowed ? -3 : -1
      }
    }
  } else if (deckLength === 0) {
    result = result.sort((a: any, b: any) => a.score - b.score || a.cards.length - b.cards.length || a.lowestScore - b.lowestScore)
    result[0].win = true
    for (let index = 0; index < result.length; index++) {
      if (index !== 0) {
        result[0].multiplier += 1
        result[index].multiplier = -1
      }
    }
  } else if (isKang) {
    let isWinKang: boolean = result[targetIndex].score === Math.min(...result.map((v: any) => v.score))
    result[targetIndex].win = isWinKang
    for (let index = 0; index < result.length; index++) {
      if (index !== targetIndex) {
        result[index].win = !isWinKang
        if (result[index].score >= result[targetIndex].score) {
          result[targetIndex].multiplier += (isWinKang ? 1 : -1) * (round === 0 ? 2 : 1)
          result[index].multiplier = (isWinKang ? -1 : 1) * (round === 0 ? 2 : 1)
        } else {
          result[targetIndex].multiplier += (isWinKang ? 1 : -1) * (round === 0 ? 3 : 2)
          result[index].multiplier = (isWinKang ? -1 : 1) * (round === 0 ? 3 : 2)
        }
      }
    }
  } else if (isKnock) {
    result[targetIndex].win = true
    for (let index = 0; index < result.length; index++) {
      if (index !== targetIndex) {
        result[targetIndex].multiplier += 3
        result[index].multiplier = -3
      }
    }
  }
  return result
}

export const specialCoreLogic = (cards: number[]) => {
  let res: any = {}
  let cardsScore: number[] = cards.map((v: any) => v % 13).sort((a: any, b: any) => a - b)
  let cardsScoreAceBig: number[] = cards.map((v: any) => ((v % 13) === 0 ? 13 : (v % 13))).sort((a: any, b: any) => a - b)
  let cardsSuit: number[] = cards.sort((a: any, b: any) => (a % 13) - (b % 13)).map((v: any) => ~~(v / 13))
  let cardsSuitAceBig: number[] = cards.sort((a: any, b: any) => ((a % 13) === 0 ? 13 : (a % 13)) - ((b % 13) === 0 ? 13 : (b % 13))).map((v: any) => ~~(v / 13))
  let cardsGroup: any[] = cardsScoreAceBig.reduce((r: any, v: any, i: number, a: any[]) => {
    if (v === a[i - 1]) r[r.length - 1].push(v)
    else r.push(v === a[i + 1] ? [v] : v)
    return r
  }, [])
  if (cards.length === 5 && (!cardsScoreAceBig.some((v: any, i: number, a: any[]) => v - a.length - i !== a[0] - a.length) && !cardsSuitAceBig.some((v: any, i: number, a: any[]) => v !== a[0]) && cardsScoreAceBig[4] === 13) || (!cardsScore.some((v: any, i: number, a: any[]) => v - a.length - i !== a[0] - a.length) && !cardsSuit.some((v: any, i: number, a: any[]) => v !== a[0]))) {
    res.name = 'STRAIGHT_FLUSH'
    res.score = 6
    res.value = 7
    if (!cardsScore.some((v: any, i: number, a: any[]) => v - a.length - i !== a[0] - a.length)) {
      res.rank = cardsScore.sort((a: any, b: any) => b - a)[cardsScore.length - 1]
    } else if (!cardsScoreAceBig.some((v: any, i: number, a: any[]) => v - a.length - i !== a[0] - a.length)) {
      res.rank = cardsScoreAceBig.sort((a: any, b: any) => b - a)[cardsScoreAceBig.length - 1]
    }
    res.topSuit = cardsSuit[cardsSuit.length - 1]
  } else if (cards.length === 5 && cardsGroup.filter((v: any) => v.length === 4).length === 1) {
    res.name = 'FOUR_OF_A_KIND'
    res.score = 5
    res.value = 6
    res.rank = cardsGroup.filter((v: any) => v.length === 4)[0][0]
  } else if (cards.length === 5 && cardsGroup.filter((v: any) => v.length === 3).length === 1 && cardsGroup.filter((v: any) => v.length === 2).length === 1) {
    res.name = 'FULL_HOUSE'
    res.score = 4
    res.value = 5
    res.rank = cardsGroup.filter((v: any) => v.length === 3)[0][0]
  } else if (cards.length === 5 && cardsSuit.filter((v: any, i: number, a: any[]) => v === a[0]).length === 5) {
    res.name = 'FLUSH'
    res.score = 3
    res.value = 4
    res.rank = cardsScoreAceBig.sort((a: any, b: any) => b - a)[0]
    res.topSuit = cardsSuit[cardsSuit.length - 1]
  } else if (cards.length === 5 && (!cardsScore.some((v: any, i: number, a: any[]) => v - a.length - i !== a[0] - a.length) || !cardsScoreAceBig.some((v: any, i: number, a: any[]) => v - a.length - i !== a[0] - a.length))) {
    res.name = 'STRAIGHT'
    res.score = 2
    res.value = 3
    if (!cardsScore.some((v: any, i: number, a: any[]) => v - a.length - i !== a[0] - a.length)) {
      res.rank = cardsScore.sort((a: any, b: any) => b - a)[cardsScore.length - 1]
      res.topSuit = cardsSuit[cardsSuit.length - 1]
    } else if (!cardsScoreAceBig.some((v: any, i: number, a: any[]) => v - a.length - i !== a[0] - a.length)) {
      res.rank = cardsScoreAceBig.sort((a: any, b: any) => b - a)[cardsScore.length - 1]
      res.topSuit = cardsSuitAceBig[cardsSuitAceBig.length - 1]
    }
  } else if (cardsGroup.filter((v: any) => v.length === 3).length === 1) {
    res.name = 'THREE_OF_A_KIND'
    res.score = 1
    res.value = 2
    res.rank = cardsGroup.filter((v: any) => v.length === 3)[0][0]
  } else {
    res.name = '-'
    res.score = 0
  }
  return res
}

export const specialCalculator = (players: any[]) => {
  let specialList: any[] = []
  for (const player of players) {
    if (player.isPlaying) {
      let res: any = {
        ...specialCoreLogic(player.cards),
        sessionId: player.sessionId,
        cards: player.cards
      }
      res.c = player.cards.map((v: number) => v % 13)
      specialList = [...specialList, res]
    }
  }
  specialList = specialList.sort((a: any, b: any) => b.score - a.score || b.rank - a.rank || b.topSuit - a.topSuit)
  if (specialList[0].score > 0) {
    let specialData: any[] = specialList.map((v: any, i: number) => {
      let player: Player = players.find((p: Player) => p.sessionId === v.sessionId)
      return {
        sessionId: player.sessionId,
        username: player.username,
        source: player.source,
        avatar: player.avatar,
        profile: {
          gender: player.profile.gender,
          nickname: player.encodeNickname(),
        },
        sequence: player.sequence,
        cards: player.cards,
        score: v.score === 0 ? 50 : v.score,
        win: i === 0,
        multiplier: v.value,
        flow: {
          flow: [],
          flowed: [],
          flowScore: 0,
          flowedScore: 0,
        },
      }
    })
    return specialData
  }
  return []
}
