const { expect } = require('chai')
const { ethers } = require('hardhat');

const tokens = (n) => {
	return ethers.utils.parseUnits(n , 'ether')
}

describe('Exchange', () => {
  let deployer, feeAccount, exchange

  const feePercent = 10

	beforeEach(async () => {
    
    const Exchange = await ethers.getContractFactory('Exchange')
    const Token = await ethers.getContractFactory('Token')
    token1 = await Token.deploy('Graham Coin', 'GC', '1000000')
	  accounts = await ethers.getSigners()
	  deployer = accounts[0]
	  feeAccount = accounts[1]
	  user1 = accounts[2]
	  let transaction = await token1.connect(deployer).transfer(user1.address, tokens('100'))
	  await transaction.wait()
	  exchange = await Exchange.deploy(feeAccount.address, feePercent)
	})	

	describe('Deployment', () => {

		it('Tracks the fee account', async () => {	
			expect(await exchange.feeAccount()).to.equal(feeAccount.address)

		})

		it('Tracks the fee percent', async () => {	
			expect(await exchange.feePercent()).to.equal(feePercent)

		})
	
  })

  describe('Depositing Tokens', () => {
    let transaction
    let result
    let amount = tokens('10')

  	describe('Success', () => {
  		beforeEach(async () => {
  		  transaction = await token1.connect(user1).approve(exchange.address, amount)
  		  result = await transaction.wait()
        transaction = await exchange.connect(user1).depositToken(token1.address, amount)
        result = await transaction.wait()
	    })	

  		it('Tracks the token deposit', async () => {
  			expect(await token1.balanceOf(exchange.address)).to.equal(amount)
  			expect(await exchange.tokens(token1.address, user1.address)).to.equal(amount)
  			expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(amount)
  		})

  		it('Emits a deposit event', async () => {
        const eventLog = result.events[1]

        expect(eventLog.event).to.equal('Deposit')
      
        const args = eventLog.args
        expect(args._token).to.equal(token1.address)
        expect(args._user).to.equal(user1.address)
        expect(args._amount).to.equal(amount)
        expect(args._balance).to.equal(amount)
      })

  	})

  	describe('Failure', () => {
  		it('fails when no tokens are approved', async () => {
  			await expect(exchange.connect(user1).depositToken(token1.address, amount)).to.be.reverted
  		})

  	})
  })

})