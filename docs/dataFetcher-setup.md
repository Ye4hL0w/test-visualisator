# Configuration et Utilisation de SparqlDataFetcher

## 🎯 Qu'est-ce que SparqlDataFetcher ?

`SparqlDataFetcher` est une classe utilitaire JavaScript qui gère la récupération de données SPARQL avec une gestion automatique des problèmes CORS et des serveurs proxy. Elle peut être réutilisée dans plusieurs composants pour standardiser la façon dont votre application charge et traite les données SPARQL.

Le `SparqlDataFetcher` est utilisé par défaut dans le composant `vis-graph` (fichier `vis-graph.js`), mais peut aussi être utilisé de manière autonome dans vos propres projets.

## 🚀 Fonctionnalités Principales

### Hiérarchie de Chargement Intelligente
Le `SparqlDataFetcher` essaie plusieurs méthodes pour récupérer les données, dans cet ordre de priorité :

1. **Données JSON directes** : Si vous fournissez des données JSON pré-formatées
2. **Endpoint SPARQL direct** : Tentative de requête directe vers l'endpoint
3. **Proxy SPARQL** : En cas d'erreur CORS, utilise un proxy configuré

### Gestion Automatique des Erreurs CORS
Lorsqu'une requête directe échoue à cause de CORS, le fetcher :
- Détecte automatiquement l'erreur CORS
- Bascule vers le proxy configuré (si disponible)
- Fournit des messages d'erreur clairs et des suggestions de résolution

---

## 📦 Import et Initialisation

### Import du Module
```javascript
import { SparqlDataFetcher } from './components/SparqlDataFetcher.js';
```

### Initialisation
```javascript
// Créer une instance
const sparqlFetcher = new SparqlDataFetcher();

// Ou l'utiliser directement dans un composant
export class MonComposant extends HTMLElement {
  constructor() {
    super();
    this.sparqlFetcher = new SparqlDataFetcher();
  }
}
```

---

## 🔧 Méthodes Principales

### 1. `loadFromSparqlEndpoint(endpoint, query, jsonData, proxyUrl, onProxyError, onNotification)`

**Description :** Méthode principale pour charger des données avec la hiérarchie complète.

**Paramètres :**
- `endpoint` (string) : URL de l'endpoint SPARQL
- `query` (string) : Requête SPARQL à exécuter
- `jsonData` (object, optionnel) : Données JSON pré-formatées (priorité absolue)
- `proxyUrl` (string, optionnel) : URL du proxy SPARQL
- `onProxyError` (function, optionnel) : Callback appelé en cas d'erreur de proxy
- `onNotification` (function, optionnel) : Callback pour afficher des notifications

**Exemple d'utilisation :**
```javascript
const result = await sparqlFetcher.loadFromSparqlEndpoint(
  'https://dbpedia.org/sparql',
  'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10',
  null, // Pas de données JSON directes
  'http://localhost:3001/sparql-proxy', // URL du proxy
  () => console.log('Erreur proxy détectée'), // Callback d'erreur proxy
  (message, type) => console.log(`${type}: ${message}`) // Callback de notification
);

if (result.status === 'success') {
  console.log('Données chargées:', result.data);
  console.log('Méthode utilisée:', result.method);
} else {
  console.error('Erreur:', result.message);
}
```

### 2. `executeSparqlQueryWithFallback(endpoint, query, proxyUrl, onProxyError, onNotification)`

**Description :** Exécute une requête SPARQL avec fallback automatique vers le proxy.

**Exemple d'utilisation :**
```javascript
try {
  const data = await sparqlFetcher.executeSparqlQueryWithFallback(
    'https://sparql.uniprot.org/sparql',
    'SELECT * WHERE { ?s a ?type } LIMIT 5',
    'http://localhost:3001/sparql-proxy'
  );
  console.log('Résultats SPARQL:', data);
} catch (error) {
  console.error('Erreur lors de l\'exécution:', error.message);
}
```

### 3. `executeSparqlQuery(endpoint, query)`

**Description :** Exécute une requête SPARQL directe sans proxy.

