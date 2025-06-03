# Configuration du Proxy SPARQL pour VisGraph

## 🎯 Quand et Pourquoi un Proxy ?

Le composant `VisGraph` est conçu pour charger et visualiser des données depuis des endpoints SPARQL. Idéalement, ces endpoints devraient être configurés pour autoriser les requêtes depuis des origines web différentes (via CORS). Cependant, de nombreux endpoints SPARQL publics ne le sont pas.

Lorsque vous essayez de charger des données depuis un tel endpoint directement depuis votre navigateur, vous rencontrerez une **erreur CORS (Cross-Origin Resource Sharing)**. Dans la console de votre navigateur, cela se manifeste souvent par des messages comme :

```
Access to fetch at 'https://mon-endpoint-sparql.com/sparql' from origin 'http://localhost:xxxx' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

Ou, dans les logs du composant `VisGraph` :

```
[VisGraph] Échec avec endpoint direct: Failed to fetch
[VisGraph] 🎯 Erreur CORS détectée - Tentative avec proxy local...
```

Pour contourner ce problème, `VisGraph` peut utiliser un **petit serveur proxy local**. Ce serveur, que vous exécutez sur votre machine, reçoit la requête de `VisGraph`, la transmet à l'endpoint SPARQL distant (les serveurs ne sont pas soumis aux restrictions CORS des navigateurs), récupère la réponse, et la renvoie à `VisGraph`.

**Vous devez mettre en place ce proxy local si et seulement si vous rencontrez des erreurs CORS.** Si les requêtes directes fonctionnent, le proxy n'est pas nécessaire.

## 🚀 Mise en Place du Serveur Proxy Local (`server/proxy.js`)

La solution recommandée est de créer un simple serveur Node.js qui agira comme proxy. Le composant `VisGraph` est préconfiguré pour essayer d'utiliser ce proxy sur `http://localhost:3001/sparql-proxy` si une requête directe échoue à cause de CORS.

Suivez ces étapes pour le mettre en place :

### Étape 1 : Créer le fichier `server/proxy.js`

Créez un dossier `server` à la racine de votre projet, puis créez un fichier nommé `proxy.js` dans ce dossier.

Le contenu complet de ce fichier vous sera fourni à la section "[📄 Code Complet pour `server/proxy.js`](#code-complet-pour-proxyjs)" à la fin de ce document. Copiez-collez l'intégralité de ce code dans votre fichier `server/proxy.js`.

### Étape 2 : Installer les dépendances

Ce serveur proxy a besoin de quelques paquets Node.js pour fonctionner : `express`, `node-fetch` (version 2 pour une meilleure compatibilité avec différents types de projets Node.js), et `cors`.

Ouvrez un terminal **à la racine de votre projet** (là où se trouve votre `package.json`) et exécutez la commande suivante :

```bash
npm install express node-fetch@2 cors
```

Si vous utilisez Yarn :

```bash
yarn add express node-fetch@2 cors
```

**Note sur `node-fetch` et les modules ES/CommonJS :**
*   Le code du `server/proxy.js` fourni utilise la syntaxe `import` (ES Modules). Pour que cela fonctionne, votre fichier `package.json` à la racine de votre projet doit contenir la ligne `"type": "module"`.
*   Si votre projet n'est pas configuré pour les ES Modules (c'est-à-dire pas de `"type": "module"` ou alors `"type": "commonjs"`), vous devrez soit :
    *   Adapter le code de `server/proxy.js` pour utiliser la syntaxe CommonJS (`require()` au lieu de `import`).
    *   Ou, plus simple, ajouter `"type": "module"` à votre `package.json`.
*   `node-fetch@2` est recommandé car il fonctionne bien avec la syntaxe `import` dans un contexte de module ES, et il est aussi plus aisé à utiliser avec `require` si vous deviez adapter le proxy en CommonJS. Les versions plus récentes de `node-fetch` sont purement ESM.

### Étape 3 : Lancer le serveur proxy

Une fois les dépendances installées, lancez le serveur proxy depuis votre terminal (toujours à la racine de votre projet) :

```bash
node server/proxy.js
```

Vous devriez voir un message indiquant que le serveur a démarré, typiquement :

```
Serveur proxy SPARQL démarré sur http://localhost:3001
Utilisez http://localhost:3001/sparql-proxy en fournissant 'endpoint' et 'query' comme paramètres.
```

**Laissez ce terminal ouvert et le serveur proxy en cours d'exécution** pendant que vous utilisez votre application web avec le composant `VisGraph`. Si vous fermez ce terminal, le proxy s'arrêtera.

### Étape 4 : Utilisation par `VisGraph`

Aucune configuration supplémentaire n'est nécessaire dans le composant `VisGraph` lui-même.
S'il rencontre une erreur CORS en tentant une requête directe, il essaiera automatiquement d'utiliser le proxy à l'adresse `http://localhost:3001/sparql-proxy`.

Si le proxy est correctement lancé et fonctionnel, la récupération des données devrait réussir.

---

## 📊 Format de Données Attendu par `VisGraph`

Le composant `VisGraph` attend le **format JSON SPARQL standard**. Votre proxy doit retourner exactement ce format :

