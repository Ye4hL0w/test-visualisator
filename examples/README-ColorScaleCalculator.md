# 🎨 Guide de Tests ColorScaleCalculator

## Vue d'ensemble

Le nouveau `ColorScaleCalculator` parse automatiquement les schémas D3 sans rien avoir en dur. Il supporte :

- **Ordinal** : `d3.scaleOrdinal()` + `d3.schemeBlues[8]`
- **Quantitative** : `d3.scaleSequential()` + `d3.interpolateBlue()`

## 🆕 Nouvelles Fonctionnalités

### Support des Indices
- **`"Blues[5]"`** → Accède directement à `d3.schemeBlues[5]`
- **`"Reds[7]"`** → Accède directement à `d3.schemeReds[7]`

### Parsing Case-Insensitive
- **`"blues"`**, **`"BLUES"`**, **`"Blues"`** → Tous reconnus
- **`"category10"`**, **`"CATEGORY10"`** → Tous reconnus

### Utilitaires de Couleurs
- `componentToHex()`, `rgbToHex()`, `hexToRgb()`
- `getAllIndexes()` pour trouver toutes les occurrences

## 🚀 Tests Rapides

### Dans la console du navigateur

```javascript
// 1. Charger la page web-components.html 
// 2. Ouvrir la console développeur
// 3. Tester :

// Test ordinal avec Set1
const result1 = window.calculator.createColorScale({
  domain: ["protein", "gene", "pathway"],
  range: "Set1",  // Sera converti en d3.schemeSet1
  dataKeys: ["protein", "gene", "pathway"],
  scaleType: "ordinal",
  label: "Test-Set1"
});

// Test quantitative avec Viridis
const result2 = window.calculator.createColorScale({
  domain: [0, 100],
  range: "Viridis",  // Sera converti en d3.interpolateViridis
  dataKeys: [0, 25, 50, 75, 100],
  scaleType: "quantitative", 
  label: "Test-Viridis"
});

console.log("Ordinal colors:", result1.range);
console.log("Quantitative colors:", result2.range);

// Test avec index spécifique
const result3 = window.calculator.createColorScale({
  domain: ["A", "B", "C", "D", "E"],
  range: "Blues[5]",  // Accès direct à d3.schemeBlues[5]
  dataKeys: ["A", "B", "C", "D", "E"],
  scaleType: "ordinal",
  label: "Test-Blues-Index"
});

// Test case-insensitive
const result4 = window.calculator.createColorScale({
  domain: ["x", "y", "z"],
  range: "blues",  // Minuscules acceptées
  dataKeys: ["x", "y", "z"],
  scaleType: "ordinal",
  label: "Test-Case-Insensitive"
});

console.log("Blues[5] colors:", result3.range);
console.log("Case-insensitive colors:", result4.range);
```

## 📋 Configurations de Test Disponibles

### Tests Ordinal

| Test | Schéma | Description |
|------|--------|-------------|
| `test1_Blues_ordinal` | Blues | Convertit vers `d3.schemeBlues` |
| `test2_Set1_ordinal` | Set1 | Schéma qualitatif classique |
| `test3_Category10_ordinal` | Category10 | Palette D3 standard |
| `test4_Tableau10_ordinal` | Tableau10 | Palette Tableau |
| `test5_sans_domain` | Set2 | Test sans domain (auto-calcul) |
| `test6_Spectral_ordinal` | Spectral | Schéma divergent en ordinal |

### Tests Quantitative

| Test | Schéma | Description |
|------|--------|-------------|
| `test1_Blues_quantitative` | Blues | Convertit vers `d3.interpolateBlues` |
| `test2_Viridis_quantitative` | Viridis | Palette perceptuelle |
| `test3_Reds_quantitative` | Reds | Schéma séquentiel rouge |
| `test4_RdYlBu_quantitative` | RdYlBu | Schéma divergent |
| `test5_Plasma_quantitative` | Plasma | Palette plasma |
| `test6_sans_domain_quantitative` | Turbo | Test sans domain |

## 🔧 Utilisation dans vis-graph

### Configuration Ordinal

```json
{
  "nodes": {
    "color": {
      "field": "type",
      "scale": {
        "type": "ordinal",
        "domain": ["uri", "literal", "blank"],
        "range": "Set1"
      }
    }
  }
}
```

