export interface IUserBet {
	username: string
	source: string
	type: string
	amount: number
	detail?: any
}

export interface IUserPayout {
	username: string
	source: string
	type: string
	amount: number
	returnAmount: number
	winlose: number
	detail: any
}

export interface IUserResult {
	username: string
	nickname: string
	source: string
	avatar: number
	amount: number
	detail: any
}
