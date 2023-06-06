import settings from './settings.js'
import { ethers } from 'ethers'
import optionExchangeAbi from './OptionExchangeAbi.json' assert { type: "json" }
const input = [
  {
    "operation": 0,
    "operationQueue": [
      {
        "actionType": "0x1",
        "owner": "0x3dcb7aa05550439269aa4b6ec191c658440d22e0",
        "secondAddress": "0xb672fE86693bF6f3b034730f5d2C77C8844d6b45",
        "asset": "0x0000000000000000000000000000000000000000",
        "vaultId": "0x1",
        "amount": "0x1de7f662",
        "optionSeries": {
          "expiration": "0x649e8b80",
          "strike": "0x56bc75e2d631000000",
          "isPut": true,
          "underlying": "0x3b3a1dE07439eeb04492Fa64A889eE25A130CDd3",
          "strikeAsset": "0x408c5755b5c7a0a28D851558eA3636CfC5b5b19d",
          "collateral": "0x408c5755b5c7a0a28D851558eA3636CfC5b5b19d"
        },
        "indexOrAcceptablePremium": 0,
        "data": "0x0000000000000000000000000000000000000000"
      }
    ]
  }
]

const {
  providerUrl,
  optionExchangeAddress,
  privateKey,
} = settings.goerli

const provider = new ethers.providers.JsonRpcProvider(providerUrl)
const signer = new ethers.Wallet(privateKey, provider)
const optionExchange = new ethers.Contract(optionExchangeAddress, optionExchangeAbi, signer)

optionExchange.operate(input, { gasLimit: 4700000 }).then(console.log)