**Exemple d'utilisation :**
```javascript
try {
  const data = await sparqlFetcher.executeSparqlQuery(
    'https://query.wikidata.org/sparql',
    'SELECT ?item ?itemLabel WHERE { ?item wdt:P31 wd:Q5 } LIMIT 10'
  );
  console.log('Données reçues:', data);
} catch (error) {
  console.error('Requête directe échouée:', error.message);
}
```

### 4. `setData(nodes, links)` et `setJsonData(jsonData)`

**Description :** Méthodes pour définir des données manuellement.

**Exemple d'utilisation :**
```javascript
// Définir des données manuellement
const manualResult = sparqlFetcher.setData(
  [{ id: 'node1', label: 'Nœud 1' }],
  [{ source: 'node1', target: 'node2' }]
);

// Ou utiliser des données JSON pré-formatées
const jsonResult = sparqlFetcher.setJsonData({
  head: { vars: ['s', 'p', 'o'] },
  results: {
    bindings: [
      {
        s: { type: 'uri', value: 'http://example.org/subject' },
        p: { type: 'uri', value: 'http://example.org/predicate' },
        o: { type: 'literal', value: 'Objet exemple' }
      }
    ]
  }
});
```

---

## 📊 Format de Données et Réponses

### Format de Réponse Standard
Toutes les méthodes principales retournent un objet avec cette structure :

```javascript
{
  status: 'success' | 'error',
  method: 'manual' | 'direct-json' | 'endpoint-or-proxy',
  message: 'Description du résultat',
  data: { /* Données transformées */ },
  rawData: { /* Données SPARQL brutes */ }
}
```

### Format SPARQL JSON Attendu
Le fetcher attend le format JSON SPARQL standard :

```json
{
  "head": {
    "vars": ["variable1", "variable2"]
  },
  "results": {
    "bindings": [
      {
        "variable1": {
          "type": "uri",
          "value": "http://example.org/resource1"
        },
        "variable2": {
          "type": "literal",
          "value": "Valeur littérale"
        }
      }
    ]
  }
}
```

---

## 🔄 Propriétés et État

### Propriétés Disponibles
```javascript
// Accéder aux propriétés de l'instance
console.log('Endpoint actuel:', sparqlFetcher.currentEndpoint);
console.log('Proxy actuel:', sparqlFetcher.currentProxyUrl);
console.log('Dernières données SPARQL:', sparqlFetcher.lastSparqlData);
```

---

## 🚨 Gestion d'Erreurs et Dépannage

### Types d'Erreurs Courantes

**1. Erreur CORS**
```
Failed to fetch
```
**Solution :** Configurez un proxy SPARQL et passez son URL au fetcher.

**2. Endpoint SPARQL invalide**
```
Erreur HTTP: 404
```
**Solution :** Vérifiez l'URL de l'endpoint SPARQL.

**3. Requête SPARQL malformée**
```
Endpoint error (400): Bad Request
```
**Solution :** Vérifiez la syntaxe de votre requête SPARQL.

**4. Proxy non disponible**
```
Proxy configuré à http://localhost:3001/sparql-proxy a échoué après une erreur CORS
```
**Solution :** Vérifiez que votre serveur proxy est démarré et accessible.

### Callbacks de Gestion d'Erreurs

```javascript
// Exemple complet avec gestion d'erreurs
const result = await sparqlFetcher.loadFromSparqlEndpoint(
  endpoint,
  query,
  null,
  proxyUrl,
  // Callback d'erreur proxy - appelé quand le proxy ne fonctionne pas
  () => {
    console.error('🚫 Proxy non fonctionnel - Configuration requise');
    // Ici vous pouvez afficher un panneau d'aide à l'utilisateur
  },
  // Callback de notification - appelé pour informer l'utilisateur
  (message, type) => {
    if (type === 'error') {
      console.error('❌', message);
    } else {
      console.log('ℹ️', message);
    }
  }
);
```

---

## 🎯 Cas d'Utilisation Avancés

