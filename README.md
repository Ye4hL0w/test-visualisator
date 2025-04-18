# Visualisateur de Données Métabolomiques avec SPARQL et Vega-Lite

Ce projet est un visualisateur de données métabolomiques qui permet d'explorer et d'analyser des résultats de requêtes SPARQL via des représentations graphiques interactives. Il intègre:

- Un visualisateur D3.js pour les données métabolomiques classiques
- Un nouveau module utilisant Vega-Lite pour les visualisations de données SPARQL
- Des Web Components pour faciliter l'intégration et la réutilisation

## Fonctionnalités

- Visualisation des données métabolomiques avec D3.js (graphiques à dispersion, cartes de chaleur, réseaux d'interactions, etc.)
- Transformation des résultats de requêtes SPARQL en visualisations Vega-Lite
- Web Components pour intégration facile des visualisations dans d'autres applications
- Backend Express.js pour exécuter des requêtes SPARQL et transformer les données

## Prérequis

- Node.js >= 14.x
- NPM >= 6.x

## Installation

1. Cloner le dépôt:
   ```bash
   git clone https://github.com/yourusername/metabolomics-visualizer.git
   cd metabolomics-visualizer
   ```

2. Installer les dépendances:
   ```bash
   npm install
   ```

3. Démarrer le serveur:
   ```bash
   npm start
   ```

4. Ouvrir l'application dans un navigateur:
   ```
   http://localhost:3000
   ```

## Utilisation

### Visualisateur D3.js

1. Chargez les données d'exemple en cliquant sur "Charger données d'exemple"
2. Sélectionnez les dimensions à visualiser (axes X, Y et couleur)
3. Choisissez le type de visualisation (graphique à dispersion, carte de chaleur, etc.)

### Visualisateur Vega-Lite SPARQL

1. Cliquez sur l'onglet "Vega-Lite SPARQL"
2. Sélectionnez la source de données (exemple ou endpoint SPARQL)
3. Si vous choisissez un endpoint, entrez l'URL et la requête SPARQL
4. Configurez la visualisation (type, dimensions, agrégation)
5. Cliquez sur "Appliquer la visualisation"

### Utilisation des Web Components

Le projet inclut un Web Component `<bar-chart>` que vous pouvez utiliser de différentes manières:

```html
<!-- Avec un endpoint SPARQL -->
<bar-chart sparql-endpoint="https://example.org/sparql" sparql-query="SELECT * WHERE { ?s ?p ?o } LIMIT 10"></bar-chart>

<!-- Avec des résultats SPARQL prédéfinis -->
<bar-chart sparql-results='{"head":{"vars":["s","p","o"]},"results":{"bindings":[...]}}'></bar-chart>
```

## API Serveur

### Exécuter une requête SPARQL

```
GET /api/sparql?endpoint={endpoint}&query={query}
```

### Transformer des données SPARQL pour Vega-Lite

```
POST /api/transform-sparql
Content-Type: application/json

{
  "head": { "vars": [...] },
  "results": { "bindings": [...] }
}
```

## Structure du projet

- `index.html` - Page HTML principale
- `styles.css` - Styles CSS
- `visualisator.js` - Visualisateur D3.js original
- `sparql-vega.js` - Module de visualisation Vega-Lite avec Web Components
- `sample-data.js` - Gestionnaire de données d'exemple
- `server.js` - Serveur Express.js

## Développement

Pour le développement avec rechargement automatique:

```bash
npm run dev
```

## Intégration avec d'autres projets

Pour intégrer le visualisateur dans d'autres projets, utilisez le Web Component:

1. Incluez les scripts nécessaires:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/vega@5"></script>
   <script src="https://cdn.jsdelivr.net/npm/vega-lite@5"></script>
   <script src="https://cdn.jsdelivr.net/npm/vega-embed@6"></script>
   <script src="path/to/sparql-vega.js"></script>
   ```

2. Utilisez le composant:
   ```html
   <bar-chart sparql-endpoint="https://example.org/sparql" sparql-query="SELECT * WHERE { ?s ?p ?o }"></bar-chart>
   ```

## License

MIT 