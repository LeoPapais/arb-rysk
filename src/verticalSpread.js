function findPositiveSpreads(options) {
  let positiveSpreads = [];

  // Sort the options by strike price
  options.sort((a, b) => parseInt(a.strike) - parseInt(b.strike));

  // Loop through the array, comparing each option with every other option
  for (let i = 0; i < options.length; i++) {
    for (let j = 0; j < options.length; j++) {
      // Check if they are the same type (CALL or PUT), have the same expiration date and different strike price
      const sameType = options[i].type === options[j].type
      const sameExpiration = options[i].expiration === options[j].expiration
      const differentStrike = options[i].strike !== options[j].strike
      const isVerticalSpread = sameType && sameExpiration && differentStrike
      const debt = parseFloat(options[i].buyPrice) - parseFloat(options[j].sellPrice)
      if (isVerticalSpread && debt < 0) {
        // Check if the cost of buying the lower strike option is less than the cost of selling the higher strike option
        if (options[i].type === 'CALL' && options[i].strike <= options[j].strike) {
          positiveSpreads.push({
            buy: options[i],
            sell: options[j],
            netCost: debt,
            action: `buy call at strike ${options[i].strike}  for ${options[i].buyPrice} and sell  at strike ${options[j].strike}  for ${options[j].sellPrice}`
          });
        }
        if (options[i].type === 'PUT' && options[i].strike >= options[j].strike) {
          positiveSpreads.push({
            buy: options[i],
            sell: options[j],
            netCost: debt,
            action: `buy put strike ${options[i].strike}  for ${options[i].buyPrice} and sell for ${options[j].sellPrice}`
          });
        }
      }
    }
  }

  return positiveSpreads.sort((a, b) => -b.netCost + a.netCost);
}

export default findPositiveSpreads
