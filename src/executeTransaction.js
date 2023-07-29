import { ethers } from 'ethers'
import BigNumber from 'bignumber.js'

import settings from './settings.js'
import optionExchangeAbi from '../abi/OptionExchangeAbi.json' assert { type: "json" }
import controllerAbi from '../abi/controllerAbi.json' assert { type: "json" }
import erc20 from '../abi/erc20.json' assert { type: "json" }

const {
  providerUrl,
  optionExchangeAddress,
  myWallet,
  privateKey,
  usdc,
  controller,
  weth,
} = settings.goerli

const provider = new ethers.providers.JsonRpcProvider(providerUrl)
const signer = new ethers.Wallet(privateKey, provider)
const optionExchange = new ethers.Contract(optionExchangeAddress, optionExchangeAbi, signer)
const controllerContract = new ethers.Contract(controller, controllerAbi, signer)
const usd = new ethers.Contract(usdc, erc20, signer)
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const buildSellOptionsInput = (amount, minPrice, vaultId, wallet, option, marginRequirement, otoken) => {
  return [
    {
      operation: 0,  // 0 means opyn operation
      operationQueue: [
        {
          actionType: '0x0', // 0 on an opyn operation means Open Vault which is represented by a vaultId
                        // https://github.com/rysk-finance/dynamic-hedging/blob/rysk-beyond/packages/contracts/contracts/packages/opyn/libs/Actions.sol#L39
          owner: wallet, // must be the msg.sender
          secondAddress: ZERO_ADDRESS, // not important here
          asset: ZERO_ADDRESS, // not important here
          vaultId: vaultId.toNumber(), // vaultId, each short position the user holds will be held in a unique vaultId, when opening a new vault the id must be the next vault id
          amount: 0, // not important here
          optionSeries: {
            expiration: `0x${new BigNumber(option.expiration).toString(16)}`,
            strike: `0x${new BigNumber(option.strike).toString(16)}`,
            isPut: option.type === 'PUT',
            underlying: weth, //underlying
            strikeAsset: usdc, // strike asset
            collateral: usdc  // collateral
          }, // not important here
          indexOrAcceptablePremium: 0, // always 0 for opyn
          data: ethers.utils.defaultAbiCoder.encode(["uint256"], [1]) // 1 here represents partially collateralised, 0 represents fully collateralised
        },
        {
          actionType: '0x5', // 5 represents a Deposit Collateral action
          owner: wallet, // must be the msg.sender
          secondAddress: optionExchangeAddress, // this can be set as the senderAddress or exchange address, if set to the exchange address then the user approval goes to the exchange, if set to the sender address then the user approval goes to the opyn margin pool
          asset: usdc, 
          vaultId: vaultId.toHexString(),  // vault id to deposit collateral into
          amount: `${marginRequirement.toString(16)}`, // margin required to collateralise the position in collateral decimals, 
                  // this is a bit more difficult to get https://github.com/rysk-finance/dynamic-hedging/blob/rysk-beyond/packages/contracts/contracts/packages/opyn/new/NewCalculator.sol#L367, make sure the decimals for strikePrice and underlyingPrice on this contract are e8
          optionSeries: {
            expiration: `0x${new BigNumber(option.expiration).toString(16)}`,
            strike: `0x${new BigNumber(option.strike).toString(16)}`,
            isPut: option.type === 'PUT',
            underlying: weth, //underlying
            strikeAsset: usdc, // strike asset
            collateral: usdc  // collateral
          }, // not important here
          indexOrAcceptablePremium: 0, // always 0 for opyn
          data: ZERO_ADDRESS // not important
        },
        {
          actionType: '0x1', // 1 represents a mint otoken operation (minting an option contract, this only works if there is enough collateral)
          owner: wallet, 
          secondAddress: optionExchangeAddress, // most of the time this should be set to exchange address, this helps avoid an extra approval from the user on the otoken when selling to the dhv
          vaultId: `${vaultId.toHexString()}`,
          amount: `0x${amount.dividedToIntegerBy('10000000000').toString(16)}`, // amount needs to be in e8 decimals
          asset: otoken,
          optionSeries: {
            expiration: `0x${new BigNumber(option.expiration).toString(16)}`,
            strike: `0x${new BigNumber(option.strike).toString(16)}`,
            isPut: option.type === 'PUT',
            underlying: weth, //underlying
            strikeAsset: usdc, // strike asset
            collateral: usdc  // collateral
          }, // not important here
          indexOrAcceptablePremium: 0, // always 0 for opyn
          data: ZERO_ADDRESS // not important
        }
      ]
    },
    {
      operation: 1, // indicates a rysk operation
      operationQueue: [
        {
          actionType: 2, // this is a sell action
          owner: ZERO_ADDRESS, // not important
          secondAddress: wallet, // recipient of premium
          asset: ZERO_ADDRESS, // can be zero if the optionSeries field is populated
          vaultId: 0, // not important
          amount: `0x${amount.toString(16)}`, // amount needs to be in e18 decimals
          optionSeries: {
            expiration: `0x${new BigNumber(option.expiration).toString(16)}`,
            strike: `0x${new BigNumber(option.strike).toString(16)}`,
            isPut: option.type === 'PUT',
            underlying: weth, //underlying
            strikeAsset: usdc, // strike asset
            collateral: usdc  // collateral
          },
          indexOrAcceptablePremium: `0x${Math.floor(minPrice.toNumber()).toString(16)}`, // acceptable premium (should be lower than quote)
          data: "0x"
        }
      ]
    }
  ]
}

