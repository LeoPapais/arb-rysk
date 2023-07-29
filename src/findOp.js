import fetchPrices from "./getPrices.js";
import findPositiveSpreads from "./verticalSpread.js";
import findOptimalAmount from "./maximizeProfit.js";
import operate from "./executeTransaction.js";

const main = async () => {
  const prices = await fetchPrices();
  const positiveSpreads = findPositiveSpreads(prices);
  console.log(`found ${positiveSpreads.length} positive spreads`)
  console.log(positiveSpreads)
  const optimalAmounts = await Promise.all(
    positiveSpreads.map(({ buy, sell, action }) =>
      findOptimalAmount(buy, sell, action)
    )
  );
  if (optimalAmounts[0]) {
    console.log(optimalAmounts[0])
    operate(optimalAmounts[0])
  }
  else {
    console.log('No profitable spreads found')
  }

}

main()