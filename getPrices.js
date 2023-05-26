import fetch from 'node-fetch'
import moment from 'moment'
import BigNumber from 'bignumber.js'
import {ethers} from 'ethers'

import settings from './settings.js'
import pricerAbi from './beyondPricerAbi.json' assert { type: "json" }

const {
  subgraphUrl,
  providerUrl,
  beyondPricerAddress,
  usdc,
  weth
} = settings.goerli

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
  const provider = new ethers.JsonRpcProvider(providerUrl)
  const contract = new ethers.Contract(beyondPricerAddress, pricerAbi, provider)
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
  const callPrice = contract.quoteOptionPrice(
    optionId,
    oneToken.toString(),
    false, //isSell
    option.netDHVExposure
  )

  const [[sellPriceH], [callPriceH]] = await Promise.all([
    sellPrice,
    callPrice
  ])
  return {
    sellPrice: sellPriceH.toString(),
    callPrice: callPriceH.toString()
  }
}
