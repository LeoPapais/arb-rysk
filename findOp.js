import fetchPrices from "./getPrices";
import findPositiveSpreads from "./findOp";
import findOptimalAmount from "./maximizeProfit";

const main = async () => {
  const prices = await fetchPrices();
  const positiveSpreads = findPositiveSpreads(prices);
  const optimalAmounts = await Promise.all(
    positiveSpreads.map(({ buy, sell, action }) =>
      findOptimalAmount(buy, sell, action)
    )
  );
  console.log(optimalAmounts);
}

main();