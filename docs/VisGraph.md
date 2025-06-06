# Composant vis-graph

Le fichier `vis-graph.js` définit un composant web (`<vis-graph>`) capable d'afficher des graphes de connaissances interactifs à partir de données issues d'endpoints SPARQL. Il utilise D3.js pour la visualisation et le `SparqlDataFetcher` pour récupérer les données.

## Fonctionnement général

1.  **Initialisation** : Le composant peut être initialisé avec des dimensions (largeur, hauteur) et utilise une instance de `SparqlDataFetcher` pour gérer les requêtes SPARQL.

2.  **Chargement des données** : La méthode principale `loadFromSparqlEndpoint(endpoint, query, jsonData, proxyUrl)` :
    *   Utilise le `SparqlDataFetcher` avec gestion automatique des erreurs CORS et proxy
    *   Stocke les données brutes dans `this.sparqlData` (propriété du composant)
    *   Transforme les résultats SPARQL en nœuds et liens via `transformSparqlResults`
    *   Affiche des notifications et panneaux d'erreur si nécessaire

3.  **Transformation des données (`transformSparqlResults`)** :
    *   **Variables SPARQL** : La première variable = source, la deuxième = cible
    *   **Labels intelligents** : La méthode `_determineNodeLabelFromBinding()` trouve le meilleur label en analysant :
        1.  Valeurs littérales directes
        2.  Variables de label par convention (ex: `geneLabel` pour `gene`)
        3.  Autres variables descriptives avec système de scoring
        4.  ID extrait en dernier recours
    *   **Données originales** : Chaque nœud conserve son `binding` SPARQL complet dans `originalData`
    *   **Déduplication** : Les nœuds et liens sont dédupliqués automatiquement

4.  **Rendu interactif** : Force-directed graph avec D3.js, interactions (survol, drag&drop, menu contextuel)

5.  **Détails enrichis des nœuds** :
    *   **Requêtes automatiques** : Clic droit → récupération de détails via requêtes SPARQL génériques
    *   **Déduplication des relations** : Les relations sémantiques identiques sont fusionnées
    *   **Affichage structuré** : Panneau avec sections (informations de base, contexte du graphe, relations, propriétés techniques)

## Stockage des données

- **`this.sparqlData`** : Données SPARQL brutes conservées par le composant
- **`this.nodes` et `this.links`** : Données transformées pour D3.js
- **`node.originalData`** : Binding SPARQL complet pour chaque nœud
- **`SparqlDataFetcher`** : Utilitaire stateless pour récupérer les données

## Points clés

*   **Flexibilité** : S'adapte à différents schémas SPARQL grâce à la détection intelligente des labels
*   **Robustesse** : Gestion automatique CORS, proxy, déduplication, récupération d'erreurs
*   **Performance** : Déduplication des relations et stockage optimisé des données
*   **Extensibilité** : Données originales conservées pour enrichissements futurs

Le composant génère automatiquement des visualisations pertinentes à partir de résultats SPARQL variés, avec des labels informatifs et une gestion robuste des erreurs. 