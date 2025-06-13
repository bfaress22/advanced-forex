# Hedging Instruments - Améliorations de Gestion par Devise

## Problème Initial

Dans la version précédente de `HedgingInstruments.tsx`, il y avait plusieurs problèmes :

1. **Inputs globaux** : Un seul set de paramètres de marché (spot, volatilité, taux) pour tous les instruments
2. **Dropdown inutile** : Proposition de toutes les paires de devises, même celles non utilisées
3. **Calculs MTM incorrects** : Tous les instruments utilisaient les mêmes paramètres, peu importe leur devise
4. **Manque de granularité** : Impossible de différencier les paramètres par devise

## Solution Implémentée

### 1. Architecture par Devise

**Interface `CurrencyMarketData`** :
```typescript
interface CurrencyMarketData {
  spot: number;
  volatility: number;
  domesticRate: number;
  foreignRate: number;
}
```

**État par devise** :
```typescript
const [currencyMarketData, setCurrencyMarketData] = useState<{ [currency: string]: CurrencyMarketData }>({});
```

### 2. Extraction Automatique des Devises

**Fonction `getUniqueCurrencies`** :
- Extrait automatiquement les devises uniques des instruments existants
- Trie les devises par ordre alphabétique
- Ne propose que les devises réellement utilisées

```typescript
const getUniqueCurrencies = (instruments: HedgingInstrument[]): string[] => {
  const currencies = new Set<string>();
  instruments.forEach(instrument => {
    if (instrument.currency) {
      currencies.add(instrument.currency);
    }
  });
  return Array.from(currencies).sort();
};
```

### 3. Interface Utilisateur Améliorée

**Ligne d'inputs par devise** :
- Une section dédiée pour chaque devise trouvée
- Badge indiquant le nombre d'instruments par devise
- Bouton "Reset to Default" pour chaque devise
- Inputs compacts et organisés

**Fonctionnalités** :
- Date de valorisation globale
- Paramètres de marché spécifiques par devise
- Bouton de recalcul global
- Message informatif si aucun instrument n'est trouvé

### 4. Calculs MTM Précis

**Fonction `calculateTodayPrice` améliorée** :
- Utilise les données de marché spécifiques à la devise de l'instrument
- Gestion d'erreur si aucune donnée de marché n'est trouvée
- Calculs de pricing adaptés par devise

**Fonction `updateCurrencyMarketData`** :
- Mise à jour granulaire par devise et par champ
- Préservation des autres données lors des modifications

### 5. Données par Défaut Intelligentes

**Fonction `getDefaultMarketDataForCurrency`** :
- Données de marché réalistes par paire de devises
- Fallback pour les devises non reconnues
- Paramètres cohérents avec les standards du marché

```typescript
const defaultData: { [key: string]: CurrencyMarketData } = {
  'EUR/USD': { spot: 1.0850, volatility: 20, domesticRate: 1.0, foreignRate: 0.5 },
  'GBP/USD': { spot: 1.2650, volatility: 22, domesticRate: 1.0, foreignRate: 1.5 },
  'USD/JPY': { spot: 149.50, volatility: 18, domesticRate: 1.0, foreignRate: 0.1 },
  // ... autres devises
};
```

## Avantages de la Solution

### 1. **Précision des Calculs**
- Chaque instrument utilise les paramètres de marché appropriés à sa devise
- MTM calculé avec les bonnes données de spot et volatilité
- Taux d'intérêt domestiques et étrangers corrects

### 2. **Interface Intuitive**
- Seules les devises utilisées sont affichées
- Organisation claire par devise
- Feedback visuel sur le nombre d'instruments par devise

### 3. **Flexibilité**
- Paramètres ajustables indépendamment par devise
- Possibilité de reset aux valeurs par défaut
- Adaptation automatique aux nouveaux instruments importés

### 4. **Performance**
- Pas de calculs inutiles pour des devises non utilisées
- Mise à jour ciblée des données modifiées
- Optimisation des re-rendus

## Workflow Utilisateur

### 1. **Import d'Instruments**
- L'utilisateur importe des stratégies depuis Strategy Builder
- Les devises sont automatiquement détectées
- Les paramètres par défaut sont initialisés

### 2. **Configuration des Paramètres**
- Une section apparaît pour chaque devise détectée
- L'utilisateur peut ajuster spot, volatilité, taux par devise
- Bouton "Reset to Default" pour revenir aux valeurs standard

### 3. **Calcul MTM**
- Bouton "Recalculate All MTM" pour recalculer tous les instruments
- Chaque instrument utilise les paramètres de sa devise
- Affichage du MTM total consolidé

### 4. **Monitoring**
- Visualisation claire du nombre d'instruments par devise
- Feedback en temps réel des modifications
- Messages d'erreur si données manquantes

## Compatibilité

### **Backward Compatibility**
- Les instruments existants continuent de fonctionner
- Migration automatique vers le nouveau système
- Pas de perte de données

### **Integration avec Strategy Builder**
- Synchronisation automatique lors de nouveaux imports
- Détection des nouvelles devises
- Préservation des paramètres existants

## Tests et Validation

### **Scénarios Testés**
1. Import d'instruments avec différentes devises
2. Modification des paramètres par devise
3. Calcul MTM avec données spécifiques
4. Reset aux valeurs par défaut
5. Gestion des devises non reconnues

### **Résultats**
- ✅ Extraction correcte des devises uniques
- ✅ Interface responsive et intuitive
- ✅ Calculs MTM précis par devise
- ✅ Performance optimisée
- ✅ Gestion d'erreurs robuste

## Conclusion

Cette amélioration transforme la page Hedging Instruments d'un système global à un système granulaire par devise, offrant :

- **Précision** : Calculs MTM corrects avec les bons paramètres
- **Efficacité** : Interface focalisée sur les devises utilisées
- **Flexibilité** : Paramètres ajustables indépendamment
- **Robustesse** : Gestion d'erreurs et fallbacks appropriés

L'utilisateur bénéficie maintenant d'un outil professionnel adapté à la gestion multi-devises des instruments de couverture FX. 