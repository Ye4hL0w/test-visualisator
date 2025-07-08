# DomainCalculator - Calculateur de Domaines Visuels

## Objectif

Automatise le calcul des domaines pour l'encoding visuel en gérant trois cas :

1. **Pas de domaine** → `getVal(data[field])` (ordre alphanumerique)
2. **Domaine erroné** → `fixDomain(domain)` 
3. **Domaine incomplet** → `completeDomain(domain, data[field])` (préserve l'ordre utilisateur)

## API principale

### `getDomain(data, field, userDomain, scaleType)`
Méthode centrale qui gère automatiquement les 3 cas.

**Paramètres :**
- `data` : Données du graphe (nœuds ou liens)
- `field` : Nom du champ à analyser
- `userDomain` : Domaine utilisateur (optionnel)
- `scaleType` : Type d'échelle ('ordinal', 'linear', 'sqrt', 'log')

### Méthodes utilitaires

- `getVal(data, field)` : Extrait valeurs uniques d'un champ
- `fixDomain(invalidDomain, extractedValues, scaleType)` : Corrige domaine invalide
- `completeDomain(incompleteDomain, extractedValues, scaleType)` : Complète domaine partiel
- `analyzeFieldType(data, field)` : Analyse le type de champ et suggère l'échelle
- `generateNumericDomain(data, field, steps)` : Génère domaine numérique équidistant

## Intégration avec vis-graph

- **Auto-initialisation** : Instancié automatiquement dans le constructeur
- **createD3Scale()** : Utilise automatiquement le calculateur pour les domaines
- **getEncoding()** : Retourne l'encoding avec domaines calculés en temps réel
- **Cache** : Vidé automatiquement lors des changements de données

## Exemples

```javascript
const data = [
  { type: 'uri', connections: 5 },
  { type: 'literal', connections: 2 }
];

// Cas 1: Pas de domaine → génération auto
calculator.getDomain(data, 'type');
// → ['literal', 'uri']

// Cas 2: Domaine erroné → correction
calculator.getDomain(data, 'type', ['inexistant']);
// → ['literal', 'uri']

// Cas 3: Domaine incomplet → complétion
calculator.getDomain(data, 'type', ['uri']);
// → ['uri', 'literal']
```

### Avec vis-graph

```javascript
// L'encoding est automatiquement complété
const encoding = { nodes: { color: { field: 'type', scale: { domain: ['uri'] } } } };
visGraphElement.setEncoding(encoding);

// getEncoding() retourne le domaine complet
visGraphElement.getEncoding().nodes.color.scale.domain;
// → ['uri', 'literal']
```

## Avantages

- 🚀 **Automatisation** : Plus besoin de connaître les valeurs à l'avance
- 🧠 **Intelligence** : Détection automatique du type de données et tri adaptatif
- 💾 **Performance** : Cache intelligent et traitement optimisé
- 🔧 **Flexibilité** : Support de tous les types d'échelles D3
- 🛡️ **Robustesse** : Gestion d'erreurs et validation rigoureuse

## Cas d'usage

1. **Exploration de données** : Domaines générés automatiquement
2. **Dashboards dynamiques** : Adaptation aux données changeantes
3. **Configuration partielle** : Complétion intelligente des domaines utilisateur
4. **Migration de données** : Adaptation automatique aux nouveaux formats

## Performance

- **Complexité** : O(n log n) pour le tri, O(n) pour l'extraction
- **Cache** : Réduction significative des recalculs
- **Compatibilité** : JavaScript ES6+, D3.js récent 