# FX Risk Manager - Currency Hedging Platform

## Vue d'ensemble

**FX Risk Manager** est une plateforme moderne et intuitive dédiée à la gestion des risques de change, spécialement conçue pour les besoins des trésoriers d'entreprise, exportateurs internationaux, et gestionnaires de portefeuilles multi-devises.

## 🎯 Fonctionnalités principales

### 1. Tableau de bord global (Dashboard)
- **Vue synthétique** des expositions par devise
- **Indicateurs clés** de performance (KPIs)
- **Alertes** en temps réel sur les risques de change
- **Suivi** de la couverture globale
- **Métriques** : VaR, ratio de couverture, exposition résiduelle

### 2. Gestion des expositions (FX Exposures)
- **Enregistrement** des flux prévisionnels par devise et échéance
- **Analyse** des positions nettes (par devise et globalement)
- **Catégorisation** : créances, dettes, flux futurs
- **Suivi** des échéances et alertes de maturité
- **Import/Export** de données via CSV/Excel

### 3. Instruments de couverture (Hedging Instruments)
- **Gestion** des forwards, options, swaps, collars
- **Suivi** des contreparties bancaires
- **Calculs** de Mark-to-Market (MTM) en temps réel
- **Efficacité** de couverture et hedge accounting
- **Documentation** de conformité réglementaire

### 4. Constructeur de stratégies (Strategy Builder)
- **Simulation** d'instruments complexes
- **Optimisation** automatique des stratégies
- **Analyse** coût/bénéfice
- **Tests** de performance historique
- **Stratégies** zéro-coût et exotiques

### 5. Analyse des risques (Risk Analysis)
- **Scénarios** de stress testing
- **Simulations** Monte Carlo
- **Value at Risk (VaR)** à différents niveaux de confiance
- **Expected Shortfall** et mesures de risque avancées
- **Tests** de sensibilité aux paramètres de marché

### 6. Monitoring temps réel (Position Monitor)
- **Surveillance** continue des positions FX
- **Alertes** automatiques sur les seuils
- **P&L** en temps réel
- **Données** de marché live
- **Interface** Bloomberg-style

## 🏗️ Architecture technique

### Frontend
- **React 18** avec TypeScript
- **Tailwind CSS** pour le styling
- **Shadcn/ui** pour les composants
- **Recharts** pour les graphiques
- **React Router** pour la navigation

### Fonctionnalités avancées
- **Thèmes** : Light, Dark, Bloomberg
- **Responsive** design pour mobile/desktop
- **Export PDF** des rapports
- **Notifications** temps réel
- **Multi-langues** (EN/FR)

## 📊 Captures d'écran

### Dashboard principal
- Vue d'ensemble des expositions
- Métriques de risque en temps réel
- Alertes et notifications
- Raccourcis vers les fonctions principales

### Gestion des exposures
- Table interactive des positions
- Filtrage par devise, type, échéance
- Ajout/modification des expositions
- Suivi des ratios de couverture

### Instruments de couverture
- Portefeuille d'instruments
- Calculs MTM automatiques
- Analyse d'efficacité
- Gestion des contreparties

## 🚀 Installation et utilisation

### Prérequis
```bash
Node.js >= 18
npm ou bun
```

### Installation
```bash
# Cloner le repository
git clone [repository-url]

# Installer les dépendances
cd "New Forex Simulator"
npm install
# ou
bun install
```

### Démarrage
```bash
# Mode développement
npm run dev
# ou
bun dev

# Build production
npm run build
# ou
bun run build
```

### Configuration
- **Variables d'environnement** : `.env`
- **Thème par défaut** : Configurable dans `/src/hooks/ThemeProvider.tsx`
- **Données de marché** : APIs configurables

## 🎨 Guide d'utilisation

### Navigation
Le menu principal offre un accès direct à toutes les fonctionnalités :

1. **Dashboard** - Vue d'ensemble
2. **FX Exposures** - Gestion des expositions
3. **Hedging Instruments** - Instruments de couverture
4. **Strategy Builder** - Construction de stratégies
5. **Risk Analysis** - Analyse des risques
6. **Position Monitor** - Surveillance temps réel
7. **Reports** - Rapports et analytics
8. **Settings** - Configuration

### Workflow recommandé

1. **Configuration initiale**
   - Paramétrer les devises suivies
   - Configurer les seuils d'alerte
   - Définir les contreparties

2. **Saisie des expositions**
   - Enregistrer les flux prévisionnels
   - Catégoriser par type et échéance
   - Valider les montants et devises

3. **Mise en place des couvertures**
   - Analyser les besoins de couverture
   - Sélectionner les instruments appropriés
   - Négocier avec les contreparties

4. **Monitoring continu**
   - Surveiller les positions en temps réel
   - Analyser l'efficacité des couvertures
   - Ajuster selon l'évolution du marché

## 📈 Indicateurs clés

### Métriques de risque
- **VaR (Value at Risk)** : Perte potentielle maximum
- **Expected Shortfall** : Perte moyenne au-delà du VaR
- **Ratio de couverture** : % d'exposition couverte
- **Exposition nette** : Risque résiduel par devise

### Performance
- **P&L réalisé/non réalisé** : Performance des positions
- **Efficacité de couverture** : Ratio hedge accounting
- **Coût de couverture** : Primes et coûts de financement
- **Hit ratio** : % de prévisions exactes

## 🔧 Personnalisation

### Thèmes
- **Light** : Thème clair standard
- **Dark** : Thème sombre
- **Bloomberg** : Style terminal financier

### Devises supportées
- **Majeures** : EUR, USD, GBP, JPY, CHF, CAD, AUD
- **Mineures** : Plus de 150 paires disponibles
- **Exotiques** : Devises émergentes

### Instruments disponibles
- **Forwards** : Contrats à terme
- **Vanilla Options** : Calls et Puts
- **Barriers** : Knock-in/out, Touch/No-touch
- **Digitals** : Options binaires
- **Structures** : Collars, Seagulls, Risk Reversals

## 📋 Conformité et sécurité

### Réglementations
- **IFRS 9** : Hedge accounting
- **MiFID II** : Reporting des transactions
- **EMIR** : Déclaration des dérivés
- **Basel III** : Calculs de capital réglementaire

### Sécurité
- **Authentification** multi-facteurs
- **Chiffrement** des données sensibles
- **Audit trail** complet
- **Sauvegarde** automatique

## 🤝 Support et contribution

### Documentation
- **Guide utilisateur** complet
- **API Reference** pour intégrations
- **Tutoriels** vidéo
- **FAQ** détaillée

### Support technique
- **Email** : support@fxriskmanager.com
- **Chat** en ligne 24/7
- **Formation** sur site disponible
- **Consulting** personnalisé

## 📄 Licence

Ce projet est sous licence MIT. Voir `LICENSE` pour plus de détails.

## 🔄 Versions et roadmap

### Version actuelle : 2.0.0
- Interface de gestion des risques complète
- Monitoring temps réel
- Analytics avancées
- Export PDF

### Prochaines versions
- **2.1.0** : Intégration APIs externes (Bloomberg, Reuters)
- **2.2.0** : Machine Learning pour prédictions
- **2.3.0** : Mobile app native
- **3.0.0** : Multi-entités et consolidation

---

*FX Risk Manager - La solution complète pour la gestion des risques de change* 