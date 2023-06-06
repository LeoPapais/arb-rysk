import fetch from 'node-fetch'
import moment from 'moment'
import BigNumber from 'bignumber.js'
import {ethers} from 'ethers'
import pkg from "ethers-multicall-provider"

import settings from './settings.js'
import pricerAbi from './beyondPricerAbi.json' assert { type: "json" }

const { MulticallWrapper } = pkg

const {
  subgraphUrl,
  providerUrl,
  beyondPricerAddress,
  usdc,
  weth,
} = settings.goerli

const provider = MulticallWrapper.wrap(new ethers.providers.JsonRpcProvider(providerUrl))
const contract = new ethers.Contract(beyondPricerAddress, pricerAbi, provider)

const fetchGraphql = async query => {
  return fetch(subgraphUrl, {
    "body": JSON.stringify({ query }),
    "method": "POST"
  })
  .then(r => r.json())
}

const getSeries = async () => {
  const query = `
    {
      series {   
        id 
        expiration 
        netDHVExposure 
        strike
        isPut
        isBuyable
        isSellable
      }
    }
  `
  const res = await fetchGraphql(query)
  return res.data.series
}

const formatSeries = series => series
  .filter(s => s.isBuyable || s.isSellable)
  .filter(s => parseInt(s.expiration) > moment().unix())
  .map(s => {
    const date = moment(parseInt(s.expiration) * 1000).format('YYYY-MM-DD')
    const strikeH = new BigNumber(s.strike).div('1e18').toFixed(2)
    const netDHVExposureH = new BigNumber(s.netDHVExposure).div('1e18').toFixed(2)
    return {
      strikeStr: `ETH-${moment(parseInt(s.expiration) * 1000).format('DDMMMYY').toUpperCase()}-${strikeH}`,
      id: s.id,
      expirationH: date,
      expiration: s.expiration,
      netDHVExposureH: netDHVExposureH,
      netDHVExposure: s.netDHVExposure,
      strikeH,
      strike: s.strike,
      isPut: s.isPut,
      type: s.isPut ? 'PUT' : 'CALL',
      isBuyable: s.isBuyable,
      isSellable: s.isSellable
    }
  })

const getPrices = async (option) => {
  const oneToken = new BigNumber('1e18')
  const optionId = [
    option.expiration,
    option.strike,
    option.isPut,
    weth, // underlying
    usdc, // strikeAsset
    usdc  // collateral
  ]
  const sellPrice = contract.quoteOptionPrice(
    optionId,
    oneToken.toString(),
    true, //isSell
    option.netDHVExposure
  )
  const buyPrice = contract.quoteOptionPrice(
    optionId,
    oneToken.toString(),
    false, //isSell
    option.netDHVExposure
  )

  const [[sellPriceH, sellTotalDeltaH, sellTotalFeesH], [buyPriceH, buyTotalDeltaH, buyTotalFeesH]] = await Promise.all([
    sellPrice,
    buyPrice
  ])

  return {
    sellPrice: new BigNumber(sellPriceH.toString()).div('1e6').toNumber(),
    buyPrice: new BigNumber(buyPriceH.toString()).div('1e6').toNumber(),
    delta: new BigNumber(sellTotalDeltaH.toString()).div(oneToken).toNumber(),
  }
}

const fetchPrices = async () => {
  const series = await getSeries()
  console.log(`Found ${series.length} series`)
  const formattedSeries = formatSeries(series)
  const prices = await Promise.all(formattedSeries.map(getPrices))
  console.log(`Fetched ${prices.length} prices`)
  return formattedSeries.map((s, i) => ({
    ...s,
    ...prices[i]
  }))
}

export default fetchPrices
