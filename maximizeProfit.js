export default function findMaxProfit(buy, sell, pricer) {
  const buyDeltaBand = buy.delta * 100 / pricer.deltaBandWidth
  const sellDeltaBand = sell.delta * 100 / pricer.deltaBandWidth
  const g = pricer.slippageGradient * pricer.deltaBand
  const dhv = pricer.netDHVExposure
  const buyPrice = buy.buyPrice
  const sellPrice = sell.sellPrice

  function cDoublePrime(amount, gradient, netDHVExposure) {
    const numerator = Math.pow(1 + gradient, -amount - netDHVExposure) * (-2 + 2 * Math.pow(1 + gradient, amount) - 2 * amount * Math.log(1 + gradient) - amount * amount * Math.pow(Math.log(1 + gradient), 2));
    const denominator = Math.pow(amount, 3) * Math.log(1 + gradient);
    return numerator / denominator;
  }
  
  function cPrime(amount, gradient, netDHVExposure) {
    const numerator = Math.pow(1 + gradient, -amount - netDHVExposure) * (1 - Math.pow(1 + gradient, amount) + amount * Math.log(1 + gradient));
    const denominator = Math.pow(amount, 2) * Math.log(1 + gradient);
    return numerator / denominator;
  }
  
  function c(amount, gradient, netDHVExposure) {
    const numerator = Math.pow(1 + gradient, -netDHVExposure) - Math.pow(1 + gradient, -netDHVExposure - amount);
    const denominator = amount * Math.log(1 + gradient);
    return numerator / denominator;
  }
  
  function vDoublePrime(amount, gradient, netDHVExposure) {
    const numerator = Math.pow(1 + gradient, -amount - netDHVExposure) * (2 - 2 * Math.pow(1 + gradient, amount) + 2 * amount * Math.log(1 + gradient) + Math.pow(amount, 2) * Math.pow(Math.log(1 + gradient), 2));
    const denominator = Math.pow(amount, 3) * Math.log(1 + gradient);
    return numerator / denominator;
  }
  
  
  function vPrime(amount, gradient, netDHVExposure) {
    const numerator = Math.pow(1 + gradient, -amount - netDHVExposure) * (-1 + Math.pow(1 + gradient, amount) - amount * Math.log(1 + gradient));
    const denominator = Math.pow(amount, 2) * Math.log(1 + gradient);
    return numerator / denominator;
  }
  
  function v(amount, gradient, netDHVExposure) {
    const numerator = Math.pow(1 + gradient, -netDHVExposure - amount) - Math.pow(1 + gradient, -netDHVExposure);
    const denominator = amount * Math.log(1 + gradient);
    return numerator / denominator;
  }
  
  function LDoublePrime(amount, P, Q) {
    return 2*P*vPrime(amount, g, dhv) + P*amount*vDoublePrime(amount, g, dhv) - 2*Q*cPrime(amount, g, dhv) - Q*amount*cDoublePrime(amount, g, dhv);
  }
  
  function LPrime(amount, P, Q) {
    return P*v(amount) + P*amount*vPrime(amount, g, dhv) - Q*c(amount, g, dhv) - Q*amount*cPrime(amount, g, dhv);
  }
  
  function L(amount, P, Q) {
    return P*amount*v(amount, g, dhv) - Q*amount*c(amount, g, dhv);
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
  
  const optimalAmount = newtonMethod(1, buyPrice, sellPrice, 0.0000001, 1000)

  const profit = L(optimalAmount, buyPrice, sellPrice)

  return {
    profit,
    optimalAmount
  }
}
