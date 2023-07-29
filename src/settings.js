import dotenv from 'dotenv'
dotenv.config()

const settings = {
  goerli: {
    providerUrl: 'https://arbitrum-goerli.rpc.thirdweb.com',
    wssProviderUrl: 'wss://arbitrum-goerli.rpc.thirdweb.com',
    subgraphUrl: 'https://api.goldsky.com/api/public/project_clhf7zaco0n9j490ce421agn4/subgraphs/devey/0.0.2/gn',
    beyondPricerAddress: '0xc939df369C0Fc240C975A6dEEEE77d87bCFaC259',
    usdc: '0x408c5755b5c7a0a28D851558eA3636CfC5b5b19d',
    weth: '0x3b3a1dE07439eeb04492Fa64A889eE25A130CDd3',
    priceFeedAddress: '0xf7B1e3a7856067BEcee81FdE0DD38d923b99554D',
    volatilityFeedAddress: '0xf058Fe438AAF22617C30997579E89176e19635Dc',
    optionExchangeAddress: '0xb672fE86693bF6f3b034730f5d2C77C8844d6b45',
    marginCalculatorAddress: '0xcD270e755C2653e806e16dD3f78E16C89B7a1c9e',
    myWallet: '0x3dcb7aa05550439269aa4b6ec191c658440d22e0',
    controller: '0x11a602a5F5D823c103bb8b7184e22391Aae5F4C2',
    privateKey: process.env.goerli_private_key,
  },
  arbMainnet: {
  }
}

export default settings