### Configuration Quantitative

```json
{
  "nodes": {
    "color": {
      "field": "score", 
      "scale": {
        "type": "quantitative",
        "domain": [0, 100],
        "range": "Viridis"
      }
    }
  }
}
```

### Configuration Mixte

```json
{
  "nodes": {
    "color": {
      "field": "category",
      "scale": {
        "type": "ordinal",
        "domain": ["A", "B", "C"],
        "range": "Category10"
      }
    }
  },
  "links": {
    "color": {
      "field": "weight",
      "scale": {
        "type": "quantitative",
        "domain": [0, 1],
        "range": "Blues"
      }
    }
  }
}
```

### Configuration avec Index Spécifique

```json
{
  "nodes": {
    "color": {
      "field": "intensity",
      "scale": {
        "type": "ordinal",
        "domain": ["low", "medium", "high", "very_high", "extreme"],
        "range": "Reds[5]"
      }
    }
  }
}
```

### Configuration Case-Insensitive

```json
{
  "nodes": {
    "color": {
      "field": "type",
      "scale": {
        "type": "ordinal",
        "domain": ["protein", "gene"],
        "range": "blues"
      }
    }
  }
}
```

## 🎯 Schémas Supportés

### Schémas Ordinal (d3.scheme*)
- **Qualitatifs** : Set1, Set2, Set3, Category10, Tableau10, Pastel1, etc.
- **Séquentiels** : Blues, Reds, Greens, Oranges, etc.
- **Divergents** : Spectral, RdYlBu, RdBu, etc.

### Interpolateurs Quantitative (d3.interpolate*)
- **Séquentiels** : Blues, Reds, Greens, Viridis, Plasma, etc.
- **Divergents** : Spectral, RdYlBu, RdBu, etc.
- **Perceptuels** : Viridis, Plasma, Inferno, Magma, Cividis

## 🧪 Cas Limites Testés

1. **Schéma inexistant** → Fallback vers `d3.interpolateTurbo`
2. **Domain vide** → Calcul automatique depuis `dataKeys`
3. **Range array** → Pas de parsing, utilisation directe
4. **Domain > Range** → Répétition des couleurs
5. **Valeurs dupliquées** → Warnings mais fonctionne

## 📁 Fichiers de Test

- `color-scale-test-configs.json` - Configurations prédéfinies
- `color-scale-interactive-test.html` - Interface de test interactive  
- `test-color-scale-examples.js` - Scripts d'exemple pour console
- `README-ColorScaleCalculator.md` - Ce guide

## 💡 Conseils d'Utilisation

1. **Ordinal** : Utilisez `Set1`, `Category10` pour des catégories distinctes
2. **Quantitative** : Utilisez `Viridis`, `Blues` pour des valeurs continues
3. **Divergent** : Utilisez `RdYlBu`, `Spectral` pour des corrélations (-1 à 1)
4. **Fallback** : Le système utilise `d3.interpolateTurbo` si le schéma n'existe pas

## 🐛 Debug

```javascript
// Vérifier qu'un schéma existe
const parsed = window.calculator.parseD3ColorScheme("Blues");
console.log(parsed); // {type: "scheme", value: function, raw: "Blues"} ou null

// Test avec index spécifique
const parsedWithIndex = window.calculator.parseD3ColorScheme("Blues[5]");
console.log(parsedWithIndex); // {type: "scheme", value: array, raw: "Blues"}

// Test case-insensitive
const parsedLower = window.calculator.parseD3ColorScheme("blues");
console.log(parsedLower); // Doit fonctionner même en minuscules

// Test des utilitaires de couleur
const rgbColor = window.calculator.hexToRgb("#ff5733");
console.log(rgbColor); // "rgb(255, 87, 51)"

const hexColor = window.calculator.rgbToHex(255, 87, 51);
console.log(hexColor); // "#ff5733"

// Test complet avec logs
const result = window.calculator.createColorScale({
  domain: ["A", "B"], 
  range: "SchemaInexistant",
  dataKeys: ["A", "B"],
  scaleType: "ordinal",
  label: "Debug-Test"
});
// Regarder la console pour les warnings

// Test avec tous les nouveaux tests
window.testColorScale.runAllTests(); // Lance tous les tests
``` 