### 1. Utilisation avec Retry Logic
```javascript
async function loadDataWithRetry(endpoint, query, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await sparqlFetcher.loadFromSparqlEndpoint(endpoint, query);
      if (result.status === 'success') {
        return result;
      }
    } catch (error) {
      console.warn(`Tentative ${i + 1} échouée:`, error.message);
      if (i === maxRetries - 1) throw error;
      
      // Attendre avant de réessayer
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### 2. Utilisation avec Plusieurs Endpoints
```javascript
class MultiEndpointFetcher {
  constructor() {
    this.fetchers = new Map();
  }
  
  getFetcher(endpointName) {
    if (!this.fetchers.has(endpointName)) {
      this.fetchers.set(endpointName, new SparqlDataFetcher());
    }
    return this.fetchers.get(endpointName);
  }
  
  async queryDBpedia(query) {
    return this.getFetcher('dbpedia').loadFromSparqlEndpoint(
      'https://dbpedia.org/sparql',
      query
    );
  }
  
  async queryWikidata(query) {
    return this.getFetcher('wikidata').loadFromSparqlEndpoint(
      'https://query.wikidata.org/sparql',
      query
    );
  }
}
```

### 3. Intégration avec Cache
```javascript
class CachedSparqlFetcher {
  constructor() {
    this.fetcher = new SparqlDataFetcher();
    this.cache = new Map();
  }
  
  getCacheKey(endpoint, query) {
    return btoa(endpoint + query); // Simple hash
  }
  
  async loadFromSparqlEndpoint(endpoint, query, ...otherArgs) {
    const cacheKey = this.getCacheKey(endpoint, query);
    
    if (this.cache.has(cacheKey)) {
      console.log('📦 Données chargées depuis le cache');
      return this.cache.get(cacheKey);
    }
    
    const result = await this.fetcher.loadFromSparqlEndpoint(
      endpoint, 
      query, 
      ...otherArgs
    );
    
    if (result.status === 'success') {
      this.cache.set(cacheKey, result);
    }
    
    return result;
  }
}
```

---

## 📖 Référence Complète des Méthodes

| Méthode | Paramètres | Retour | Description |
|---------|------------|---------|-------------|
| `loadFromSparqlEndpoint()` | endpoint, query, jsonData?, proxyUrl?, onProxyError?, onNotification? | Promise<Result> | Charge des données avec hiérarchie complète |
| `executeSparqlQueryWithFallback()` | endpoint, query, proxyUrl?, onProxyError?, onNotification? | Promise<SparqlData> | Exécute requête avec fallback proxy |
| `executeSparqlQuery()` | endpoint, query | Promise<SparqlData> | Exécute requête directe |
| `setData()` | nodes, links | Result | Définit données manuellement |
| `setJsonData()` | jsonData | Result | Charge données JSON pré-formatées |
| `isCorsError()` | error | boolean | Détecte si erreur est due à CORS |

---

## 🔧 Configuration Recommandée

### Pour un Composant Web Custom
```javascript
export class MonComposantSPARQL extends HTMLElement {
  constructor() {
    super();
    this.sparqlFetcher = new SparqlDataFetcher();
    this.attachShadow({ mode: 'open' });
  }
  
  async loadData(endpoint, query, proxyUrl = null) {
    try {
      const result = await this.sparqlFetcher.loadFromSparqlEndpoint(
        endpoint,
        query,
        null,
        proxyUrl,
        () => this.showProxyError(),
        (msg, type) => this.showNotification(msg, type)
      );
      
      if (result.status === 'success') {
        this.renderData(result.data);
      }
    } catch (error) {
      this.showError(error.message);
    }
  }
  
  showProxyError() {
    // Afficher aide pour configuration proxy
  }
  
  showNotification(message, type) {
    // Afficher notification à l'utilisateur
  }
  
  showError(message) {
    // Afficher erreur
  }
  
  renderData(data) {
    // Rendre les données dans le composant
  }
}
```

---

**🎉 C'est tout !** Avec `SparqlDataFetcher`, vous disposez d'un outil robuste et flexible pour gérer la récupération de données SPARQL dans vos applications JavaScript, avec une gestion automatique des problèmes CORS et une interface simple à utiliser. 