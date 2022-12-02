import { useEffect } from 'react';
import { useDispatch } from 'react-redux'
import config from '../config.json'

import { 
  loadProvider, 
  loadNetwork, 
  loadAccount,
  loadTokens,
  loadExchange,
  subscribeToEvents,
  loadAllOrders
} from '../store/interactions'

import Navbar from './Navbar'
import Markets from './Markets'
import Balance from './Balance'
import Order from './Order'
import PriceChart from './PriceChart'
import Transactions from './Transactions'
import Trades from './Trades'
import OrderBook from './OrderBook'
import Alert from './Alert'

function App() {

  const dispatch = useDispatch()

  const loadBlockchainData = async () => {
    // Connect Ethers to the Blockchain
    const provider = loadProvider(dispatch)

    // Fetch ChainId
    const chainId = await loadNetwork(provider, dispatch)
    window.ethereum.on('chainChanged', () => {
      window.location.reload()
    })

    // Fetch current account and balance from Metamask
    window.ethereum.on('accountsChanged', () => {
      loadAccount(provider, dispatch)
    })
    // Load Token and Exchange smart contracts
    const GC = config[chainId].GC
    const mETH = config[chainId].mETH
    const exchangeConfig = config[chainId].exchange

    await loadTokens(provider, [GC.address, mETH.address], dispatch)

    const exchange = await loadExchange(provider, exchangeConfig.address, dispatch)

    loadAllOrders(provider, exchange, dispatch)

    subscribeToEvents(exchange, dispatch)
  }

  useEffect(() => {
    loadBlockchainData()
  })

  return (
    <div>

      <Navbar />

      <main className='exchange grid'>
        <section className='exchange__section--left grid'>

          <Markets />

          <Balance />

          <Order />

        </section>
        <section className='exchange__section--right grid'>

          <PriceChart />

          <Transactions />

          <Trades />

          <OrderBook />

        </section>
      </main>

      <Alert />

    </div>
  );
}

export default App;