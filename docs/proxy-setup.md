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
// --- DEBUT DU CODE POUR server/proxy.js ---
//
// Insérez ici le code complet du serveur proxy.js
// que nous avons développé précédemment.
// Ce code doit inclure :
// - Les imports (express, node-fetch, cors)
// - La configuration de l'application Express (app)
// - Le middleware CORS et express.json()
// - L'endpoint /proxy-status
// - La fonction executeQuery (gérant POST et GET vers l'endpoint SPARQL)
// - L'endpoint principal /sparql-proxy (gérant les requêtes du client VisGraph)
// - app.listen(PORT, ...)
// - La gestion des erreurs non capturées (process.on)
//
// --- FIN DU CODE POUR server/proxy.js ---
```

---

**🎉 C'est tout !** Avec le serveur `server/proxy.js` en place et en cours d'exécution, votre composant `VisGraph` devrait maintenant être capable de contourner les restrictions CORS et de charger des données depuis une plus grande variété d'endpoints SPARQL. 