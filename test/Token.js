const { expect } = require('chai')
const { ethers } = require('hardhat');

const tokens = (n) => {
	return ethers.utils.parseUnits(n , 'ether')
}

describe('Token', () => {
  let token, accounts, deployer, receiver
  let exchange

	beforeEach(async () => {

	  const Token = await ethers.getContractFactory('Token')
	  token = await Token.deploy('Graham Coin', 'GC', '1000000')
	  accounts = await ethers.getSigners()
	  deployer = accounts[0]
	  receiver = accounts[1]
	  exchange = accounts[2]
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
        expect(args._from).to.equal(deployer.address)
        expect(args._to).to.equal(receiver.address)
        expect(args._value).to.equal(amount)
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

  describe('Approving Tokens', () => {
    let amount
		let transaction
		let result

    beforeEach(async () => {
    	amount = tokens('100')
    	transaction = await token.connect(deployer).approve(exchange.address, amount)
			result = await transaction.wait()			
    })
  	
  	describe('Success', () => {
      it('Allocates allowance for token spending', async () => {
        expect(await token.allowance(deployer.address, exchange.address)).to.equal(amount)
      })

      it('Emits an approval event', async () => {
        const eventLog = result.events[0]

        expect(eventLog.event).to.equal('Approval')
      
        const args = eventLog.args
        expect(args._owner).to.equal(deployer.address)
        expect(args._spender).to.equal(exchange.address)
        expect(args._value).to.equal(amount)
      })

  	})
    
    describe('Failure', () => {
    	it('Rejects invalid spenders', async () => {
    		await expect(token.connect(deployer).approve('0x0000000000000000000000000000000000000000', amount)).to.be.reverted
    	})

    })

  })

  describe('Delegated token transfers', () => {
    let amount
		let transaction
		let result

    beforeEach(async () => {
    	amount = tokens('100')
    	transaction = await token.connect(deployer).approve(exchange.address, amount)
			result = await transaction.wait()			
    })

  	describe('Success', () => {

  		beforeEach(async () => {
    	  amount = tokens('100')
    	  transaction = await token.connect(exchange).transferFrom(deployer.address, receiver.address, amount)
			  result = await transaction.wait()			
      })

      it('Transfers token balances', async () => {
      	expect(await token.balanceOf(deployer.address)).to.be.equal(ethers.utils.parseUnits('999900', 'ether'))
      	expect(await token.balanceOf(receiver.address)).to.be.equal(amount)
      })

      it('Resets the allowance', async () => {
        expect(await token.allowance(deployer.address, exchange.address)).to.be.equal(0)	
      })

      it('Emits a transfer event', async () => {
        const eventLog = result.events[0]

        expect(eventLog.event).to.equal('Transfer')
      
        const args = eventLog.args
        expect(args._from).to.equal(deployer.address)
        expect(args._to).to.equal(receiver.address)
        expect(args._value).to.equal(amount)
      })

  	})

  	describe('Failure', async () => {
      it('Rejects insufficient amounts', async () => {
        const invalidAmount = tokens('100000000')
  		  await expect(token.connect(exchange).transferFrom(deployer.address, receiver.address, invalidAmount)).to.be.reverted
      })

  	})
  })

})
