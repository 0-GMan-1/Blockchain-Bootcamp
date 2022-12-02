import { ethers } from 'ethers';
import { createSelector } from 'reselect';
import { get, groupBy, reject, maxBy, minBy } from 'lodash';
import moment from 'moment'

const GREEN = '#00b300'
const RED = '#F45353'

const tokens = state => get(state, 'tokens.contracts')
const account = state => get(state, 'provider.account')
const events = state => get(state, 'exchange.events')

const allOrders = state => get(state, 'exchange.allOrders.data', [])
const cancelledOrders = state => get(state, 'exchange.cancelledOrders.data', [])
const filledOrders = state => get(state, 'exchange.filledOrders.data', [])


const openOrders = state => {
	const all = allOrders(state)
	const filled = filledOrders(state)
	const cancelled = cancelledOrders(state)

	const openOrders = reject(all, (order) => {
		const orderFilled = filled.some((o) => o._id.toString() === order._id.toString())
		const orderCancelled = cancelled.some((o) => o._id.toString() === order._id.toString())
		return(orderFilled || orderCancelled)
	})

	return openOrders
}
// -------------------------------------------------------
// MY EVENTS
export const myEventsSelector = createSelector(	account, events, (account, events) => {
	events = events.filter((e) => e.args._user === account)
	console.log(events)
	return events
})



// -------------------------------------------------------
// MY OPEN ORDERS
export const myOpenOrdersSelector = createSelector(account, tokens, openOrders, (account, tokens, orders) =>{
	if (!tokens[0] || !tokens[1]) { return }

	// Filter orders created by user
	orders = orders.filter((o) => o._user === account)

	// Filter Orders by Selected Tokens
	orders = orders.filter((o) => o._tokenGet === tokens[0].address || o._tokenGet === tokens[1].address)
	orders = orders.filter((o) => o._tokenGive === tokens[0].address || o._tokenGive === tokens[1].address)

	// Decorate Orders - Add Display Attributes
	orders = decorateMyOpenOrders(orders, tokens)

	// Sort Orders - Date Descending
	orders = orders.sort((a, b) => b._timestamp - a._timestamp)

	return orders
})

const decorateMyOpenOrders = (orders, tokens) => {
	return(
	  orders.map((order) => {
	  	order = decorateOrder(order, tokens)
	  	order = decorateMyOpenOrder(order, tokens)
	  	return(order)
	  })

	)
}

const decorateMyOpenOrder = (order, tokens) => {
	let orderType = order._tokenGive === tokens[1].address ? "buy" : "sell"

	return({
		...order,
		orderType,
		orderTypeClass: (orderType === "buy" ? GREEN : RED)
	})
}


const decorateOrder = (order, tokens) => {
	let token0Amount, token1Amount

	if (order.tokenGive === tokens[1].address) {
		token0Amount = order._amountGive
		token1Amount = order._amountGet
	} else {
		token0Amount = order._amountGet
		token1Amount = order._amountGive
	}

	const precision = 100000
	let tokenPrice = (token1Amount / token0Amount)
	tokenPrice = Math.round(tokenPrice * precision) / precision

	return ({
	  ...order,
	  token0Amount: ethers.utils.formatUnits(token0Amount, "ether"),
	  token1Amount: ethers.utils.formatUnits(token1Amount, "ether"),
	  tokenPrice,
	  formattedTimestamp: moment.unix(order._timestamp).format('h:mm:ssa d MMM D')
	})

}

// -------------------------------------------------------
// FILLED ORDERS

export const filledOrdersSelector = createSelector(filledOrders, tokens, (orders, tokens) => {
	if (!tokens[0] || !tokens[1]) { return }

	// Filter Orders by Selected Tokens
	orders = orders.filter((o) => o._tokenGet === tokens[0].address || o._tokenGet === tokens[1].address)
	orders = orders.filter((o) => o._tokenGive === tokens[0].address || o._tokenGive === tokens[1].address)

	// Sort orders by time ascending
	orders = orders.sort((a, b) => a._timestamp - b._timestamp)
	
	// Apply order colors (decorate orders)
	orders = decorateFilledOrders(orders, tokens)
	
	// Step 3 sort orders by time descending for UI
	orders = orders.sort((a, b) => b._timestamp - a._timestamp)

	return orders
})

const decorateFilledOrders = (orders, tokens) => {
	// Track Previous Order
	let previousOrder = orders[0]

	return(
	  orders.map((order) => {
	    // Decorate each filled order
	    order = decorateOrder(order, tokens)
	    order = decorateFilledOrder(order, previousOrder)
	    previousOrder = order

	  return(order)
	
	})
	)
	
}

const decorateFilledOrder = (order, previousOrder) => {
	return({
		...order,
		tokenPriceClass: tokenPriceClass(order.tokenPrice, order._id, previousOrder)
	})

}

const tokenPriceClass = (tokenPrice, orderId, previousOrder) => {
	// Show Green by default if there is no previous order
	if (previousOrder._id === orderId) {
		return GREEN
	}

	// Compare to previous order and show Red or Green Color
	if (previousOrder.tokenPrice <= tokenPrice) {
		return GREEN
	} else {
		return RED
	}
}

