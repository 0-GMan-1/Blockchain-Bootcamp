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
    token2 = await Token.deploy('Mock Dai', 'mDAI', '1000000')

	  accounts = await ethers.getSigners()
	  deployer = accounts[0]
	  feeAccount = accounts[1]
	  user1 = accounts[2]
	  user2 = accounts[3]

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

  describe('Withdrawing Tokens', () => {
    let transaction
    let result
    let amount = tokens('10')

  	describe('Success', () => {
  		beforeEach(async () => {
  		  transaction = await token1.connect(user1).approve(exchange.address, amount)
  		  result = await transaction.wait()
        transaction = await exchange.connect(user1).depositToken(token1.address, amount)
        result = await transaction.wait()
        transaction = await exchange.connect(user1).withdrawToken(token1.address, amount)
        result = await transaction.wait()
	    })	

  		it('withdraws token funds', async () => {
  			expect(await token1.balanceOf(exchange.address)).to.equal(0)
  			expect(await exchange.tokens(token1.address, user1.address)).to.equal(0)
  			expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(0)
  			
  		})

  		it('Emits a deposit event', async () => {
        const eventLog = result.events[1]

        expect(eventLog.event).to.equal('Withdraw')
      
        const args = eventLog.args
        expect(args._token).to.equal(token1.address)
        expect(args._user).to.equal(user1.address)
        expect(args._amount).to.equal(amount)
        expect(args._balance).to.equal(0)
      })


  	})

  	describe('Failure', () => {
  		it('Fails when for insufficient balance', async () => {
  			await expect(exchange.connect(user1).withdrawToken(token1.address, amount)).to.be.reverted
  		})
  	})

  })

  describe('Checking Balances', () => {
    let transaction
    let result
    let amount = tokens('1')

  	beforeEach(async () => {
  		  transaction = await token1.connect(user1).approve(exchange.address, amount)
  		  result = await transaction.wait()
        transaction = await exchange.connect(user1).depositToken(token1.address, amount)
        result = await transaction.wait()
	    })	

  		it('Returns user balance', async () => {
  			expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(amount)

  	})

  })

  describe('Making Orders', async () => {
  	let transaction, result
  	let amount = tokens('1')

  	describe('Success', async () => {
  		beforeEach(async () => {
  			transaction = await token1.connect(user1).approve(exchange.address, amount)
  		  result = await transaction.wait()

        transaction = await exchange.connect(user1).depositToken(token1.address, amount)
        result = await transaction.wait()

        transaction = await exchange.connect(user1).makeOrder(token2.address, amount, token1.address, amount)
        result = await transaction.wait()
  		})

  		it('Tracks the newly created order', async () => {
  			expect(await exchange.orderCount()).to.equal(1)

  		})

  		it('Emits an order event', async () => {
        const eventLog = result.events[0]

        expect(eventLog.event).to.equal('Order')
      
        const args = eventLog.args
        expect(args._id).to.equal(1)
        expect(args._user).to.equal(user1.address)
        expect(args._tokenGet).to.equal(token2.address)
        expect(args._amountGet).to.equal(tokens('1'))
        expect(args._tokenGive).to.equal(token1.address)
        expect(args._amountGive).to.equal(tokens('1'))
        expect(args._timestamp).to.at.least(1)
      })

  	})

  	describe('Failure', async () => {
  		it('Rejects orders that have no balance', async () => {
  			await expect(exchange.connect(user1).makeOrder(token2.address, amount, token1.address, amount)).to.be.reverted
  		})

  	})
  
  })

  describe('Order Actions', async () => {
  	let transaction, result
  	let amount = tokens('1')

  	beforeEach(async () => {
  		transaction = await token1.connect(user1).approve(exchange.address, amount)
  		result = await transaction.wait()

      transaction = await exchange.connect(user1).depositToken(token1.address, amount)
      result = await transaction.wait()

      transaction = await token2.connect(deployer).transfer(user2.address, tokens('100'))
      result = await transaction.wait()

      transaction = await token2.connect(user2).approve(exchange.address, tokens('2'))
  		result = await transaction.wait()

  		transaction = await exchange.connect(user2).depositToken(token2.address, tokens('2'))
      result = await transaction.wait()

      transaction = await exchange.connect(user1).makeOrder(token2.address, amount, token1.address, amount)
      result = await transaction.wait()
  	})

  	describe('Cancelling Orders', async () => {

  		describe('Success', async () => {
  			beforeEach(async () => {
  				transaction = await exchange.connect(user1).cancelOrder(1)
  				result = await transaction.wait()
  			})

  			it('Updates canceled orders', async () => {
  				expect(await exchange.orderCancelled(1)).to.equal(true)
  			})

  			it('Emits a cancel event', async () => {
        	const eventLog = result.events[0]

        	expect(eventLog.event).to.equal('Cancel')
      
        	const args = eventLog.args
        	expect(args._id).to.equal(1)
        	expect(args._user).to.equal(user1.address)
        	expect(args._tokenGet).to.equal(token2.address)
        	expect(args._amountGet).to.equal(tokens('1'))
       	  expect(args._tokenGive).to.equal(token1.address)
        	expect(args._amountGive).to.equal(tokens('1'))
        	expect(args._timestamp).to.at.least(1)
      	})

  		})

  		describe('Failure', async () => {
  			beforeEach(async () => {
  				transaction = await token1.connect(user1).approve(exchange.address, amount)
  				result = await transaction.wait()

      		transaction = await exchange.connect(user1).depositToken(token1.address, amount)
      		result = await transaction.wait()

      		transaction = await exchange.connect(user1).makeOrder(token2.address, amount, token1.address, amount)
      		result = await transaction.wait()
  			})

  			it('Rejects invalid order ids', async () => {
      		const invalidOrderId = 9999
      		await expect(exchange.connect(user1).cancelOrder(invalidOrderId)).to.be.reverted
  			})

  			it('Rejects unauthorized cancelations', async () => {
  				await expect(exchange.connect(user2).cancelOrder(1)).to.be.reverted
  			})

  		})

  	})

  	describe('Filling Orders', async () => {
  		
  		describe('Success', () => {

  			beforeEach(async () => {
  			// user2 fills order
  			transaction = await exchange.connect(user2).fillOrder('1')
	  		result = await transaction.wait()

  		})

  			it('Executes the trade and charges fees', async () => {
  				// Token Give
  				expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(tokens('0'))
  				expect(await exchange.balanceOf(token1.address, user2.address)).to.equal(tokens('1'))
  				expect(await exchange.balanceOf(token1.address, feeAccount.address)).to.equal(tokens('0'))

  				// Token Get
  				expect(await exchange.balanceOf(token2.address, user1.address)).to.equal(tokens('1'))
  				expect(await exchange.balanceOf(token2.address, user2.address)).to.equal(tokens('0.9'))
  				expect(await exchange.balanceOf(token2.address, feeAccount.address)).to.equal(tokens('0.1'))
  			})

  			it('Updates filled orders', async () => {
  				expect(await exchange.orderFilled(1)).to.equal(true)
  			})

  			it('Emits a trade event', async () => {
        	const eventLog = result.events[0]

        	expect(eventLog.event).to.equal('Trade')
      
        	const args = eventLog.args
        	expect(args._id).to.equal(1)
        	expect(args._user).to.equal(user2.address)
        	expect(args._tokenGet).to.equal(token2.address)
        	expect(args._amountGet).to.equal(tokens('1'))
       	  expect(args._tokenGive).to.equal(token1.address)
        	expect(args._amountGive).to.equal(tokens('1'))
        	expect(args._creator).to.equal(user1.address)
        	expect(args._timestamp).to.at.least(1)
      	})
  		
  		})

  		describe('Failure', () => {
  			it('Rejects invalid order ids', async () => {
  				const invalidOrderId = 9999
  				await expect(exchange.connect(user2).fillOrder(invalidOrderId)).to.be.reverted
  			})
  			it('Rejects already filled orders', async () => {
  				transaction = await exchange.connect(user2).fillOrder(1)
  				await transaction.wait()

  				await expect(exchange.connect(user2).fillOrder(1)).to.be.reverted
  			})
  			it('Rejects canceled orders', async () => {
  				transaction = await exchange.connect(user1).cancelOrder(1)
  				await transaction.wait()

  				await expect(exchange.connect(user2).fillOrder(1)).to.be.reverted
  			})
  		})

  	})
  
  })

})