```json
{
  "head": {
    "vars": ["variable1", "variable2", ...]
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
          "value": "Label pour la ressource"
        }
      }
    ]
  }
}
```

**Points clés :**
*   `head.vars` : Liste des variables de votre requête SPARQL
*   `results.bindings` : Tableau des résultats
*   `type` : `"uri"` pour les nœuds, `"literal"` pour les labels
*   `value` : La valeur de la variable

---

## 🚨 Dépannage du Proxy Local

**Problèmes courants :**

*   **Erreur `Cannot find module 'express'`** : Exécutez `npm install express node-fetch@2 cors`
*   **Port 3001 déjà utilisé** : Un autre programme utilise le port. Fermez-le ou changez le port dans `server/proxy.js`
*   **Proxy ne reçoit aucune requête** : Vérifiez que `VisGraph` tente bien d'utiliser le proxy après l'erreur CORS
*   **Erreur `import` statement** : Ajoutez `"type": "module"` dans votre `package.json`

**Tests rapides :**
*   Proxy lancé ? → `http://localhost:3001/proxy-status` doit afficher `{"status":"Proxy is running"}`
*   Logs du proxy : Surveillez le terminal où `node server/proxy.js` s'exécute

---

## <a name="code-complet-pour-proxyjs"></a>📄 Code Complet pour `server/proxy.js`

Copiez l'intégralité du code ci-dessous et collez-le dans le fichier `server/proxy.js` que vous avez créé à la racine de votre projet.

```javascript
/**
 * Proxy SPARQL pour résoudre les problèmes CORS
 * Ce fichier doit être configuré selon votre environnement
 */

import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = process.env.PROXY_PORT || 3001; // Le port sur lequel le proxy écoutera

app.use(cors()); // Permettre les requêtes Cross-Origin
app.use(express.json()); // Pour parser le corps des requêtes JSON (si on passe endpoint/query dans le body)

// Un endpoint de statut simple pour vérifier si le proxy est en cours d'exécution
app.get('/proxy-status', (req, res) => {
  res.status(200).json({ status: 'Proxy is running' });
});

async function executeQuery(endpoint, sparqlQuery, method = 'POST', res) {
  console.log(`[Proxy] Tentative ${method} vers: ${endpoint}`);
  try {
    const headers = {
      'Accept': 'application/sparql-results+json, application/json',
      'User-Agent': 'VisGraph-Proxy/1.0'
    };
    let body;
    let targetUrl = endpoint;

    if (method === 'POST') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const params = new URLSearchParams();
      params.append('query', sparqlQuery);
      body = params;
    } else {
      targetUrl = `${endpoint}?query=${encodeURIComponent(sparqlQuery)}`;
    }

    const response = await fetch(targetUrl, {
      method: method,
      headers: headers,
      body: method === 'POST' ? body : undefined,
      redirect: 'follow'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Proxy] Erreur de l'endpoint (${method} ${response.status}): ${errorText}`);
      throw new Error(`Endpoint error (${method} ${response.status}): ${response.statusText}. Body: ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log(`[Proxy] Succès ${method} pour ${endpoint}`);
    res.json(data);
    return true;

  } catch (error) {
    console.error(`[Proxy] Échec de la requête ${method} vers ${endpoint}:`, error.message);
    throw error;
  }
}

// Route principale - essaie POST puis GET si ça échoue
app.all('/sparql-proxy', async (req, res) => {
  const { endpoint, query: sparqlQuery } = { ...req.query, ...req.body };

  if (!endpoint || !sparqlQuery) {
    return res.status(400).json({
      error: 'Les paramètres "endpoint" et "query" sont requis.',
    });
  }

  console.log(`[Proxy] Reçu pour proxy: Endpoint=${endpoint}`);

  try {
    console.log('[Proxy] Tentative avec POST...');
    await executeQuery(endpoint, sparqlQuery, 'POST', res);
  } catch (postError) {
    console.warn('[Proxy] Échec POST, tentative avec GET...');
    try {
      await executeQuery(endpoint, sparqlQuery, 'GET', res);
    } catch (getError) {
      console.error(`[Proxy] Échec final pour ${endpoint}. POST error: ${postError.message}, GET error: ${getError.message}`);
      res.status(500).json({
        error: 'Proxy failed for both POST and GET requests.',
        postError: postError.message,
        getError: getError.message
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Serveur proxy SPARQL démarré sur http://localhost:${PORT}`);
  console.log(`Utilisez http://localhost:${PORT}/sparql-proxy en fournissant 'endpoint' et 'query' comme paramètres.`);
  console.log(`Exemple: http://localhost:${PORT}/sparql-proxy?endpoint=YOUR_SPARQL_ENDPOINT&query=YOUR_SPARQL_QUERY`);
});

// Éviter que le proxy crashe silencieusement
process.on('uncaughtException', (error) => {
  console.error('[Proxy] Uncaught Exception:', error);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Proxy] Unhandled Rejection at:', promise, 'reason:', reason);
}); 
```

---

**🎉 C'est tout !** Avec le serveur `server/proxy.js` en place et en cours d'exécution, votre composant `VisGraph` devrait maintenant être capable de contourner les restrictions CORS et de charger des données depuis une plus grande variété d'endpoints SPARQL. 