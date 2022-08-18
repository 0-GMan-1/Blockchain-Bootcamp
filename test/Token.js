const { expect } = require('chai')
const { ethers } = require('hardhat');

const tokens = (n) => {
	return ethers.utils.parseUnits(n , 'ether')
}

describe('Token', () => {
  let token	

	beforeEach(async () => {

	  const Token = await ethers.getContractFactory('Token')
	  token = await Token.deploy('Graham Coin', 'GC', '1000000')

	})	

	describe('Deployment', () => {
		const name = 'Graham Coin'
		const symbol = 'GC'
		decimals = '18'
		totalSupply = tokens('1000000')


		it('Has correct name', async () => {	
			expect(await token.name()).to.equal(name)
		})

		it('Has correct symbol', async () => {
			expect(await token.symbol()).to.equal(symbol)

		})

		it('Has correct decimals', async () => {
		expect(await token.decimals()).to.equal(decimals)

		})

		it('Has correct totalSupply', async () => {
		expect(await token.totalSupply()).to.equal(totalSupply)

		})
	})
	
})