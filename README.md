# @jmoncada/vis-graph

Un composant web pour visualiser des graphes de connaissances SPARQL avec D3.js.

Ce composant permet de charger et d'afficher des données RDF/SPARQL sous forme de graphe interactif, en utilisant D3.js pour le rendu et la simulation de forces.

## Fonctionnalités

*   Chargement de données depuis un endpoint SPARQL.
*   Gestion automatique du fallback vers un proxy local en cas de problèmes CORS.
*   Affichage interactif du graphe avec D3.js.
*   Panneau de détails pour les nœuds, affichant des informations descriptives, techniques et relationnelles.
*   Transformation configurable des résultats SPARQL en structure de graphe (nœuds/liens).

## Installation

```bash
npm install @jmoncada/vis-graph
# ou
yarn add @jmoncada/vis-graph
```

## Utilisation

### 1. Importation

**Option A: Module ES (recommandé avec un bundler)**

```javascript
import '@jmoncada/vis-graph'; // Importe et enregistre le Web Component <vis-graph>

// Ou si vous avez besoin d'accéder à la classe directement (moins courant pour juste l'utiliser)
// import { VisGraph } from '@jmoncada/vis-graph'; 
```

**Option B: UMD (pour une utilisation directe dans le navigateur via `<script>`)**

Incluez le script dans votre HTML. Vous pouvez l'obtenir depuis un CDN comme unpkg (une fois publié) ou depuis votre dossier `node_modules`.

```html
<script src="https://unpkg.com/@jmoncada/vis-graph@latest/dist/vis-graph.umd.js"></script>
```

### 2. Utilisation en HTML

```html
<vis-graph id="monGraphe" width="1000" height="700"></vis-graph>

<script>
  const graphElement = document.getElementById('monGraphe');

  // Exemple de chargement de données
  async function chargerGraphe() {
    const endpoint = 'https://dbpedia.org/sparql'; // Remplacez par votre endpoint
    const query = `
      CONSTRUCT { 
        ?molecule ?relation ?target .
        ?molecule rdfs:label ?moleculeLabel .
        ?target rdfs:label ?targetLabel .
      }
      WHERE {
        SERVICE <https://bio2rdf.org/sparql> { 
          SELECT ?molecule ?relation ?target ?moleculeLabel ?targetLabel
          WHERE {
            ?molecule bioc:interacts_with ?target .
            ?molecule bioc:has_pref_label ?moleculeLabel .
            ?target bioc:has_pref_label ?targetLabel .
          } LIMIT 15
        }
      }
    `;

    try {
      const result = await graphElement.loadFromSparqlEndpoint(endpoint, query);
      if (result.status === 'success') {
        console.log('Graphe chargé!', result.data.nodes.length, 'nœuds');
      } else {
        console.error('Erreur de chargement:', result.message);
      }
    } catch (error) {
      console.error('Erreur critique lors du chargement:', error);
    }
  }

  // Appeler la fonction pour charger les données
  // Vous pouvez le faire au chargement de la page ou sur un événement utilisateur
  // chargerGraphe(); 

  // Exemple avec des données JSON directes
  /*
  graphElement.setJsonData({
    head: { vars: ["s", "sLabel", "p", "o", "oLabel"] },
    results: {
      bindings: [
        {
          s: { type: "uri", value: "http://example.org/sujet1" },
          sLabel: { type: "literal", value: "Sujet 1" },
          p: { type: "uri", value: "http://example.org/predicat" },
          o: { type: "uri", value: "http://example.org/objet1" },
          oLabel: { type: "literal", value: "Objet 1" },
        }
      ]
    }
  });
  */
</script>
```

## API du Composant `<vis-graph>`

### Attributs HTML

*   `width` (Number, optionnel, défaut: `800`): Largeur du conteneur du graphe en pixels.
*   `height` (Number, optionnel, défaut: `600`): Hauteur du conteneur du graphe en pixels.

### Propriétés JavaScript

*   `nodes` (Array): Tableau des nœuds du graphe.
*   `links` (Array): Tableau des liens du graphe.

### Méthodes JavaScript

*   **`setData(nodes, links)`**: Définit manuellement les données du graphe.
    *   `nodes` (Array): Tableau d'objets nœuds (ex: `{ id: "node1", label: "Node 1" }`).
    *   `links` (Array): Tableau d'objets liens (ex: `{ source: "node1", target: "node2" }`).
*   **`setJsonData(jsonData)`**: Charge des données à partir d'un objet JSON au format SPARQL standard.
    *   `jsonData` (Object): Objet contenant les résultats SPARQL (format `{ head: { vars: [] }, results: { bindings: [] } }`).
    *   Retourne: `Promise<Object>` avec le statut de l'opération.
*   **`loadFromSparqlEndpoint(endpoint, query, jsonData = null)`**: Charge les données depuis un endpoint SPARQL ou des données JSON directes.
    *   `endpoint` (String | null): L'URL du endpoint SPARQL.
    *   `query` (String | null): La requête SPARQL à exécuter.
    *   `jsonData` (Object | null): Données JSON directes à utiliser (prioritaire sur endpoint/query).
    *   Retourne: `Promise<Object>` avec `{ status: 'success' | 'error', method: string, message: string, data: Object | null, rawData: Object | null }`.
*   **`executeNodeQuery(node)`**: Récupère et affiche des informations détaillées pour un nœud spécifique (généralement appelé en interne sur un clic droit).
    *   `node` (Object): L'objet nœud du graphe.
    *   Retourne: `Promise<Object>` avec le statut et les données récupérées.

## Gestion des Erreurs CORS et Proxy

De nombreux endpoints SPARQL ne sont pas configurés pour autoriser les requêtes Cross-Origin (CORS) depuis un navigateur web. Si vous rencontrez des erreurs CORS, `VisGraph` tentera automatiquement d'utiliser un proxy local s'exécutant sur `http://localhost:3001/sparql-proxy`.

Pour savoir comment mettre en place ce proxy local, veuillez consulter le guide détaillé :

➡️ **[Documentation pour la Configuration du Proxy](./docs/proxy-setup.md)**

(Ce fichier `proxy-setup.md` est inclus dans le paquet NPM et se trouvera dans `node_modules/@jmoncada/vis-graph/docs/proxy-setup.md` après installation.)

## Contribuer

Les contributions sont les bienvenues ! Veuillez ouvrir une issue ou une pull request sur le [dépôt GitHub](https://github.com/Ye4hL0w/test-visualisator).

## Licence

Ce projet est sous licence [MIT](./LICENSE). 