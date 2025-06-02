# Composant VisGraph

Le fichier `VisGraph.js` définit un composant web (`<vis-graph>`) capable d'afficher des graphes de connaissances interactifs à partir de données issues d'endpoints SPARQL. Il utilise D3.js pour la visualisation et la simulation de forces.

## Fonctionnement général

1.  **Initialisation** : Le composant peut être initialisé avec des dimensions (largeur, hauteur) et un endpoint SPARQL par défaut.
2.  **Chargement des données** : La méthode principale pour alimenter le graphe est `loadFromSparqlEndpoint(endpoint, query)`.
    *   Elle exécute la requête SPARQL fournie sur l'endpoint spécifié.
    *   Elle attend des résultats au format JSON SPARQL.
    *   Les résultats bruts sont ensuite passés à la méthode `transformSparqlResults` pour les convertir en une structure de nœuds et de liens compatible avec D3.js.
    *   Les données brutes (`rawData`) sont également stockées dans `this.lastSparqlData` pour une utilisation ultérieure (par exemple, pour enrichir le panneau de détails).
3.  **Transformation des données (`transformSparqlResults`)** : C'est l'étape clé pour la création du graphe à partir du JSON SPARQL.
    *   **Identification des variables** :
        *   Le composant récupère la liste des variables (`vars`) depuis `results.head.vars`.
        *   La première variable (`vars[0]`) est considérée comme la variable **source** (sujet).
        *   La deuxième variable (`vars[1]`), si elle existe, est considérée comme la variable **cible** (objet). Si seulement une variable est présente, le graphe affichera des nœuds sans liens entre eux basés sur cette unique variable.
    *   **Traitement des bindings** : Le composant itère sur chaque `binding` (chaque ligne de résultat) dans `results.results.bindings`.
        *   Pour chaque `binding` :
            *   **Nœud Source** :
                *   Si la variable source existe dans le `binding` :
                    *   Un **ID de nœud** est extrait à l'aide de `this.extractIdFromBinding()`. Cette méthode tente d'obtenir un identifiant lisible (par exemple, la dernière partie d'une URI, la valeur d'un paramètre `p1` pour certains types d'URL, ou la valeur littérale elle-même).
                    *   Un **label de nœud** est déterminé via `this._determineNodeLabelFromBinding()`. Cette fonction cruciale examine :
                        1.  La valeur littérale de l'entité elle-même.
                        2.  Des variables directement associées par convention de nommage (ex: si la variable source est `?gene`, elle cherche `?geneLabel`, `?geneName`).
                        3.  D'autres variables littérales dans le même `binding` qui semblent descriptives (ex: `?diseaseLabel`, `?taxonName`, `?description`), en utilisant un système de scoring pour choisir la plus pertinente.
                        4.  En dernier recours, l'ID extrait précédemment.
                    *   L'**URI** du nœud est stockée si le type du binding est `uri`.
                    *   L'**intégralité du `binding`** est stockée dans la propriété `originalData` du nœud. Cela permet d'accéder à toutes les informations de la ligne de résultat SPARQL initiale lors de l'affichage des détails du nœud.
                    *   Si le nœud (basé sur son ID) n'existe pas encore dans une `Map` interne (`nodesMap`), il y est ajouté.
            *   **Nœud Cible** :
                *   Si une variable cible a été identifiée et existe dans le `binding`, un processus similaire à celui du nœud source est appliqué pour créer ou récupérer le nœud cible.
            *   **Lien** :
                *   Si un nœud source et un nœud cible valides ont été identifiés pour le `binding` courant, un lien est créé entre eux.
                *   Les liens sont stockés dans une `Map` (`linksMap`) pour garantir leur unicité (basée sur la paire source-cible).
    *   **Finalisation** : La méthode retourne un objet contenant deux tableaux : `nodes` (les nœuds uniques) et `links` (les liens uniques).
4.  **Rendu du graphe (`render` et `createForceGraph`)** :
    *   Une fois les données transformées, la méthode `render()` est appelée. Elle prépare le conteneur SVG.
    *   `createForceGraph()` utilise D3.js pour :
        *   Créer les éléments SVG pour les liens (`<line>`) et les groupes de nœuds (`<g>` contenant un `<circle>` et un `<text>`).
        *   Initialiser une simulation de forces (force de lien, de charge, de centrage, de collision) pour positionner les nœuds de manière dynamique.
        *   Gérer les interactions utilisateur comme le glisser-déposer des nœuds, le survol pour afficher des infobulles et des mises en évidence, et le clic droit pour le menu contextuel.
5.  **Affichage des détails d'un nœud** :
    *   Lorsqu'un utilisateur demande les détails d'un nœud (via le menu contextuel) :
        *   La méthode `executeNodeQuery(node)` est appelée.
        *   Elle utilise l'URI du nœud (`node.uri`) pour construire des requêtes SPARQL génériques (via `buildInformativeQueries`) afin de récupérer des informations descriptives, des relations sémantiques et des propriétés techniques. Ces requêtes sont conçues pour être aussi indépendantes que possible du type de graphe de connaissances.
        *   Les requêtes sont exécutées sur l'endpoint SPARQL courant (`this.currentEndpoint`) ou un endpoint de repli (DBpedia).
        *   Les résultats sont affichés dans un panneau latéral (`displayRichNodeDetails`), qui est structuré pour présenter clairement les différentes catégories d'informations récupérées. La section "Graph Context" de ce panneau utilise les `originalData` du nœud pour afficher d'autres informations issues de la requête SPARQL initiale qui n'ont pas été directement utilisées pour définir la structure du graphe.

## Points clés pour la création pertinente des graphes

*   **Flexibilité des variables SPARQL** : Le système s'appuie sur la position des variables dans la clause `SELECT` (la première pour la source, la seconde pour la cible) plutôt que sur des noms de variables fixes.
*   **Détermination intelligente des labels (`_determineNodeLabelFromBinding`)** : C'est un élément essentiel. En ne se limitant pas à une variable `?label` fixe, mais en inspectant activement les autres colonnes du résultat SPARQL à la recherche de la meilleure description textuelle possible pour un nœud, le composant peut s'adapter à une grande variété de schémas de données SPARQL. L'utilisation d'un système de scoring basé sur des mots-clés (comme "label", "name", "description", "taxon", "disease") aide à choisir le label le plus informatif parmi les candidats potentiels.
*   **Stockage des données originales (`originalData`)** : En conservant l'intégralité du `binding` SPARQL pour chaque nœud, le composant permet d'enrichir l'affichage des détails avec toutes les informations contextuelles qui étaient présentes dans la ligne de résultat ayant défini ce nœud ou ses connexions, sans nécessiter de requêtes supplémentaires pour ces informations spécifiques.
*   **Extraction robuste des ID (`extractIdFromBinding`)** : La capacité à extraire un identifiant signifiant à partir de différents formats d'URI ou de valeurs littérales assure que chaque nœud possède une identité unique et potentiellement lisible, même avant qu'un label plus descriptif ne soit trouvé.

Ce mécanisme permet au composant `VisGraph` de générer des visualisations de graphe utiles et informatives à partir de divers types de résultats SPARQL, en s'efforçant de présenter les nœuds avec les labels les plus pertinents disponibles directement dans les données initiales. 