// Service de pricing qui réutilise les fonctions existantes d'Index.tsx
export class PricingService {
  // Error function (erf) implementation
  static erf(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const sign = (x < 0) ? -1 : 1;
    x = Math.abs(x);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - ((((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
    
    return sign * y;
  }

  // Cumulative Normal Distribution
  static CND(x: number): number {
    return (1 + this.erf(x / Math.sqrt(2))) / 2;
  }

  // FX Forward Pricing Model
  static calculateFXForwardPrice(S: number, r_d: number, r_f: number, t: number): number {
    return S * Math.exp((r_d - r_f) * t);
  }

  // Garman-Kohlhagen FX Option Pricing Model
  static calculateGarmanKohlhagenPrice(
    type: string, 
    S: number, 
    K: number, 
    r_d: number, 
    r_f: number, 
    t: number, 
    sigma: number
  ): number {
    const d1 = (Math.log(S / K) + (r_d - r_f + (sigma * sigma) / 2) * t) / (sigma * Math.sqrt(t));
    const d2 = d1 - sigma * Math.sqrt(t);
    
    if (type === 'call') {
      return S * Math.exp(-r_f * t) * this.CND(d1) - K * Math.exp(-r_d * t) * this.CND(d2);
    } else {
      return K * Math.exp(-r_d * t) * this.CND(-d2) - S * Math.exp(-r_f * t) * this.CND(-d1);
    }
  }

  // Vanilla Option Monte Carlo
  static calculateVanillaOptionMonteCarlo(
    optionType: string,
    S: number,
    K: number,
    r_d: number,
    r_f: number,
    t: number,
    sigma: number,
    numSimulations: number = 1000
  ): number {
    let payoffSum = 0;
    
    for (let i = 0; i < numSimulations; i++) {
      // Generate random normal variable (Box-Muller transform)
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      
      // Simulate final FX price using geometric Brownian motion
      const finalPrice = S * Math.exp(
        (r_d - r_f - 0.5 * sigma * sigma) * t + 
        sigma * Math.sqrt(t) * z
      );
      
      // Calculate payoff
      let payoff = 0;
      if (optionType === 'call') {
        payoff = Math.max(finalPrice - K, 0);
      } else if (optionType === 'put') {
        payoff = Math.max(K - finalPrice, 0);
      }
      
      payoffSum += payoff;
    }
    
    const averagePayoff = payoffSum / numSimulations;
    const optionPrice = averagePayoff * Math.exp(-r_d * t);
    
    return Math.max(0, optionPrice);
  }

  // Barrier Option Pricing with Monte Carlo
  static calculateBarrierOptionPrice(
    optionType: string,
    S: number,
    K: number,
    r: number,
    t: number,
    sigma: number,
    barrier: number,
    secondBarrier?: number,
    numSimulations: number = 1000
  ): number {
    const numSteps = Math.max(252 * t, 50);
    const dt = t / numSteps;
    
    const paths = [];
    for (let i = 0; i < numSimulations; i++) {
      const path = [S];
      
      for (let step = 0; step < numSteps; step++) {
        const previousPrice = path[path.length - 1];
        const randomWalk = Math.random() * 2 - 1;
        
        const nextPrice = previousPrice * Math.exp(
          (r - 0.5 * Math.pow(sigma, 2)) * dt + 
          sigma * Math.sqrt(dt) * randomWalk
        );
        
        path.push(nextPrice);
      }
      
      paths.push(path);
    }
    
    const optionPrice = this.calculatePricesFromPaths(
      optionType,
      S,
      K,
      r,
      numSteps,
      paths,
      barrier,
      secondBarrier
    );

    return Math.max(0, optionPrice);
  }

  // Calculate prices from Monte Carlo paths
  static calculatePricesFromPaths(
    optionType: string,
    S: number,
    K: number,
    r: number,
    maturityIndex: number,
    paths: number[][],
    barrier?: number,
    secondBarrier?: number
  ): number {
    let priceSum = 0;
    const numSimulations = paths.length;
    
    for (let i = 0; i < numSimulations; i++) {
      const path = paths[i];
      const finalPrice = path[maturityIndex] || path[path.length - 1];
      let barrierKnockedOut = false;
      let barrierKnockedIn = false;
      
      // Check barrier conditions
      if (barrier !== undefined) {
        for (let j = 0; j < path.length; j++) {
          const currentPrice = path[j];
          
          if (optionType.includes('knockout')) {
            if (optionType.includes('call') && currentPrice >= barrier) {
              barrierKnockedOut = true;
              break;
            } else if (optionType.includes('put') && currentPrice <= barrier) {
              barrierKnockedOut = true;
              break;
            }
          } else if (optionType.includes('knockin')) {
            if (optionType.includes('call') && currentPrice >= barrier) {
              barrierKnockedIn = true;
            } else if (optionType.includes('put') && currentPrice <= barrier) {
              barrierKnockedIn = true;
            }
          }
        }
      }
      
      // Calculate option payoff
      let payoff = 0;
      
      if (optionType.includes('knockout')) {
        if (!barrierKnockedOut) {
          if (optionType.includes('call')) {
            payoff = Math.max(finalPrice - K, 0);
          } else if (optionType.includes('put')) {
            payoff = Math.max(K - finalPrice, 0);
          }
        }
      } else if (optionType.includes('knockin')) {
        if (barrierKnockedIn) {
          if (optionType.includes('call')) {
            payoff = Math.max(finalPrice - K, 0);
          } else if (optionType.includes('put')) {
            payoff = Math.max(K - finalPrice, 0);
          }
        }
      } else {
        // Standard option
        if (optionType === 'call') {
          payoff = Math.max(finalPrice - K, 0);
        } else if (optionType === 'put') {
          payoff = Math.max(K - finalPrice, 0);
        }
      }
      
      priceSum += payoff;
    }
    
    return Math.exp(-r * (maturityIndex / 252)) * (priceSum / numSimulations);
  }

  // Digital Option Pricing
  static calculateDigitalOptionPrice(
    optionType: string,
    S: number,
    K: number,
    r: number,
    t: number,
    sigma: number,
    barrier?: number,
    secondBarrier?: number,
    numSimulations: number = 10000,
    rebate: number = 1
  ): number {
    const rebateDecimal = rebate / 100;
    
    // Normaliser le type d'option pour le matching
    const normalizedType = optionType.toLowerCase().replace(/[-\s]/g, '');
    
    let payoutSum = 0;
    const stepsPerDay = 4;
    const totalSteps = Math.max(252 * t * stepsPerDay, 50);
    const dt = t / totalSteps;
    
    for (let sim = 0; sim < numSimulations; sim++) {
      let price = S;
      let touched = false;
      let touchedSecond = false;
      
              for (let step = 0; step < totalSteps; step++) {
          const z = Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
          price = price * Math.exp((r - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z);
          
          switch (normalizedType) {
          case 'onetouch':
            if (barrier !== undefined && price >= barrier) touched = true;
            break;
          case 'notouch':
            if (barrier !== undefined && price >= barrier) touched = true;
            break;
          case 'doubletouch':
            if (barrier !== undefined && price >= barrier) touched = true;
            if (secondBarrier !== undefined && price <= secondBarrier) touchedSecond = true;
            break;
          case 'doublenotouch':
            if ((barrier !== undefined && price >= barrier) || (secondBarrier !== undefined && price <= secondBarrier)) touched = true;
            break;
          case 'rangebinary':
            if (barrier !== undefined && K !== undefined && price >= K && price <= barrier) touched = true;
            break;
          case 'outsidebinary':
            if (barrier !== undefined && K !== undefined && (price <= K || price >= barrier)) touched = true;
            break;
        }
      }
      
      switch (normalizedType) {
        case 'onetouch':
          if (touched) payoutSum += rebateDecimal;
          break;
        case 'notouch':
          if (!touched) payoutSum += rebateDecimal;
          break;
        case 'doubletouch':
          if (touched || touchedSecond) payoutSum += rebateDecimal;
          break;
        case 'doublenotouch':
          if (!touched) payoutSum += rebateDecimal;
          break;
        case 'rangebinary':
          if (touched) payoutSum += rebateDecimal;
          break;
        case 'outsidebinary':
          if (touched) payoutSum += rebateDecimal;
          break;
      }
    }
    
    return Math.exp(-r * t) * (payoutSum / numSimulations);
  }

  // Barrier Option Closed-Form Pricing (from Index.tsx)
  static calculateBarrierOptionClosedForm(
    optionType: string,
    S: number,
    K: number,
    r_d: number,
    t: number,
    sigma: number,
    barrier: number,
    secondBarrier?: number,
    r_f: number = 0
  ): number {
    const r = r_d;  // Risk-free rate (domestic)
    const b = r_d - r_f;  // Cost of carry for FX options
    const v = sigma;
    const T = t;
    
    // Fonction pour calculer N(x) - cumulative normal distribution
    const CND = (x: number) => this.CND(x);
    
    // PARTIE 1: Options à barrière simple
    if (!optionType.includes('double')) {
      const mu = (b - v**2/2) / (v**2);
      const lambda = Math.sqrt(mu**2 + 2*r/(v**2));
      
      const X = K;
      const H = barrier;
      
      const X1 = Math.log(S/X) / (v * Math.sqrt(T)) + (1 + mu) * v * Math.sqrt(T);
      const X2 = Math.log(S/H) / (v * Math.sqrt(T)) + (1 + mu) * v * Math.sqrt(T);
      const y1 = Math.log(H**2/(S*X)) / (v * Math.sqrt(T)) + (1 + mu) * v * Math.sqrt(T);
      const y2 = Math.log(H/S) / (v * Math.sqrt(T)) + (1 + mu) * v * Math.sqrt(T);
      const Z = Math.log(H/S) / (v * Math.sqrt(T)) + lambda * v * Math.sqrt(T);
      
      let eta = 0, phi = 0;
      let TypeFlag = "";
      
      // Déterminer le TypeFlag basé sur le type d'option
      if (optionType === 'call-knockin' && H < S) {
        TypeFlag = "cdi"; // Call down-and-in
        eta = 1;
        phi = 1;
      } else if (optionType === 'call-knockin' && H > S) {
        TypeFlag = "cui"; // Call up-and-in
        eta = -1;
        phi = 1;
      } else if (optionType === 'put-knockin' && H < S) {
        TypeFlag = "pdi"; // Put down-and-in
        eta = 1;
        phi = -1;
      } else if (optionType === 'put-knockin' && H > S) {
        TypeFlag = "pui"; // Put up-and-in
        eta = -1;
        phi = -1;
      } else if (optionType === 'call-knockout' && H < S) {
        TypeFlag = "cdo"; // Call down-and-out
        eta = 1;
        phi = 1;
      } else if (optionType === 'call-knockout' && H > S) {
        TypeFlag = "cuo"; // Call up-and-out
        eta = -1;
        phi = 1;
      } else if (optionType === 'put-knockout' && H < S) {
        TypeFlag = "pdo"; // Put down-and-out
        eta = 1;
        phi = -1;
      } else if (optionType === 'put-knockout' && H > S) {
        TypeFlag = "puo"; // Put up-and-out
        eta = -1;
        phi = -1;
      } else if (optionType === 'put-reverse-knockout') {
        // Put-reverse-knockout : logique spéciale
        if (H > S) {
          // Barrière au-dessus du spot : équivalent à call-up-and-out
          TypeFlag = "cuo";
          eta = -1;
          phi = 1;
        } else {
          // Barrière en-dessous du spot : équivalent à call-down-and-out
          TypeFlag = "cdo";
          eta = 1;
          phi = 1;
        }
      } else if (optionType === 'call-reverse-knockout') {
        // Call-reverse-knockout : logique spéciale
        if (H > S) {
          // Barrière au-dessus du spot : équivalent à put-up-and-out
          TypeFlag = "puo";
          eta = -1;
          phi = -1;
        } else {
          // Barrière en-dessous du spot : équivalent à put-down-and-out
          TypeFlag = "pdo";
          eta = 1;
          phi = -1;
        }
      }
      
      if (TypeFlag === "") {
        console.warn(`[PRICING] Unknown barrier option type: ${optionType}, H=${H}, S=${S}, K=${K}`);
        return 0; // Type non reconnu
      }
      
      console.log(`[PRICING] ${optionType}: TypeFlag=${TypeFlag}, eta=${eta}, phi=${phi}, H=${H}, S=${S}, K=${K}`);
      console.log(`[PRICING] Cost of carry b=${b}, r=${r}, sigma=${v}, T=${T}`);
      
      // Calculer les termes f1-f6
      const f1 = phi * S * Math.exp((b-r)*T) * CND(phi*X1) - 
                phi * X * Math.exp(-r*T) * CND(phi*X1 - phi*v*Math.sqrt(T));
                
      const f2 = phi * S * Math.exp((b-r)*T) * CND(phi*X2) - 
                phi * X * Math.exp(-r*T) * CND(phi*X2 - phi*v*Math.sqrt(T));
                
      const f3 = phi * S * Math.exp((b-r)*T) * (H/S)**(2*(mu+1)) * CND(eta*y1) - 
                phi * X * Math.exp(-r*T) * (H/S)**(2*mu) * CND(eta*y1 - eta*v*Math.sqrt(T));
                
      const f4 = phi * S * Math.exp((b-r)*T) * (H/S)**(2*(mu+1)) * CND(eta*y2) - 
                phi * X * Math.exp(-r*T) * (H/S)**(2*mu) * CND(eta*y2 - eta*v*Math.sqrt(T));
      
      const cashRebate = 0;
      
      const f5 = cashRebate * Math.exp(-r*T) * (CND(eta*X2 - eta*v*Math.sqrt(T)) - 
              (H/S)**(2*mu) * CND(eta*y2 - eta*v*Math.sqrt(T)));
              
      const f6 = cashRebate * ((H/S)**(mu+lambda) * CND(eta*Z) + 
              (H/S)**(mu-lambda) * CND(eta*Z - 2*eta*lambda*v*Math.sqrt(T)));
      
      // Calculer le prix selon le TypeFlag et la relation entre X et H
      let optionPrice = 0;
      
      if (X > H) {
        switch (TypeFlag) {
          case "cdi": optionPrice = f3 + f5; break;
          case "cui": optionPrice = f1 + f5; break;
          case "pdi": optionPrice = f2 - f3 + f4 + f5; break;
          case "pui": optionPrice = f1 - f2 + f4 + f5; break;
          case "cdo": optionPrice = f1 - f3 + f6; break;
          case "cuo": optionPrice = f6; break;
          case "pdo": optionPrice = f1 - f2 + f3 - f4 + f6; break;
          case "puo": optionPrice = f2 - f4 + f6; break;
        }
      } else if (X < H) {
        switch (TypeFlag) {
          case "cdi": optionPrice = f1 - f2 + f4 + f5; break;
          case "cui": optionPrice = f2 - f3 + f4 + f5; break;
          case "pdi": optionPrice = f1 + f5; break;
          case "pui": optionPrice = f3 + f5; break;
          case "cdo": optionPrice = f2 - f4 + f6; break;
          case "cuo": optionPrice = f1 - f2 + f3 - f4 + f6; break;
          case "pdo": optionPrice = f6; break;
          case "puo": optionPrice = f1 - f3 + f6; break;
        }
      }
      
      console.log(`[PRICING] Final option price before max(0, x): ${optionPrice}`);
      return Math.max(0, optionPrice);
    }
    
    // PARTIE 2: Options à double barrière - implémentation identique au Strategy Builder
    else if (secondBarrier && optionType.includes('double')) {
      // Variables pour les options à double barrière selon le code VBA (Strategy Builder)
      const X = K; // Strike price
      const L = Math.min(barrier, secondBarrier); // Barrière inférieure
      const U = Math.max(barrier, secondBarrier); // Barrière supérieure
      
      // Paramètres pour les formules de double barrière (identiques au Strategy Builder)
      const delta1 = 0; // Taux de croissance des barrières (généralement 0)
      const delta2 = 0; // Taux de dividende (dans notre cas, 0)
      
      // Déterminer le TypeFlag en fonction du type d'option
      let TypeFlag = "";
      if (optionType.includes('call-double-knockout')) {
        TypeFlag = "co"; // Call double-knockout (out)
      } else if (optionType.includes('call-double-knockin')) {
        TypeFlag = "ci"; // Call double-knockin (in)
      } else if (optionType.includes('put-double-knockout')) {
        TypeFlag = "po"; // Put double-knockout (out)
      } else if (optionType.includes('put-double-knockin')) {
        TypeFlag = "pi"; // Put double-knockin (in)
      }
      
      // Si le type n'est pas reconnu, utiliser Monte Carlo
      if (TypeFlag === "") {
        return this.calculateBarrierOptionPrice(optionType, S, K, r, t, sigma, barrier, secondBarrier, 1000);
      }
      
      // Calculer les variables F et E selon le code VBA
      const F = U * Math.exp(delta1 * T);
      const E = L * Math.exp(delta1 * T);
      
      let Sum1 = 0;
      let Sum2 = 0;
      
      // Pour les options call double-barrière (ci/co)
      if (TypeFlag === "co" || TypeFlag === "ci") {
        // Somme sur un nombre fini de termes (-5 à 5 dans le code VBA)
        for (let n = -5; n <= 5; n++) {
          const d1 = (Math.log(S * U ** (2 * n) / (X * L ** (2 * n))) + (b + v ** 2 / 2) * T) / (v * Math.sqrt(T));
          const d2 = (Math.log(S * U ** (2 * n) / (F * L ** (2 * n))) + (b + v ** 2 / 2) * T) / (v * Math.sqrt(T));
          const d3 = (Math.log(L ** (2 * n + 2) / (X * S * U ** (2 * n))) + (b + v ** 2 / 2) * T) / (v * Math.sqrt(T));
          const d4 = (Math.log(L ** (2 * n + 2) / (F * S * U ** (2 * n))) + (b + v ** 2 / 2) * T) / (v * Math.sqrt(T));
          
          const mu1 = 2 * (b - delta2 - n * (delta1 - delta2)) / v ** 2 + 1;
          const mu2 = 2 * n * (delta1 - delta2) / v ** 2;
          const mu3 = 2 * (b - delta2 + n * (delta1 - delta2)) / v ** 2 + 1;
          
          Sum1 += (U ** n / L ** n) ** mu1 * (L / S) ** mu2 * (CND(d1) - CND(d2)) - 
                (L ** (n + 1) / (U ** n * S)) ** mu3 * (CND(d3) - CND(d4));
                
          Sum2 += (U ** n / L ** n) ** (mu1 - 2) * (L / S) ** mu2 * (CND(d1 - v * Math.sqrt(T)) - CND(d2 - v * Math.sqrt(T))) - 
                (L ** (n + 1) / (U ** n * S)) ** (mu3 - 2) * (CND(d3 - v * Math.sqrt(T)) - CND(d4 - v * Math.sqrt(T)));
        }
      }
      // Pour les options put double-barrière (pi/po)
      else if (TypeFlag === "po" || TypeFlag === "pi") {
        // Somme sur un nombre fini de termes (-5 à 5 dans le code VBA)
        for (let n = -5; n <= 5; n++) {
          const d1 = (Math.log(S * U ** (2 * n) / (E * L ** (2 * n))) + (b + v ** 2 / 2) * T) / (v * Math.sqrt(T));
          const d2 = (Math.log(S * U ** (2 * n) / (X * L ** (2 * n))) + (b + v ** 2 / 2) * T) / (v * Math.sqrt(T));
          const d3 = (Math.log(L ** (2 * n + 2) / (E * S * U ** (2 * n))) + (b + v ** 2 / 2) * T) / (v * Math.sqrt(T));
          const d4 = (Math.log(L ** (2 * n + 2) / (X * S * U ** (2 * n))) + (b + v ** 2 / 2) * T) / (v * Math.sqrt(T));
          
          const mu1 = 2 * (b - delta2 - n * (delta1 - delta2)) / v ** 2 + 1;
          const mu2 = 2 * n * (delta1 - delta2) / v ** 2;
          const mu3 = 2 * (b - delta2 + n * (delta1 - delta2)) / v ** 2 + 1;
          
          Sum1 += (U ** n / L ** n) ** mu1 * (L / S) ** mu2 * (CND(d1) - CND(d2)) - 
                (L ** (n + 1) / (U ** n * S)) ** mu3 * (CND(d3) - CND(d4));
                
          Sum2 += (U ** n / L ** n) ** (mu1 - 2) * (L / S) ** mu2 * (CND(d1 - v * Math.sqrt(T)) - CND(d2 - v * Math.sqrt(T))) - 
                (L ** (n + 1) / (U ** n * S)) ** (mu3 - 2) * (CND(d3 - v * Math.sqrt(T)) - CND(d4 - v * Math.sqrt(T)));
        }
      }
      
      // Calculer OutValue selon le type d'option
      let OutValue = 0;
      if (TypeFlag === "co" || TypeFlag === "ci") {
        OutValue = S * Math.exp((b - r) * T) * Sum1 - X * Math.exp(-r * T) * Sum2;
      } else if (TypeFlag === "po" || TypeFlag === "pi") {
        OutValue = X * Math.exp(-r * T) * Sum2 - S * Math.exp((b - r) * T) * Sum1;
      }
      
      // Fonction pour calculer le prix Black-Scholes standard (identique au Strategy Builder)
      const GBlackScholes = (type: string, S: number, X: number, T: number, r: number, b: number, v: number) => {
        const d1 = (Math.log(S / X) + (b + v ** 2 / 2) * T) / (v * Math.sqrt(T));
        const d2 = d1 - v * Math.sqrt(T);
        
        if (type === "c") {
          return S * Math.exp((b - r) * T) * CND(d1) - X * Math.exp(-r * T) * CND(d2);
        } else { // type === "p"
          return X * Math.exp(-r * T) * CND(-d2) - S * Math.exp((b - r) * T) * CND(-d1);
        }
      };
      
      // Calculer le prix final selon le TypeFlag (appliquer la relation de parité pour les knockin)
      let optionPrice = 0;
      if (TypeFlag === "co") {
        optionPrice = OutValue;
      } else if (TypeFlag === "po") {
        optionPrice = OutValue;
      } else if (TypeFlag === "ci") {
        // Pour les options knockin, utiliser la relation: knockin + knockout = vanille
        optionPrice = GBlackScholes("c", S, X, T, r, b, v) - OutValue;
      } else if (TypeFlag === "pi") {
        // Pour les options knockin, utiliser la relation: knockin + knockout = vanille
        optionPrice = GBlackScholes("p", S, X, T, r, b, v) - OutValue;
      }
      
      console.log(`[PRICING] Double barrier ${optionType}: TypeFlag=${TypeFlag}, OutValue=${OutValue}, Final Price=${optionPrice}`);
      
      // S'assurer que le prix de l'option n'est jamais négatif
      return Math.max(0, optionPrice);
    }
    
    // Si nous arrivons ici, c'est que le type d'option n'est pas supporté
    return 0;
  }

  // Main pricing function that handles all option types
  static calculateOptionPrice(
    type: string,
    S: number,
    K: number,
    r_d: number,
    r_f: number,
    t: number,
    sigma: number,
    barrier?: number,
    secondBarrier?: number,
    rebate?: number,
    numSimulations: number = 1000
  ): number {
    // Barrier options - use closed-form when possible
    if (type.includes('knockout') || type.includes('knockin')) {
      if (!barrier) return 0;
      
      // Use closed-form for both single and double barrier options
        const closedFormPrice = this.calculateBarrierOptionClosedForm(
          type, S, K, r_d, t, sigma, barrier, secondBarrier, r_f
        );
        if (closedFormPrice > 0) {
          return closedFormPrice;
      }
      
      // Fallback to Monte Carlo if closed-form fails
      return this.calculateBarrierOptionPrice(
        type, S, K, r_d, t, sigma, barrier, secondBarrier, numSimulations
      );
    }
    
    // Digital options
    if (type.includes('one-touch') || type.includes('no-touch') || 
        type.includes('double-touch') || type.includes('double-no-touch') ||
        type.includes('range-binary') || type.includes('outside-binary')) {
      return this.calculateDigitalOptionPrice(
        type, S, K, r_d, t, sigma, barrier, secondBarrier, numSimulations, rebate || 1
      );
    }
    
    // Standard vanilla options - use Garman-Kohlhagen for FX
    if (type === 'call' || type === 'put') {
      return this.calculateGarmanKohlhagenPrice(type, S, K, r_d, r_f, t, sigma);
    }
    
    // Forward contracts
    if (type === 'forward') {
      return this.calculateFXForwardPrice(S, r_d, r_f, t) - K;
    }
    
    return 0;
  }
} 