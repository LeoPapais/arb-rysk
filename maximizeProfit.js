import {ethers} from 'ethers'
import pkg from "ethers-multicall-provider"
import BigNumber from 'bignumber.js'

const { MulticallWrapper } = pkg

import settings from './settings.js'
import pricerAbi from './beyondPricerAbi.json' assert { type: "json" }

const {
  providerUrl,
  beyondPricerAddress,
} = settings.goerli

const provider = MulticallWrapper.wrap(new ethers.providers.JsonRpcProvider(providerUrl))
const beyondPricer = new ethers.Contract(beyondPricerAddress, pricerAbi, provider)

const getPricerData = async () => {
  const [
    deltaBandWidth,
    slippageGradient,
    [callSlippageGradientMultipliers],
    [putSlippageGradientMultipliers]
  ] = await Promise.all([
    beyondPricer.functions.deltaBandWidth(),
    beyondPricer.functions.slippageGradient(),
    beyondPricer.functions.getCallSlippageGradientMultipliers(),
    beyondPricer.functions.getPutSlippageGradientMultipliers(),
  ])
  return {
    deltaBandWidth: new BigNumber(deltaBandWidth.toString()).div('1e18').toNumber(),
    slippageGradient: new BigNumber(slippageGradient.toString()).div('1e18').toNumber(),
    callSlippageGradientMultipliers: callSlippageGradientMultipliers.map(m => new BigNumber(m.toString()).div('1e18').toNumber()),
    putSlippageGradientMultipliers: putSlippageGradientMultipliers.map(m => new BigNumber(m.toString()).div('1e18').toNumber()),
  }
}

const findOptimalAmount = async (buyRaw, sellRaw, action) => {
  const pricer = getPricerData()
  const buy = {
    ...buyRaw,
    delta: new BigNumber(buyRaw.delta).div('1e18').toNumber(),
    buyPrice: new BigNumber(buyRaw.buyPrice).toNumber(),
    delta: new BigNumber(buyRaw.delta).div('1e18').toNumber(),
    netDHVExposure: new BigNumber(buyRaw.netDHVExposure).div('1e18').toNumber(),
  }

  const sell = {
    ...sellRaw,
    delta: new BigNumber(sellRaw.delta).div('1e18').toNumber(),
    sellPrice: new BigNumber(sellRaw.sellPrice).toNumber(),
    delta: new BigNumber(sellRaw.delta).div('1e18').toNumber(),
    netDHVExposure: new BigNumber(sellRaw.netDHVExposure).div('1e18').toNumber(),
  }

  return findMaxProfit(buy, sell, pricer)
}

