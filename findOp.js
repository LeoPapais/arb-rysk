import fetchPrices from "./getPrices.js";
import findPositiveSpreads from "./verticalSpread.js";
import findOptimalAmount from "./maximizeProfit.js";
import operate from "./executeTransaction.js";

const main = async () => {
  const prices = await fetchPrices();
  const positiveSpreads = findPositiveSpreads(prices);

  const optimalAmounts = await Promise.all(
    positiveSpreads.map(({ buy, sell, action }) =>
      findOptimalAmount(buy, sell, action)
    )
  );
  await operate(optimalAmounts[0])
}

main();
