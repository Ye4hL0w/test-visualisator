# Visualisateur de Données Métabolomiques

Ce visualisateur permet d'explorer et d'analyser des données métabolomiques via des représentations graphiques interactives. Il est conçu pour s'intégrer au chatbot gen²kgbot et récupère les données directement depuis les cookies du navigateur.

## Fonctionnalités

- **Graphique à dispersion** : Visualisez les relations entre deux variables métabolomiques
- **Carte de chaleur** : Identifiez les motifs et variations dans les données métabolomiques
- **Réseau d'interactions** : Explorez les corrélations entre différents métabolites
- **Diagramme à barres** : Analysez la distribution statistique d'une variable

## Installation

1. Clonez ce dépôt dans votre environnement de développement
2. Intégrez les fichiers dans votre projet existant
3. Assurez-vous que la bibliothèque D3.js est correctement chargée

## Utilisation

### Préparer les données

Le visualisateur attend un cookie nommé `metabolomicsData` contenant les données au format JSON suivant:

```json
{
  "columns": ["metabolite1", "metabolite2", "metabolite3", ...],
  "values": [
    {"metabolite1": 0.123, "metabolite2": 4.567, "metabolite3": 8.901, ...},
    {"metabolite1": 2.345, "metabolite2": 6.789, "metabolite3": 0.123, ...},
    ...
  ]
}
```

### Intégration avec gen²kgbot

Pour intégrer ce visualisateur au chatbot gen²kgbot, assurez-vous que:

1. Le chatbot stocke les données métabolomiques dans un cookie nommé `metabolomicsData`
2. Les fichiers HTML, CSS et JavaScript sont correctement chargés dans l'interface du chatbot

## Personnalisation

Vous pouvez personnaliser l'apparence et le comportement du visualisateur en modifiant:

- `styles.css` pour l'apparence visuelle
- `visualisator.js` pour les fonctionnalités et les visualisations

## Structure des fichiers

- `index.html` : Structure HTML du visualisateur
- `styles.css` : Styles CSS pour l'apparence
- `visualisator.js` : Code JavaScript utilisant D3.js pour les visualisations

## Documentation technique

Le code est entièrement documenté en style JavaDoc en français. Chaque fonction est expliquée en détail, avec ses paramètres et valeurs de retour.

## Exemple d'utilisation

Pour tester le visualisateur avec des données d'exemple, vous pouvez exécuter le code suivant dans la console de votre navigateur:

```javascript
// Données d'exemple
const sampleData = {
  columns: ["glucose", "lactate", "pyruvate", "citrate", "alanine", "glutamine"],
  values: Array.from({length: 30}, () => ({
    glucose: Math.random() * 10,
    lactate: Math.random() * 8,
    pyruvate: Math.random() * 5,
    citrate: Math.random() * 7,
    alanine: Math.random() * 6,
    glutamine: Math.random() * 9
  }))
};

// Stocker les données dans un cookie
document.cookie = `metabolomicsData=${JSON.stringify(sampleData)}; path=/`;

// Recharger la page
location.reload();
```

## Contact

Pour toute question concernant ce visualisateur, veuillez contacter l'équipe de développement. 