# Configuration du proxy SPARQL pour VisGraph

## 🎯 Quand créer un proxy ?

Le composant VisGraph fonctionne selon cette hiérarchie :

1. **JSON direct** ✅ → Aucune configuration requise
2. **Endpoint SPARQL direct** ✅ → Fonctionne si l'endpoint supporte CORS  
3. **Proxy SPARQL** 🔧 → Configuration requise (ce guide)

**Créez le fichier `js/proxy.js` seulement si** vous voyez ces erreurs CORS dans la console :
```
❌ [VisGraph] Échec avec endpoint direct: TypeError: Failed to fetch
🚫 [VisGraph] Problème de CORS détecté
```

## 🚀 Solution rapide : Créer le fichier proxy.js

### Étape 1 : Créer le fichier js/proxy.js

Dans votre projet web, créez le fichier `js/proxy.js` avec ce contenu :

```javascript
// Configuration du proxy SPARQL pour VisGraph
const PROXY_CONFIG = {
  // Option 1: CORS Anywhere (pour les tests)
  corsAnywhereUrl: 'https://cors-anywhere.herokuapp.com/',
  
  // Option 2: AllOrigins (service gratuit)
  allOriginsUrl: 'https://api.allorigins.win/get?url=',
  
  // Option 3: Votre propre proxy (si vous en avez un)
  customProxyUrl: 'https://votre-proxy.com/sparql-proxy',
  
  // Méthode préférée (essayez dans cet ordre)
  preferredMethod: 'allorigins', // 'allorigins', 'cors-anywhere', ou 'custom'
  
  // Timeout en millisecondes
  timeout: 30000
};

/**
 * Interface du proxy pour VisGraph
 */
export default {
  
  async query(endpoint, sparqlQuery) {
    console.log('[Proxy] Tentative de requête via proxy');
    
    const methods = {
      'allorigins': () => this.queryViaAllOrigins(endpoint, sparqlQuery),
      'cors-anywhere': () => this.queryViaCorsAnywhere(endpoint, sparqlQuery),
      'custom': () => this.queryViaCustomProxy(endpoint, sparqlQuery)
    };
    
    // Essayer la méthode préférée d'abord
    try {
      if (methods[PROXY_CONFIG.preferredMethod]) {
        console.log(`[Proxy] Utilisation de ${PROXY_CONFIG.preferredMethod}`);
        return await methods[PROXY_CONFIG.preferredMethod]();
      }
    } catch (error) {
      console.warn(`[Proxy] Échec avec ${PROXY_CONFIG.preferredMethod}:`, error.message);
    }
    
    // Essayer les autres méthodes en fallback
    for (const [methodName, method] of Object.entries(methods)) {
      if (methodName === PROXY_CONFIG.preferredMethod) continue;
      
      try {
        console.log(`[Proxy] Tentative avec ${methodName}`);
        return await method();
      } catch (error) {
        console.warn(`[Proxy] Échec avec ${methodName}:`, error.message);
      }
    }
    
    throw new Error('Toutes les méthodes de proxy ont échoué');
  },
  
  // Méthode 1: AllOrigins (recommandé pour commencer)
  async queryViaAllOrigins(endpoint, sparqlQuery) {
    const params = new URLSearchParams({
      query: sparqlQuery,
      format: 'json'
    });
    
    const targetUrl = `${endpoint}?${params.toString()}`;
    const proxyUrl = PROXY_CONFIG.allOriginsUrl + encodeURIComponent(targetUrl);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROXY_CONFIG.timeout);
    
    try {
      const response = await fetch(proxyUrl, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`AllOrigins error: ${response.status}`);
      }
      
      const result = await response.json();
      return JSON.parse(result.contents);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },
  
  // Méthode 2: CORS Anywhere (peut être indisponible)
  async queryViaCorsAnywhere(endpoint, sparqlQuery) {
    const proxyUrl = PROXY_CONFIG.corsAnywhereUrl + endpoint;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROXY_CONFIG.timeout);
    
    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: new URLSearchParams({
          query: sparqlQuery,
          format: 'json'
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`CORS Anywhere error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },
  
  // Méthode 3: Proxy personnalisé (si vous en avez un)
  async queryViaCustomProxy(endpoint, sparqlQuery) {
    if (!PROXY_CONFIG.customProxyUrl) {
      throw new Error('URL du proxy personnalisé non configurée');
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROXY_CONFIG.timeout);
    
    try {
      const response = await fetch(PROXY_CONFIG.customProxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: endpoint,
          query: sparqlQuery,
          format: 'json'
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Proxy error ${response.status}: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
};
```

### Étape 2 : Tester votre configuration

Une fois le fichier créé, testez dans votre console navigateur :

```javascript
// Test simple
const graphComponent = document.querySelector('vis-graph');

const endpoint = 'https://dbpedia.org/sparql';
const query = `
  SELECT DISTINCT ?person ?name WHERE {
    ?person a dbo:Person ;
            rdfs:label ?name .
    FILTER(LANG(?name) = "en")
  } LIMIT 5
`;

graphComponent.loadFromSparqlEndpoint(endpoint, query)
  .then(result => {
    console.log('✅ Proxy fonctionne !', result);
  })
  .catch(error => {
    console.error('❌ Proxy ne fonctionne pas:', error);
  });
```

## 🔧 Personnalisation du proxy

### Changer la méthode préférée

Dans `js/proxy.js`, modifiez la ligne :

```javascript
preferredMethod: 'allorigins', // Changez ici
```

Options disponibles :
- `'allorigins'` - Service gratuit, généralement fiable
- `'cors-anywhere'` - Peut être indisponible, pour les tests
- `'custom'` - Si vous avez votre propre serveur proxy

### Ajouter votre propre proxy

Si vous avez un serveur proxy, modifiez :

```javascript
customProxyUrl: 'https://votre-proxy.herokuapp.com/sparql-proxy',
preferredMethod: 'custom'
```

### Ajuster le timeout

Pour des requêtes plus longues :

```javascript
timeout: 60000 // 60 secondes au lieu de 30
```

## 📊 Format de données attendu par le composant

Le composant VisGraph attend un **format JSON SPARQL standard**. Votre proxy doit retourner exactement ce format :

### Structure JSON attendue

```json
{
  "head": {
    "vars": ["variable1", "variable2", "variable3"]
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
          "value": "Texte ou label"
        },
        "variable3": {
          "type": "uri", 
          "value": "http://example.org/resource2"
        }
      }
    ]
  }
}
```

### Exemple concret pour un graphe

**Requête SPARQL:**
```sparql
SELECT ?gene ?geneLabel ?protein WHERE {
  ?gene a :Gene ;
        rdfs:label ?geneLabel ;
        :encodes ?protein .
} LIMIT 5
```

**JSON retourné par votre proxy:**
```json
{
  "head": {
    "vars": ["gene", "geneLabel", "protein"]
  },
  "results": {
    "bindings": [
      {
        "gene": {
          "type": "uri",
          "value": "http://example.org/gene/BRCA1"
        },
        "geneLabel": {
          "type": "literal",
          "value": "BRCA1 gene"
        },
        "protein": {
          "type": "uri",
          "value": "http://example.org/protein/P38398"
        }
      },
      {
        "gene": {
          "type": "uri", 
          "value": "http://example.org/gene/TP53"
        },
        "geneLabel": {
          "type": "literal",
          "value": "TP53 tumor protein"
        },
        "protein": {
          "type": "uri",
          "value": "http://example.org/protein/P04637"
        }
      }
    ]
  }
}
```

### Ce que fait le composant avec ces données

1. **Variables** (`head.vars`) → Identifie les colonnes source/target
2. **Bindings** (`results.bindings`) → Chaque ligne devient un nœud/lien
3. **Types** (`type: "uri"` ou `"literal"`) → Détermine le traitement
4. **Values** (`value`) → Contenu affiché et URIs pour les détails

### Transformation en graphe

Le composant transforme automatiquement :

- **Première variable** (`gene`) → **Nœuds sources**
- **Deuxième variable** (`protein`) → **Nœuds cibles** 
- **Autres variables** (`geneLabel`) → **Labels et métadonnées**
- **Relations** → **Liens entre source et target**

### Types de valeurs supportés

| Type SPARQL | Description | Utilisation |
|-------------|-------------|-------------|
| `"uri"` | Ressource avec URL | Nœuds, liens, détails supplémentaires |
| `"literal"` | Texte simple | Labels, descriptions, nombres |
| `"bnode"` | Nœud blanc | Nœuds anonymes (rare) |

### Métadonnées optionnelles

Le composant peut aussi utiliser :

```json
{
  "variable": {
    "type": "literal",
    "value": "Texte",
    "xml:lang": "en",        // Langue (optionnel)
    "datatype": "xsd:string" // Type de données (optionnel)
  }
}
```

### ⚠️ Erreurs courantes à éviter

1. **Mauvais format JSON** → Le composant plantera
2. **Variables manquantes** → Graphe vide
3. **Types incorrects** → Nœuds mal interprétés
4. **Values vides** → Nœuds sans label

### ✅ Test de validation

Pour vérifier que votre proxy retourne le bon format :

```javascript
// Dans la console navigateur
fetch('votre-proxy-url', {
  method: 'POST',
  body: JSON.stringify({
    endpoint: 'https://dbpedia.org/sparql',
    query: 'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 1'
  })
})
.then(response => response.json())
.then(data => {
  console.log('✅ Structure valide:', data.head && data.results);
  console.log('📊 Variables:', data.head?.vars);
  console.log('📋 Bindings:', data.results?.bindings?.length);
});
```

## 🧪 Validation

### Dans la console du navigateur

Vous devriez voir ces messages si tout fonctionne :

```
🔍 [VisGraph] Récupération des données depuis l'endpoint...
❌ [VisGraph] Échec avec endpoint direct: TypeError: Failed to fetch
🔍 [VisGraph] Tentative 2: Proxy
[Proxy] Tentative de requête via proxy
[Proxy] Utilisation de allorigins
✅ [VisGraph] Succès avec proxy
```

### Structure de fichiers

Votre projet doit avoir cette structure :

```
votre-projet/
├── js/
│   └── proxy.js          ← Le fichier que vous venez de créer
├── components/
│   └── VisGraph.js       ← Le composant (déjà fourni)
└── index.html            ← Votre page web
```

## 🚨 Problèmes courants

### "Proxy non disponible"
- Vérifiez que le fichier `js/proxy.js` existe bien
- Vérifiez qu'il n'y a pas d'erreurs de syntaxe

### "Toutes les méthodes ont échoué"
- Essayez de changer `preferredMethod` de `'allorigins'` à `'cors-anywhere'`
- Vérifiez votre connexion internet

### "Module proxy non trouvé" 
- Assurez-vous que le chemin est correct : `/js/proxy.js`
- Vérifiez que votre serveur web sert bien les fichiers du dossier `js/`

## 💡 Conseils

1. **Commencez simple** : Utilisez le code fourni tel quel d'abord
2. **Testez d'abord AllOrigins** : C'est généralement le plus fiable
3. **Gardez CORS Anywhere en fallback** : Au cas où AllOrigins serait indisponible
4. **Surveillez la console** : Les messages vous diront exactement ce qui se passe

---

**🎉 C'est tout !** Votre composant VisGraph peut maintenant contourner les restrictions CORS. 