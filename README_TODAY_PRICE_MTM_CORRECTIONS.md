# Corrections Today Price & MTM - Hedging Instruments

## Problème Résolu

**Problème Initial** : Les calculs de "Today Price" et "MTM" dans Hedging Instruments n'utilisaient pas la même logique que Strategy Builder, causant des incohérences dans les valorisations.

## Corrections Implémentées

### 🔧 **1. Refactorisation de `calculateTodayPrice`**

**Avant** :
```typescript
const calculateTodayPrice = (instrument: HedgingInstrument): number => {
  // Logique simplifiée qui ne correspondait pas à Strategy Builder
  const S = marketData.spot;
  const K = instrument.strike || S;
  
  return calculateOptionPrice(optionType, S, K, r_d, timeToMaturity, sigma, ...);
};
```

**Après** :
```typescript
const calculateTodayPrice = (instrument: HedgingInstrument): number => {
  // Utilise exactement la même logique que Strategy Builder
  const forward = S * Math.exp((r_d - r_f) * timeToMaturity);
  
  // Garman-Kohlhagen pour options vanilla
  if (optionType.includes('call')) {
    return PricingService.calculateGarmanKohlhagenPrice(
      'call', S, K, r_d, r_f, timeToMaturity, sigma
    );
  }
  
  // Forwards : valeur actualisée de la différence
  if (optionType === 'forward') {
    return (forward - K) * Math.exp(-r_d * timeToMaturity);
  }
  
  // Barrier options : closed-form pricing
  if (optionType.includes('knockout') || optionType.includes('knockin')) {
    return PricingService.calculateBarrierOptionClosedForm(...);
  }
  
  // Digital options : Monte Carlo pricing
  if (optionType.includes('touch') || optionType.includes('binary')) {
    return PricingService.calculateDigitalOptionPrice(...);
  }
};
```

### 📊 **2. Correction du Calcul MTM**

**Problème** : Le MTM ne prenait pas en compte le sens de la position (long/short).

**Avant** :
```typescript
const mtmValue = todayPrice - unitPrice; // Toujours long
```

**Après** :
```typescript
const isShort = quantity < 0;
let mtmValue;
if (isShort) {
  // Position courte : MTM = Prix Initial - Prix Aujourd'hui
  mtmValue = originalPrice - todayPrice;
} else {
  // Position longue : MTM = Prix Aujourd'hui - Prix Initial  
  mtmValue = todayPrice - originalPrice;
}
```

### 🎯 **3. Synchronisation avec Strategy Builder**

#### **Méthodes de Pricing Utilisées** :
- **Options Vanilla** : `PricingService.calculateGarmanKohlhagenPrice()`
- **Forwards** : Valeur actualisée de `(forward - strike)`
- **Barrier Options** : `PricingService.calculateBarrierOptionClosedForm()`
- **Digital Options** : `PricingService.calculateDigitalOptionPrice()`

#### **Paramètres Identiques** :
- **Time to Maturity** : Calculé avec les mêmes dates de maturité synchronisées
- **Forward Price** : `S * exp((r_d - r_f) * t)`
- **Taux Domestiques/Étrangers** : Utilisés correctement dans Garman-Kohlhagen
- **Volatilité** : Par devise, comme dans Strategy Builder

### 🔄 **4. Logique MTM Cohérente**

#### **Dans le Tableau** :
```typescript
// Calcul MTM individuel par instrument
const isShort = quantityToHedge < 0;
let mtmValue;
if (isShort) {
  mtmValue = unitPrice - todayPrice;
} else {
  mtmValue = todayPrice - unitPrice;
}
```

#### **Dans le Total MTM** :
```typescript
// Calcul MTM total pour tous les instruments
const totalMTM = instruments.reduce((sum, inst) => {
  const originalPrice = inst.realOptionPrice || inst.premium || 0;
  const todayPrice = calculateTodayPrice(inst);
  const quantity = inst.quantity || 1;
  const isShort = quantity < 0;
  
  let mtmValue;
  if (isShort) {
    mtmValue = originalPrice - todayPrice;
  } else {
    mtmValue = todayPrice - originalPrice;
  }
  
  return sum + (mtmValue * Math.abs(inst.notional));
}, 0);
```

### ✅ **5. Résultats Obtenus**

1. **Cohérence Parfaite** : Les prix calculés dans Hedging Instruments correspondent maintenant exactement à ceux de Strategy Builder

2. **MTM Correct** :
   - ✅ Positions longues : MTM positif quand le prix augmente
   - ✅ Positions courtes : MTM positif quand le prix diminue
   - ✅ Calcul par instrument et total cohérents

3. **Pricing Sophistiqué** :
   - ✅ Garman-Kohlhagen pour options FX vanilla
   - ✅ Barrier options avec closed-form solutions
   - ✅ Digital options avec Monte Carlo
   - ✅ Forwards avec actualisation correcte

4. **Synchronisation Temporelle** :
   - ✅ Utilise les mêmes dates de maturité que Strategy Builder
   - ✅ Time to maturity calculé de manière identique
   - ✅ Forward pricing cohérent

### 🎯 **6. Cas d'Usage Validés**

#### **Exemple 1 - Option Call Longue** :
- **Position** : +100% (long)
- **Prix Initial** : 0.0250
- **Prix Aujourd'hui** : 0.0300
- **MTM** : +0.0050 ✅ (gain car prix augmente)

#### **Exemple 2 - Option Put Courte** :
- **Position** : -100% (short)
- **Prix Initial** : 0.0200
- **Prix Aujourd'hui** : 0.0150
- **MTM** : +0.0050 ✅ (gain car prix diminue)

#### **Exemple 3 - Forward** :
- **Strike** : 1.0850
- **Forward Aujourd'hui** : 1.0900
- **Prix Aujourd'hui** : (1.0900 - 1.0850) * exp(-r*t) = 0.0049
- **MTM** : Cohérent avec Strategy Builder ✅

### 📝 **7. Notes Techniques**

1. **PricingService** : Utilise les mêmes méthodes que Strategy Builder
2. **Currency-Specific Data** : Chaque devise a ses propres paramètres de marché
3. **Error Handling** : Gestion des cas où les données de marché sont manquantes
4. **Performance** : Calculs optimisés avec mise en cache des forward prices

### 🔮 **8. Améliorations Futures Possibles**

1. **Volatilité Implicite** : Support des IV spécifiques par instrument
2. **Greeks** : Calcul des sensibilités (Delta, Gamma, Vega, Theta)
3. **Stress Testing** : Scénarios de stress sur les MTM
4. **Real-time Updates** : Mise à jour automatique des prix de marché

---

**Résultat Final** : Les calculs de Today Price et MTM dans Hedging Instruments sont maintenant parfaitement synchronisés avec Strategy Builder, garantissant une cohérence totale dans l'évaluation des instruments de couverture FX. 