import * as controller from '../controller'

export const processRetry = async (action: string, data: any) => {
  let count: number = 0
  let _payout: any
  while (count++ < 5 && !_payout) {
    switch (action) {
      case 'payout': _payout = await controller.payout(data.roomId, data.rankId, data.roundId, data.user, data._result, data.uuid)
        break;
    }
  }
  return _payout
}