function findMaxProfit(buy, sell, pricer) {
  const buyDeltaBandIndex = Math.abs(Math.floor(buy.delta * 100 / pricer.deltaBandWidth))
  const sellDeltaBandIndex = Math.abs(Math.floor(sell.delta * 100 / pricer.deltaBandWidth))
  const buyGradMultiplier = buy.type === 'CALL' ? pricer.callSlippageGradientMultipliers[buyDeltaBandIndex] : pricer.putSlippageGradientMultipliers[buyDeltaBandIndex]
  const sellGradMultiplier = sell.type === 'PUT' ? pricer.putSlippageGradientMultipliers[sellDeltaBandIndex] : pricer.callSlippageGradientMultipliers[sellDeltaBandIndex]

  const buyGradient = pricer.slippageGradient * buyGradMultiplier
  const sellGradient = pricer.slippageGradient * sellGradMultiplier

  const buyDHV = buy.netDHVExposure
  const sellDHV = sell.netDHVExposure
  const buyPrice = buy.buyPrice
  const sellPrice = sell.sellPrice

  function cDoublePrime(amount, gradient, netDHVExposure) {
    const numerator = -2 + 2 * Math.pow(1 + gradient, amount) - 2 * Math.pow(1 + gradient, amount) * amount * Math.log(1 + gradient) + Math.pow(1 + gradient, amount) * Math.pow(amount, 2) * Math.pow(Math.log(1 + gradient), 2);
    const denominator = Math.pow(1 + gradient, netDHVExposure) * Math.pow(amount, 3) * Math.log(1 + gradient);
    return numerator / denominator;
  }
  
  function cPrime(amount, gradient, netDHVExposure) {
    const numerator = 1 - Math.pow(1 + gradient, amount) + Math.pow(1 + gradient, amount) * amount * Math.log(1 + gradient);
    const denominator = Math.pow(1 + gradient, netDHVExposure) * Math.pow(amount, 2) * Math.log(1 + gradient);
    return numerator / denominator;
  }
  
  function c(amount, gradient, netDHVExposure) {
    const numerator = Math.pow(1 + gradient, -netDHVExposure + amount) - Math.pow(1 + gradient, -netDHVExposure);
    const denominator = amount * Math.log(1 + gradient);
    return  numerator / denominator;
  }
  
  function vDoublePrime(amount, gradient, netDHVExposure) {
    const numerator = Math.pow(1 + gradient, -amount - netDHVExposure) * (-2 + 2 * Math.pow(1 + gradient, amount) - 2 * amount * Math.log(1 + gradient) - Math.pow(amount, 2) * Math.pow(Math.log(1 + gradient), 2));
    const denominator = Math.pow(amount, 3) * Math.log(1 + gradient);
    return numerator / denominator;
  }
  
  
  function vPrime(amount, gradient, netDHVExposure) {
    const numerator = Math.pow(1 + gradient, -amount - netDHVExposure) * (1 - Math.pow(1 + gradient, amount) + amount * Math.log(1 + gradient));
    const denominator = Math.pow(amount, 2) * Math.log(1 + gradient);
    return numerator / denominator;
  }

  function v(amount, gradient, netDHVExposure) {
    const numerator = Math.pow(1 + gradient, -netDHVExposure) - Math.pow(1 + gradient, -netDHVExposure - amount);
    const denominator = amount * Math.log(1 + gradient);
    return numerator / denominator;
  }
  
  function LDoublePrime(amount, P, Q) {
    return 2*P*vPrime(amount, sellGradient, sellDHV) + P*amount*vDoublePrime(amount, sellGradient, sellDHV) - 2*Q*cPrime(amount, buyGradient, buyDHV) - Q*amount*cDoublePrime(amount, buyGradient, buyDHV);
  }
  
  function LPrime(amount, P, Q) {
    return P*v(amount, sellGradient, sellDHV) + P*amount*vPrime(amount, sellGradient, sellDHV) - Q*c(amount, buyGradient, buyDHV) - Q*amount*cPrime(amount, buyGradient, buyDHV);
  }
  
  function L(amount, P, Q) {
    return P*amount*v(amount, sellGradient, sellDHV) - Q*amount*c(amount, buyGradient, buyDHV);
  }

  function newtonMethod(initialGuess, P, Q, epsilon, maxIterations) {
    let a = initialGuess;
    let iter = 0;
  
    while (iter < maxIterations) {
        let fval = LPrime(a, P, Q);
        let fderiv = LDoublePrime(a, P, Q);
  
        if (Math.abs(fval / fderiv) < epsilon) {
          // se o valor da função é pequeno o suficiente, assumimos que encontramos a raiz
            console.log("converged!!!!");
            break;
        }
  
        // atualize a estimativa usando a fórmula do método de Newton
        a = a - fval / fderiv;
        iter++;
    }
  
    if (iter == maxIterations) {
        console.log("Atingido o número máximo de iterações");
    }
  
    return a;
  }

  const baseBuyPrice = buyPrice / c(1, buyGradient, buyDHV)
  const baseSellPrice = sellPrice / v(1, sellGradient, sellDHV)
  
  const optimalAmount = newtonMethod(1, baseSellPrice, baseBuyPrice, 0.0000001, 1000)

  const profit = L(optimalAmount, baseSellPrice, baseBuyPrice)

  return {
    profit,
    optimalAmount
  }
}
export default findOptimalAmount