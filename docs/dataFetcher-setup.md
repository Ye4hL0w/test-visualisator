# Guide Simple : SparqlDataFetcher

## 🎯 Qu'est-ce que c'est ?

`SparqlDataFetcher` est un outil JavaScript qui récupère des données depuis des bases de données SPARQL. Il résout automatiquement les problèmes de connexion (CORS) en utilisant un proxy si nécessaire.

**En gros :** Il va chercher vos données là où elles sont, même si votre navigateur l'empêche normalement.

---

## 🚀 Comment l'utiliser

### 1. Récupérer le fichier
D'abord, vous devez avoir le fichier `SparqlDataFetcher.js` dans votre projet :
- **Téléchargez** le fichier depuis le repository : [SparqlDataFetcher.js](https://github.com/Ye4hL0w/test-visualisator/blob/main/components/SparqlDataFetcher.js)
- **Ou copiez** le code et créez le fichier `components/SparqlDataFetcher.js`

### 2. Importer le module
```javascript
import { SparqlDataFetcher } from './components/SparqlDataFetcher.js';
```

### 3. Créer une instance
```javascript
const fetcher = new SparqlDataFetcher();
```

---

## 📋 Les méthodes principales

### `loadFromSparqlEndpoint()` - La méthode principale

**Ce qu'elle fait :** Récupère des données depuis un endpoint SPARQL avec plusieurs options de secours.

**Comment l'utiliser :**
```javascript
const result = await fetcher.loadFromSparqlEndpoint(
  'https://dbpedia.org/sparql',                    // Où chercher les données
  'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10',  // Quoi chercher
  null,                                            // Données JSON (optionnel)
  'http://localhost:3001/sparql-proxy'            // Proxy de secours (optionnel)
);

if (result.status === 'success') {
  console.log('Données récupérées :', result.data);
} else {
  console.log('Erreur :', result.message);
}
```

### `executeSparqlQueryWithFallback()` - Requête avec secours automatique

**Ce qu'elle fait :** Essaie d'abord l'endpoint direct, puis utilise automatiquement le proxy si ça ne marche pas (problème CORS).

**Comment l'utiliser :**
```javascript
try {
  const data = await fetcher.executeSparqlQueryWithFallback(
    'https://dbpedia.org/sparql',
    'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 5',
    'http://localhost:3001/sparql-proxy', // Proxy de secours
    () => console.log('⚠️ Le proxy ne marche pas'), // Si problème de proxy
    (msg, type) => console.log(`${type}: ${msg}`) // Notifications
  );
  console.log('Résultats :', data);
} catch (error) {
  console.log('Aucune solution n\'a marché :', error.message);
}
```

### `executeSparqlQuery()` - Requête directe simple

**Ce qu'elle fait :** Envoie une requête directement à l'endpoint, sans proxy.

**Comment l'utiliser :**
```javascript
try {
  const data = await fetcher.executeSparqlQuery(
    'https://query.wikidata.org/sparql',
    'SELECT ?item WHERE { ?item wdt:P31 wd:Q5 } LIMIT 5'
  );
  console.log('Résultats :', data);
} catch (error) {
  console.log('Ça n\'a pas marché :', error.message);
}
```

### `setJsonData()` - Utiliser ses propres données

**Ce qu'elle fait :** Utilise des données JSON que vous avez déjà, au lieu d'aller les chercher.

**Comment l'utiliser :**
```javascript
const mesdonnees = {
  head: { vars: ['nom', 'age'] },
  results: {
    bindings: [
      {
        nom: { type: 'literal', value: 'Jean' },
        age: { type: 'literal', value: '25' }
      }
    ]
  }
};

const result = fetcher.setJsonData(mesonnees);
console.log('Mes données :', result.data);
```

---

## 📊 Ce que vous récupérez

Toutes les méthodes vous donnent un objet comme ça :

```javascript
{
  status: 'success',           // 'success' si ça marche, 'error' sinon
  method: 'endpoint-or-proxy', // Comment les données ont été récupérées
  message: 'Données chargées', // Description de ce qui s'est passé
  data: { /* vos données */ }, // Les données transformées
  rawData: { /* ... */ }       // Les données brutes originales
}
```

---

## 🚨 Gérer les erreurs

### Erreurs courantes et solutions

**1. Erreur "Failed to fetch" ou "CORS"**
- **Problème :** Votre navigateur bloque la connexion
- **Solution :** Utilisez un proxy en 4ème paramètre
- **📖 Guide complet :** [Configuration du proxy](https://github.com/Ye4hL0w/test-visualisator/blob/main/docs/proxy-setup.md)

**2. Erreur "404" ou "HTTP error"**
- **Problème :** L'adresse de l'endpoint est incorrecte
- **Solution :** Vérifiez l'URL

**3. Erreur "Bad Request"**
- **Problème :** Votre requête SPARQL a une erreur de syntaxe
- **Solution :** Vérifiez votre requête SPARQL

### Exemple avec gestion d'erreurs
```javascript
const result = await fetcher.loadFromSparqlEndpoint(
  'https://dbpedia.org/sparql',
  'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10',
  null,
  'http://localhost:3001/sparql-proxy',
  () => console.log('⚠️ Problème de proxy'), // Si le proxy ne marche pas
  (message, type) => console.log(`${type}: ${message}`) // Pour les notifications
);
```

---

## 💡 Exemple complet

```javascript
// 1. Importer
import { SparqlDataFetcher } from './components/SparqlDataFetcher.js';

// 2. Créer une instance
const fetcher = new SparqlDataFetcher();

// 3. Récupérer des données
async function recupererDonnees() {
  try {
    const result = await fetcher.loadFromSparqlEndpoint(
      'https://query.wikidata.org/sparql',
      `SELECT ?pays ?paysLabel WHERE {
        ?pays wdt:P31 wd:Q6256 .
        SERVICE wikibase:label { bd:serviceParam wikibase:language "fr" }
      } LIMIT 10`,
      null, // Pas de données JSON
      'http://localhost:3001/sparql-proxy' // Proxy au cas où
    );

    if (result.status === 'success') {
      console.log('🎉 Données récupérées !');
      console.log('Nombre de résultats :', result.data.results.bindings.length);
      
      // Afficher les pays
      result.data.results.bindings.forEach(pays => {
        console.log('Pays :', pays.paysLabel.value);
      });
    } else {
      console.log('❌ Erreur :', result.message);
    }
  } catch (error) {
    console.log('💥 Problème :', error.message);
  }
}

// 4. Lancer la récupération
recupererDonnees();
```

---

## 📖 Résumé des méthodes

| Méthode | À quoi ça sert | Paramètres essentiels |
|---------|----------------|----------------------|
| `loadFromSparqlEndpoint()` | Récupérer des données avec tous les secours | endpoint, requête |
| `executeSparqlQueryWithFallback()` | Requête avec secours automatique | endpoint, requête, proxy, callback pour problème de proxy, callback pour notifications |
| `executeSparqlQuery()` | Requête directe simple | endpoint, requête |
| `setJsonData()` | Utiliser ses propres données JSON | données JSON |

---

**🎯 En résumé :** Créez une instance, appelez `loadFromSparqlEndpoint()` avec votre endpoint et votre requête, et récupérez vos données dans `result.data` ! 