const buildBuyOptionsInput = (amount, maxPrice, wallet, option) => {
  return [
    {
      operation: 1,
      operationQueue: [
        {
          actionType: `0x${new BigNumber(0).toString(16)}`,
          owner: ZERO_ADDRESS,
          secondAddress: ZERO_ADDRESS,
          asset: ZERO_ADDRESS,
          vaultId: `0x${new BigNumber(0).toString(16)}`,
          amount: `0x${new BigNumber(0).toString(16)}`,
          optionSeries: {
            expiration: `0x${new BigNumber(option.expiration).toString(16)}`,
            strike: `0x${new BigNumber(option.strike).toString(16)}`,
            isPut: option.type === 'PUT',
            underlying: weth, //underlying
            strikeAsset: usdc, // strike asset
            collateral: usdc  // collateral
          },
          indexOrAcceptablePremium: `0x${new BigNumber(0).toString(16)}`,
          data: ZERO_ADDRESS
        },
        {
          actionType: `0x${new BigNumber(1).toString(16)}`,
          owner: ZERO_ADDRESS,
          secondAddress: wallet,
          asset: ZERO_ADDRESS,
          vaultId: `0x${new BigNumber(0).toString(16)}`,
          amount: `0x${new BigNumber(amount).toString(16)}`,
          optionSeries: {
            expiration: `0x${new BigNumber(option.expiration).toString(16)}`,
            strike: `0x${new BigNumber(option.strike).toString(16)}`,
            isPut: option.type === 'PUT',
            underlying: weth, //underlying
            strikeAsset: usdc, // strike asset
            collateral: usdc  // collateral
          },
          indexOrAcceptablePremium: `0x${Math.floor(maxPrice.toNumber()).toString(16)}`,
          data: "0x" // for all rysk actions this is empty
        }
      ]
    }
  ]
}

const operate = async ({ buy, sell, optimalAmount: optimalAmountFloat }) => {
  let optimalAmount = Math.floor(optimalAmountFloat * 100)/100
  const vaultId = (await controllerContract.getAccountVaultCounter(myWallet)).add(1)
  let marginRequirement = new BigNumber(sell.strike).div('1e12').multipliedBy(optimalAmount).dividedToIntegerBy(2).toString() //await getMarginRequirement(sell, new BigNumber(optimalAmount).multipliedBy('1e18'), usdc)
  const usdcBalance = new BigNumber((await usd.balanceOf(myWallet)).toString())

  if (usdcBalance.isLessThan(marginRequirement)) {
    const resourceAlocation = 0.9
    optimalAmount = usdcBalance.dividedBy(marginRequirement).multipliedBy(resourceAlocation).multipliedBy(optimalAmount).toNumber()
    const newBuy = {
      ...buy,
      buyPrice: usdcBalance.dividedBy(marginRequirement).multipliedBy(resourceAlocation).multipliedBy(buy.buyPrice).toNumber()
    }
    const newSell = {
      ...sell,
      sellPrice: usdcBalance.dividedBy(marginRequirement).multipliedBy(resourceAlocation).multipliedBy(sell.sellPrice).toNumber()
    }
    await operate({ buy: newBuy, sell: newSell, optimalAmount })
    return
  }
  const proposedSeries =  {
    expiration: `0x${new BigNumber(sell.expiration).toString(16)}`,
    strike: `0x${new BigNumber(sell.strike).toString(16)}`,
    isPut: sell.type === 'PUT',
    underlying: weth, //underlying
    strikeAsset: usdc, // strike asset
    collateral: usdc  // collateral
  }
  const otoken = await optionExchange.callStatic.createOtoken(proposedSeries)
  const buyInput = buildBuyOptionsInput(new BigNumber(optimalAmount).multipliedBy('1e18'), new BigNumber(buy.buyPrice).multipliedBy('1.03e6'), myWallet, buy)
  const sellInput = buildSellOptionsInput(new BigNumber(optimalAmount).multipliedBy('1e18'), new BigNumber(sell.sellPrice).multipliedBy('0.97e6'), vaultId, myWallet, sell, marginRequirement, otoken)
  console.log({
    optimalAmount: new BigNumber(optimalAmount).toString(),
    buyPrice: new BigNumber(buy.buyPrice).toString(),
    buyStr: buy.strikeStr,
    sellPrice: new BigNumber(sell.sellPrice).toString(),
    sellStr: sell.strikeStr,
    marginRequirement
  })
  const input = [...sellInput, ...buyInput]

  console.log('approving')
  try {
    await usd.approve(optionExchangeAddress, new BigNumber(marginRequirement).multipliedBy('1e4').toString())
    console.log('aproved. operating', JSON.stringify(input, null, 2))
    const res = await optionExchange.operate(input, { gasLimit: 14700000 })
  }
  catch (e) {
    console.error(e)
  }
}

export default operate
