const config = require('../src/config.json')

const tokens = (n) => {
  return ethers.utils.parseUnits(n , 'ether')
}

const wait = (seconds) => {
  const milliseconds = seconds * 1000
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

async function main() {

  const accounts = await ethers.getSigners()

  // Network
  const { chainId } = await ethers.provider.getNetwork()
  console.log(`Using chainId:`, chainId)

  const GC = await ethers.getContractAt('Token', config[chainId].GC.address)
  console.log(`Graham Coin Token fetched: ${GC.address}`)

  const mETH = await ethers.getContractAt('Token', config[chainId].mETH.address)
  console.log(`mETH Token fetched: ${mETH.address}`)

  const mDAI = await ethers.getContractAt('Token', config[chainId].mDAI.address)
  console.log(`mDAI Token fetched: ${mDAI.address}`)

  const exchange = await ethers.getContractAt('Exchange', config[chainId].exchange.address)
  console.log(`exchange fetched: ${exchange.address}\n`)

  // Distribute tokens
  const sender = accounts[0]
  const receiver = accounts[1]
  let amount = tokens('10000')

  let transaction, result, resultFill
  transaction = await mETH.connect(sender).transfer(receiver.address, amount)
  console.log(`Transferred ${amount} tokens from ${sender.address} to ${receiver.address}\n`)

  // Setup exchange users
  const user1 = accounts[0]
  const user2 = accounts[1]
  amount = tokens('10000')

  // Deposit tokens to exchange
  transaction = await GC.connect(user1).approve(exchange.address, amount)
  await transaction.wait() 
  console.log(`Approved ${amount} tokens from ${user1.address}\n`)

  transaction = await exchange.connect(user1).depositToken(GC.address, amount)
  await transaction.wait()
  console.log(`Deposited ${amount} GC from ${user1.address}\n`)

  transaction = await mETH.connect(user2).approve(exchange.address, amount)
  await transaction.wait() 
  console.log(`Approved ${amount} tokens from ${user2.address}\n`)

  transaction = await exchange.connect(user2).depositToken(mETH.address, amount)
  await transaction.wait()
  console.log(`Deposited ${amount} mETH from ${user2.address}\n`)
  
  // Make orders
  let orderId
  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens('100'), GC.address, tokens('5'))
  resultCancel = await transaction.wait()
  console.log(`Made order from ${user1.address}`)

  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens('100'), GC.address, tokens('10'))
  resultFill = await transaction.wait()
  console.log(`Made order from ${user1.address}`)

  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens('50'), GC.address, tokens('15'))
  resultFill2 = await transaction.wait()
  console.log(`Made order from ${user1.address}`)

  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens('200'), GC.address, tokens('20'))
  resultFill3 = await transaction.wait()
  console.log(`Made order from ${user1.address}\n`)

  // Cancel orders
  orderId = resultCancel.events[0].args._id
  transaction = await exchange.connect(user1).cancelOrder(orderId)
  result = await transaction.wait()
  console.log(`Cancelled order from ${user1.address}\n`)

  await wait(1)

  // Fill orders
  orderId = resultFill.events[0].args._id
  transaction = await exchange.connect(user2).fillOrder(orderId)
  result = await transaction.wait()
  console.log(`Filled ${user1.address} order from ${user2.address}`)
  
  await wait(1)

  orderId = resultFill2.events[0].args._id
  transaction = await exchange.connect(user2).fillOrder(orderId)
  result = await transaction.wait()
  console.log(`Filled ${user1.address} order from ${user2.address}`)
  
  await wait(1)

  orderId = resultFill3.events[0].args._id
  transaction = await exchange.connect(user2).fillOrder(orderId)
  result = await transaction.wait()
  console.log(`Filled ${user1.address} order from ${user2.address}\n`)
  
  await wait(1)

  // Open orders
  for(let i = 1; i <= 10; i++) {
    transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens((10 * i).toString()), GC.address, tokens('10'))
    result = transaction.wait()

    console.log(`Made order from ${user1.address}`)

    await wait(1)
  }

  for(let i = 1; i <= 10; i++) {
    transaction = await exchange.connect(user2).makeOrder(GC.address, tokens('10'), mETH.address, tokens((10 * i).toString()))
    result = transaction.wait()

    console.log(`Made order from ${user2.address}`)

    await wait(1)
  }
  
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});