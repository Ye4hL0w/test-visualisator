# @jmoncada/vis-graph

Un composant web pour visualiser des graphes de connaissances SPARQL avec D3.js.

![npm version](https://img.shields.io/npm/v/@jmoncada/vis-graph)
![license](https://img.shields.io/npm/l/@jmoncada/vis-graph)

## ✨ Fonctionnalités

- 🔄 **Chargement automatique** depuis des endpoints SPARQL
- 🌐 **Gestion CORS/Proxy** automatique 
- 🎨 **Visualisation interactive** avec D3.js
- 📊 **Détails enrichis** pour chaque nœud
- 🔍 **Transformation intelligente** des données SPARQL

## 🚀 Installation

```bash
npm install @jmoncada/vis-graph
```

## 📖 Utilisation rapide

### 1. Importation

**Option A: Module ES (recommandé avec un bundler)**

```javascript
import '@jmoncada/vis-graph'; // Importe et enregistre le Web Component <vis-graph>

// Ou si vous avez besoin d'accéder à la classe directement (moins courant pour juste l'utiliser)
// import { VisGraph } from '@jmoncada/vis-graph'; 
```

**Option B: UMD (pour une utilisation directe dans le navigateur via `<script>`)**

Incluez le script dans votre HTML.

```html
<script src="https://unpkg.com/@jmoncada/vis-graph@latest/dist/vis-graph.umd.js"></script>
```

### 2. Utilisation en HTML

```html
<vis-graph id="monGraphe" width="800" height="600"></vis-graph>

<script>
  const graphe = document.getElementById('monGraphe');

  // Exemple simple avec Wikidata
  graphe.loadFromSparqlEndpoint(
    'https://query.wikidata.org/sparql',
    `SELECT ?item ?itemLabel WHERE {
      ?item wdt:P31 wd:Q5 .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "fr" }
    } LIMIT 10`
  ).then(result => {
    if (result.status === 'success') {
      console.log('Graphe chargé avec', result.data.nodes.length, 'nœuds');
    }
  });
</script>
```

## Documentation

📚 **Guides détaillés disponibles :**

- **[Guide du Composant vis-graph](https://github.com/Ye4hL0w/test-visualisator/blob/main/docs/VisGraph.md)** - Fonctionnement interne et architecture du composant
- **[Guide SparqlDataFetcher](https://github.com/Ye4hL0w/test-visualisator/blob/main/docs/dataFetcher-setup.md)** - Utilisation simple du module de récupération de données
- **[Configuration du Proxy SPARQL](https://github.com/Ye4hL0w/test-visualisator/blob/main/docs/proxy-setup.md)** - Résolution des problèmes CORS

## Licence

Ce projet est sous licence [MIT](./LICENSE). 