// -------------------------------------------------------
// MY FILLED ORDERS

export const myFilledOrdersSelector = createSelector(account, tokens, filledOrders, (account, tokens, orders) =>{
	if (!tokens[0] || !tokens[1]) { return }

	// Find My Orders
	orders = orders.filter((o) => o._user === account || o._creator === account)

	// Filter Orders by Selected Tokens
	orders = orders.filter((o) => o._tokenGet === tokens[0].address || o._tokenGet === tokens[1].address)
	orders = orders.filter((o) => o._tokenGive === tokens[0].address || o._tokenGive === tokens[1].address)

	// Sort By Date Descending
	orders = orders.sort((a, b) => b._timestamp - a._timestamp)

	// Decorate Orders - Add Display Attributes
	orders = decorateMyFilledOrders(orders, account, tokens)

	return orders
})

const decorateMyFilledOrders = (orders, account, tokens) => {
	return(
	  orders.map((order) => {
	  	order = decorateOrder(order, tokens)
	  	order = decorateMyFilledOrder(order, account, tokens)
	  	return(order)
	  })

	)
}

const decorateMyFilledOrder = (order, account, tokens) => {
	const myOrder = order._creator === account

	let orderType
	if(myOrder) {
		orderType = order._tokenGive === tokens[1].address ? "buy" : "sell"	
	}
		else {
		orderType = order._tokenGive === tokens[1].address ? "sell" : "buy"	
	}
	return({
		...order,
		orderType,
		orderClass: (orderType === "buy" ? GREEN : RED),
		orderSign: (orderType === "buy" ? "+" : "-")
	})
}

// -------------------------------------------------------
// ORDER BOOK

export const orderBookSelector = createSelector(openOrders, tokens, (orders, tokens) => {
	if (!tokens[0] || !tokens[1]) { return }
	// Filter Orders by Selected Tokens
	orders = orders.filter((o) => o._tokenGet === tokens[0].address || o._tokenGet === tokens[1].address)
	orders = orders.filter((o) => o._tokenGive === tokens[0].address || o._tokenGive === tokens[1].address)

	orders = decorateOrderBookOrders(orders, tokens)

	orders = groupBy(orders, 'orderType')

	const buyOrders = get(orders, 'buy', [])
	orders = {
		...orders,
		buyOrders: buyOrders.sort((a, b) => b.tokenPrice - a.tokenPrice)
	}

	const sellOrders = get(orders, 'sell', [])
	orders = {
		...orders,
		sellOrders: sellOrders.sort((a, b) => b.tokenPrice - a.tokenPrice)
	}

	return orders

})

const decorateOrderBookOrders = (orders, tokens) => {
	return(
		orders.map((order) => {
			order = decorateOrder(order, tokens)
			order = decorateOrderBookOrder(order, tokens)
			return(order)
		})
	)
}

const decorateOrderBookOrder = (order, tokens) => {
	const orderType = order._tokenGive === tokens[1].address ? 'buy' : 'sell'

	return({
		...order,
		orderType,
		orderTypeClass: (orderType === 'buy' ? GREEN : RED),
		orderFillAction: (orderType === 'buy' ? 'sell' : 'buy')
	})
}

// -------------------------------------------------------
// PRICE CHART

export const priceChartSelector = createSelector(filledOrders, tokens, (orders, tokens) => {
	if (!tokens[0] || !tokens[1]) { return }

	// Filter Orders by Selected Tokens
	orders = orders.filter((o) => o._tokenGet === tokens[0].address || o._tokenGet === tokens[1].address)
	orders = orders.filter((o) => o._tokenGive === tokens[0].address || o._tokenGive === tokens[1].address)

	// Sort Orders by date ascending
	orders = orders.sort((a, b) => a._timestamp - b._timestamp)

	// Decorate orders - add display attributes
	orders = orders.map((o) => decorateOrder(o, tokens))

	let secondLastOrder, lastOrder
	[secondLastOrder, lastOrder] = orders.slice(orders.length -2, orders.length)
	const lastPrice = get(lastOrder, 'tokenPrice', 0)
	const secondLastPrice = get(secondLastOrder, 'tokenPrice', 0)

	return({
	  lastPrice,
	  lastPriceChange: (lastPrice >= secondLastPrice ? '+' : '-'),
	  series: [{
	  	data: buildGraphData(orders)
	  }]
	})

})	

const buildGraphData = (orders) => {
	// Group Orders by hour
	orders = groupBy(orders, (o) => moment.unix(o._timestamp).startOf('hour').format())

	// Get each hour where data exists
	const hours = Object.keys(orders)
	
	// Build the graph series
	const graphData = hours.map((hour) => {
     
      // Fetch all orders from current hour
      const group = orders[hour]

      // Calculate Prices: open, high, low, close
      const open = group[0]
      const high = maxBy(group, 'tokenPrice')
      const low = minBy(group, 'tokenPrice')
      const close = group[group.length -1]

	  return({
		x: new Date(hour),	
		y: [open.tokenPrice, high.tokenPrice, low.tokenPrice, close.tokenPrice]
      })
	})

	return(graphData)
}