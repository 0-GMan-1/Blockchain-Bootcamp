const { expect } = require('chai')
const { ethers } = require('hardhat');

const tokens = (n) => {
	return ethers.utils.parseUnits(n , 'ether')
}

describe('Token', () => {
  let token, accounts, deployer, receiver

	beforeEach(async () => {

	  const Token = await ethers.getContractFactory('Token')
	  token = await Token.deploy('Graham Coin', 'GC', '1000000')
	  accounts = await ethers.getSigners()
	  deployer = accounts[0]
	  receiver = accounts[1]
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
	
		it('Assigns total supply to deployer', async () => {
		expect(await token.balanceOf(deployer.address)).to.equal(totalSupply)

		})
	
  })

	describe('Sending Tokens', async () => {
		let amount
		let transaction
		let result

		describe('Success', () => {

			beforeEach(async () => {
      amount = tokens('100')
      transaction = await token.connect(deployer).transfer(receiver.address, amount)
			result = await transaction.wait()			
			})

			it('Transfers token balances', async () => {
				expect(await token.balanceOf(deployer.address)).to.equal(tokens('999900'))
				expect(await token.balanceOf(receiver.address)).to.equal(amount)

		  })

      it('Emits a transfer event', async () => {
        const eventLog = result.events[0]

        expect(eventLog.event).to.equal('Transfer')
      
        const args = eventLog.args
        expect(args.from).to.equal(deployer.address)
        expect(args.to).to.equal(receiver.address)
        expect(args.value).to.equal(amount)
      })

		})

		describe('Failure', () => {

			it('Rejects insufficient balances', async () => {
				const invalidAmount = tokens('10000000')
				await expect(token.connect(deployer).transfer(receiver.address, invalidAmount)).to.be.reverted
			})
 
      it('Rejects invalid recipient', async () => {
      	const amount = tokens('100')
      	await expect(token.connect(deployer).transfer('0x0000000000000000000000000000000000000000', amount)).to.be.reverted
      })

		})

	})

})
