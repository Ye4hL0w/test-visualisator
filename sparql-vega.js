/**
 * @fileOverview Gestion des visualisations Vega-Lite avec SPARQL
 * @author Moncada Jérémy
 * @version 1.0.0
 */

/** 
 * @namespace SparqlVegaVisualizer 
 * Espace de noms pour le gestionnaire de visualisations Vega-Lite avec SPARQL
 */
const SparqlVegaVisualizer = (function() {
    // État interne du visualisateur
    const state = {
        sparqlData: null,
        vegaSpec: null,
        fields: [],
        currentVisualization: 'bar'
    };

    /**
     * Données d'exemple SPARQL (format récupéré du gen²kgbot)
     */
    const SAMPLE_SPARQL_DATA = {
        "head": {
            "link": [],
            "vars": ["metabolite", "xref"]
        },
        "results": {
            "distinct": false,
            "ordered": true,
            "bindings": [
                {
                    "metabolite": {
                        "type": "uri",
                        "value": "https://rdf.metanetx.org/chem/MNXM12406"
                    },
                    "xref": {
                        "type": "uri",
                        "value": "https://identifiers.org/CHEBI:82565"
                    }
                },
                {
                    "metabolite": {
                        "type": "uri",
                        "value": "https://rdf.metanetx.org/chem/MNXM12406"
                    },
                    "xref": {
                        "type": "uri",
                        "value": "https://identifiers.org/hmdb:HMDB0062508"
                    }
                },
                {
                    "metabolite": {
                        "type": "uri",
                        "value": "https://rdf.metanetx.org/chem/MNXM12406"
                    },
                    "xref": {
                        "type": "uri",
                        "value": "https://identifiers.org/hmdb:HMDB62508"
                    }
                },
                {
                    "metabolite": {
                        "type": "uri",
                        "value": "https://rdf.metanetx.org/chem/MNXM12406"
                    },
                    "xref": {
                        "type": "uri",
                        "value": "https://identifiers.org/kegg.compound:C19568"
                    }
                },
                {
                    "metabolite": {
                        "type": "uri",
                        "value": "https://rdf.metanetx.org/chem/MNXM12406"
                    },
                    "xref": {
                        "type": "uri",
                        "value": "https://identifiers.org/kegg.compound:C20306"
                    }
                },
                {
                    "metabolite": {
                        "type": "uri",
                        "value": "https://rdf.metanetx.org/chem/MNXM54455"
                    },
                    "xref": {
                        "type": "uri",
                        "value": "https://identifiers.org/CHEBI:16414"
                    }
                },
                {
                    "metabolite": {
                        "type": "uri",
                        "value": "https://rdf.metanetx.org/chem/MNXM54455"
                    },
                    "xref": {
                        "type": "uri",
                        "value": "https://identifiers.org/hmdb:HMDB0000056"
                    }
                },
                {
                    "metabolite": {
                        "type": "uri",
                        "value": "https://rdf.metanetx.org/chem/MNXM54455"
                    },
                    "xref": {
                        "type": "uri",
                        "value": "https://identifiers.org/hmdb:HMDB00056"
                    }
                }
            ]
        }
    };

    /**
     * @function init
     * @description Initialise le visualisateur Vega-Lite
     * @returns {void}
     */
    function init() {
        // Attacher les gestionnaires d'événements
        attachEventListeners();
        
        // Charger les données d'exemple par défaut
        loadSampleSparqlData();
    }

    /**
     * @function attachEventListeners
     * @description Attache les gestionnaires d'événements aux éléments d'interface
     * @returns {void}
     */
    function attachEventListeners() {
        document.getElementById('apply-visualization').addEventListener('click', applyVisualization);
        document.getElementById('execute-query').addEventListener('click', executeSparqlQuery);
        document.getElementById('visualization-type').addEventListener('change', function() {
            state.currentVisualization = this.value;
        });
    }

    /**
     * @function loadSampleSparqlData
     * @description Charge les données SPARQL d'exemple et initialise l'interface
     * @returns {void}
     */
    function loadSampleSparqlData() {
        state.sparqlData = SAMPLE_SPARQL_DATA;
        processNewSparqlData();
    }

    /**
     * @function clearState
     * @description Nettoie l'état du visualisateur pour une nouvelle requête
     * @returns {void}
     */
    function clearState() {
        state.sparqlData = null;
        state.vegaSpec = null;
        state.fields = [];
        // Garder le type de visualisation actuel
    }

    /**
     * @function executeSparqlQuery
     * @description Exécute une requête SPARQL vers un endpoint
     * @returns {void}
     */
    function executeSparqlQuery() {
        const endpoint = document.getElementById('sparql-endpoint').value;
        const query = document.getElementById('sparql-query').value;
        
        if (!endpoint || !query) {
            alert('Veuillez fournir un endpoint SPARQL et une requête valide.');
            return;
        }
        
        // Nettoyer l'état pour s'assurer que les anciennes données ne persistent pas
        clearState();
        
        // Afficher un indicateur de chargement
        const vegaContainer = document.getElementById('vega-visualization');
        if (vegaContainer) {
            vegaContainer.innerHTML = '<div class="loading-indicator">Chargement des données en cours...</div>';
        }
        
        // Afficher la requête dans la console pour le débogage
        console.log("Endpoint:", endpoint);
        console.log("Requête:", query);
        
        // Essayer d'abord d'utiliser le serveur Node.js local comme proxy
        fetch(`/api/sparql?endpoint=${encodeURIComponent(endpoint)}&query=${encodeURIComponent(query)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Le serveur local n\'est pas disponible. Tentative directe...');
                }
                return response.json();
            })
            .then(data => {
                // Afficher les données brutes reçues pour le débogage
                console.log("Données SPARQL reçues:", data);
                
                // Vérifier que les données ont la structure attendue
                if (!data || !data.head || !data.results) {
                    console.error("Structure de données SPARQL invalide:", data);
                    throw new Error("Les données reçues n'ont pas la structure SPARQL attendue");
                }
                
                // Mettre à jour l'état avec les nouvelles données
                state.sparqlData = data;
                
                // Ajouter un bouton de débogage pour voir les données brutes
                if (vegaContainer) {
                    const debugButton = document.createElement('button');
                    debugButton.textContent = "Voir les données brutes";
                    debugButton.className = "debug-button";
                    debugButton.onclick = function() {
                        const dataWindow = window.open('', 'SPARQL Data', 'width=800,height=600');
                        dataWindow.document.write('<html><head><title>Données SPARQL</title>');
                        dataWindow.document.write('<style>body{font-family:monospace;white-space:pre;}</style>');
                        dataWindow.document.write('</head><body>');
                        dataWindow.document.write(JSON.stringify(data, null, 2));
                        dataWindow.document.write('</body></html>');
                    };
                    
                    setTimeout(() => {
                        if (document.getElementById('vega-visualization')) {
                            document.getElementById('vega-visualization').appendChild(debugButton);
                        }
                    }, 1000);
                }
                
                // Traiter les données SPARQL
                processNewSparqlData();
                console.log('Requête traitée via le serveur Node.js local');
            })
            .catch(error => {
                console.warn('Erreur avec le serveur local:', error.message);
                console.log('Tentative de requête directe vers l\'endpoint SPARQL...');
                
                // Si le serveur local échoue, tenter une requête directe
                // Note: Cela peut échouer en raison des restrictions CORS
                fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/sparql-query',
                        'Accept': 'application/json'
                    },
                    body: query
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`L'endpoint SPARQL a répondu: ${response.status} ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    // Afficher les données brutes reçues pour le débogage
                    console.log("Données SPARQL reçues directement:", data);
                    
                    // Vérifier que les données ont la structure attendue
                    if (!data || !data.head || !data.results) {
                        console.error("Structure de données SPARQL invalide:", data);
                        throw new Error("Les données reçues n'ont pas la structure SPARQL attendue");
                    }
                    
                    // Mettre à jour l'état avec les nouvelles données
                    state.sparqlData = data;
                    
                    // Ajouter un bouton de débogage pour voir les données brutes
                    if (vegaContainer) {
                        const debugButton = document.createElement('button');
                        debugButton.textContent = "Voir les données brutes";
                        debugButton.className = "debug-button";
                        debugButton.onclick = function() {
                            const dataWindow = window.open('', 'SPARQL Data', 'width=800,height=600');
                            dataWindow.document.write('<html><head><title>Données SPARQL</title>');
                            dataWindow.document.write('<style>body{font-family:monospace;white-space:pre;}</style>');
                            dataWindow.document.write('</head><body>');
                            dataWindow.document.write(JSON.stringify(data, null, 2));
                            dataWindow.document.write('</body></html>');
                        };
                        
                        setTimeout(() => {
                            if (document.getElementById('vega-visualization')) {
                                document.getElementById('vega-visualization').appendChild(debugButton);
                            }
                        }, 1000);
                    }
                    
                    // Traiter les données SPARQL
                    processNewSparqlData();
                    console.log('Requête traitée directement via l\'endpoint SPARQL');
                })
                .catch(directError => {
                    console.error('Échec de la requête directe:', directError);
                    
                    // Si les deux méthodes échouent, utiliser les données d'exemple avec un avertissement
                    alert('Impossible de se connecter à l\'endpoint SPARQL. Les données d\'exemple seront utilisées à la place.\n\nCause: ' + directError.message + '\n\nNote: Si vous utilisez Live Server sans le serveur Node.js, vous pourriez rencontrer des problèmes de CORS avec les endpoints SPARQL externes.');
                    
                    state.sparqlData = JSON.parse(JSON.stringify(SAMPLE_SPARQL_DATA)); // Copie profonde pour éviter la modification
                    processNewSparqlData();
                });
            });
    }

    /**
     * @function processNewSparqlData
     * @description Traite les nouvelles données SPARQL et prépare l'interface
     * @returns {void}
     */
    function processNewSparqlData() {
        if (!state.sparqlData || !state.sparqlData.head || !state.sparqlData.results) {
            console.error('Format de données SPARQL invalide');
            return;
        }
        
        // Vérifier si les données sont des exemples ou des données réelles
        const isExampleData = JSON.stringify(state.sparqlData.head.vars) === JSON.stringify(SAMPLE_SPARQL_DATA.head.vars) &&
                             state.sparqlData.results.bindings.length === SAMPLE_SPARQL_DATA.results.bindings.length;
        
        if (isExampleData) {
            console.warn('Utilisation des données d\'exemple. Les données réelles n\'ont pas été chargées correctement.');
        } else {
            console.log('Utilisation des données réelles de la requête SPARQL.');
        }
        
        // Mettre à jour l'aperçu des données pour la section de débogage
        updateDataPreview(state.sparqlData);
        
        // Extraire les champs disponibles
        state.fields = state.sparqlData.head.vars;
        
        // Transformer les données pour Vega-Lite
        const transformedData = transformSparqlToVegaData(state.sparqlData);
        
        // Mettre à jour les sélecteurs de champs
        updateFieldSelectors();
        
        // Créer une visualisation par défaut
        createDefaultVisualization(transformedData);
    }
    
    /**
     * @function updateDataPreview
     * @description Met à jour l'aperçu des données dans l'interface
     * @param {Object} data - Les données SPARQL
     * @returns {void}
     */
    function updateDataPreview(data) {
        const rawDataElement = document.getElementById('raw-sparql-data');
        const transformedDataElement = document.getElementById('transformed-vega-data');
        
        if (rawDataElement && data) {
            rawDataElement.textContent = JSON.stringify(data, null, 2);
        }
        
        if (transformedDataElement && data) {
            const transformedData = transformSparqlToVegaData(data);
            transformedDataElement.textContent = JSON.stringify(transformedData, null, 2);
        }
    }

    /**
     * @function updateFieldSelectors
     * @description Met à jour les sélecteurs de champs avec les variables disponibles
     * @returns {void}
     */
    function updateFieldSelectors() {
        const selectors = ['x-field', 'y-field', 'color-field'];
        
        selectors.forEach(selectorId => {
            const select = document.getElementById(selectorId);
            select.innerHTML = '';
            
            // Option vide pour le sélecteur de couleur
            if (selectorId === 'color-field') {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '-- Aucun --';
                select.appendChild(option);
            }
            
            // Ajouter tous les champs comme options
            state.fields.forEach(field => {
                const option = document.createElement('option');
                option.value = field;
                option.textContent = field;
                select.appendChild(option);
            });
        });
        
        // Sélectionner des valeurs par défaut
        if (state.fields.length > 0) {
            document.getElementById('x-field').value = state.fields[0];
            
            if (state.fields.length > 1) {
                document.getElementById('y-field').value = state.fields[1];
            }
        }
    }

    /**
     * @function transformSparqlToVegaData
     * @description Transforme les données SPARQL en format compatible avec Vega-Lite
     * @param {Object} sparqlData - Les données SPARQL à transformer
     * @returns {Array} Les données au format Vega-Lite
     */
    function transformSparqlToVegaData(sparqlData) {
        if (!sparqlData || !sparqlData.results || !sparqlData.results.bindings) {
            return [];
        }
        
        // Extraire les variables disponibles
        const vars = sparqlData.head.vars;
        
        // Transformer chaque binding en objet plat pour Vega-Lite
        return sparqlData.results.bindings.map(binding => {
            const flatObject = {};
            
            // Pour chaque variable, extraire la valeur
            vars.forEach(variable => {
                if (binding[variable]) {
                    // Extraire et nettoyer la valeur
                    let value = binding[variable].value;
                    
                    // Pour les URIs, extraire la dernière partie après le dernier / ou #
                    if (binding[variable].type === 'uri') {
                        const uriParts = value.split(/[/#]/);
                        value = uriParts[uriParts.length - 1];
                    }
                    
                    flatObject[variable] = value;
                } else {
                    flatObject[variable] = null;
                }
            });
            
            return flatObject;
        });
    }

    /**
     * @function createDefaultVisualization
     * @description Crée une visualisation par défaut avec les données transformées
     * @param {Array} data - Les données au format Vega-Lite
     * @returns {void}
     */
    function createDefaultVisualization(data) {
        if (!data || data.length === 0 || !state.fields || state.fields.length === 0) {
            console.error('Données insuffisantes pour créer une visualisation');
            return;
        }
        
        // Créer un diagramme à barres par défaut
        const defaultSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            description: 'Visualisation des résultats SPARQL',
            width: 'container',
            height: 400,
            data: { values: data },
            mark: 'bar',
            encoding: {
                x: { field: state.fields[0], type: 'nominal' },
                y: { aggregate: 'count', type: 'quantitative' }
            }
        };
        
        // Enregistrer et afficher la spécification Vega-Lite
        state.vegaSpec = defaultSpec;
        renderVegaVisualization();
    }

    /**
     * @function applyVisualization
     * @description Applique les paramètres de visualisation sélectionnés
     * @returns {void}
     */
    function applyVisualization() {
        if (!state.sparqlData) {
            alert('Aucune donnée SPARQL disponible. Veuillez charger des données.');
            return;
        }
        
        // Récupérer les paramètres sélectionnés
        const xField = document.getElementById('x-field').value;
        const yField = document.getElementById('y-field').value;
        const colorField = document.getElementById('color-field').value;
        const aggregateType = document.getElementById('aggregate-type').value;
        const visualizationType = state.currentVisualization;
        
        // Vérifier que les champs nécessaires sont sélectionnés
        if (!xField || !yField) {
            alert('Veuillez sélectionner au moins les dimensions X et Y.');
            return;
        }
        
        // Transformer les données SPARQL pour Vega-Lite
        const transformedData = transformSparqlToVegaData(state.sparqlData);
        
        // Créer la spécification Vega-Lite
        const spec = createVegaLiteSpec(transformedData, {
            xField,
            yField,
            colorField,
            aggregateType,
            visualizationType
        });
        
        // Mettre à jour et afficher la visualisation
        state.vegaSpec = spec;
        renderVegaVisualization();
    }

    /**
     * @function createVegaLiteSpec
     * @description Crée une spécification Vega-Lite en fonction des paramètres
     * @param {Array} data - Les données au format Vega-Lite
     * @param {Object} params - Les paramètres de visualisation
     * @returns {Object} La spécification Vega-Lite
     */
    function createVegaLiteSpec(data, params) {
        const { xField, yField, colorField, aggregateType, visualizationType } = params;
        
        // Base de la spécification
        const spec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            description: 'Visualisation des résultats SPARQL',
            width: 'container',
            height: 400,
            data: { values: data },
            encoding: {}
        };
        
        // Configurer le type de marque en fonction du type de visualisation
        switch (visualizationType) {
            case 'bar':
                spec.mark = 'bar';
                break;
            case 'pie':
                spec.mark = 'arc';
                break;
            case 'scatter':
                spec.mark = 'point';
                break;
            case 'line':
                spec.mark = 'line';
                break;
            case 'area':
                spec.mark = 'area';
                break;
            case 'heatmap':
                spec.mark = 'rect';
                break;
            case 'network':
                // Pour le réseau, nous allons utiliser une approche spéciale
                return createNetworkSpec(data, params);
            default:
                spec.mark = 'bar';
        }
        
        // Configurer l'encodage X
        spec.encoding.x = { field: xField, type: 'nominal' };
        
        // Configurer l'encodage Y
        spec.encoding.y = { field: yField };
        
        // Appliquer l'agrégation si demandée
        if (aggregateType) {
            spec.encoding.y.aggregate = aggregateType;
            spec.encoding.y.type = 'quantitative';
        } else {
            // Déterminer le type de données pour Y
            const isNumeric = data.some(d => !isNaN(parseFloat(d[yField])));
            spec.encoding.y.type = isNumeric ? 'quantitative' : 'nominal';
        }
        
        // Ajouter l'encodage de couleur si demandé
        if (colorField) {
            spec.encoding.color = { field: colorField };
            
            // Déterminer le type de données pour la couleur
            const isNumeric = data.some(d => !isNaN(parseFloat(d[colorField])));
            spec.encoding.color.type = isNumeric ? 'quantitative' : 'nominal';
        }
        
        // Ajustements spécifiques pour certains types de visualisation
        if (visualizationType === 'pie') {
            // Pour un diagramme circulaire, utiliser theta au lieu de y
            spec.encoding.theta = { 
                field: yField,
                type: 'quantitative'
            };
            
            // Si un agrégat est spécifié, l'appliquer à theta
            if (aggregateType) {
                spec.encoding.theta.aggregate = aggregateType;
            }
            
            // Supprimer l'encodage y qui n'est pas utilisé pour les diagrammes circulaires
            delete spec.encoding.y;
            
            // Utiliser le champ x pour les catégories
            if (spec.encoding.x) {
                spec.encoding.color = spec.encoding.x;
            }
            
            // Ajuster les paramètres du graphique
            spec.view = { stroke: null };
        } 
        else if (visualizationType === 'heatmap') {
            // Pour une carte de chaleur, on utilise un encodage de couleur basé sur la valeur y
            spec.encoding.color = { field: yField };
            
            // Si un agrégat est spécifié, l'appliquer à la couleur
            if (aggregateType) {
                spec.encoding.color.aggregate = aggregateType;
            }
            
            // Détermine si la valeur est numérique
            const isNumeric = data.some(d => !isNaN(parseFloat(d[yField])));
            spec.encoding.color.type = isNumeric ? 'quantitative' : 'nominal';
            
            // Ajouter un schéma de couleur pour les cartes de chaleur
            spec.encoding.color.scale = { scheme: 'viridis' };
            
            // Supprimer l'encodage y original
            delete spec.encoding.y;
        }
        else if (visualizationType === 'line' || visualizationType === 'area') {
            // Pour les graphiques linéaires et de zone, on veut généralement un axe x ordonné
            const isXNumeric = data.some(d => !isNaN(parseFloat(d[xField])));
            
            if (isXNumeric) {
                spec.encoding.x.type = 'quantitative';
                spec.encoding.x.scale = { zero: false };  // Pour mieux voir les tendances
            } else {
                // Pour les données temporelles ou ordinales
                spec.encoding.x.sort = null;  // Préserve l'ordre des données
            }
            
            // Pour les graphiques de ligne et de zone, un groupe est souvent nécessaire
            if (colorField) {
                // Ajouter un paramètre de groupe pour créer des lignes/zones séparées
                spec.encoding.color.legend = { title: colorField };
            }
            
            // Ajouter un point sur les lignes pour une meilleure lisibilité
            if (visualizationType === 'line') {
                spec.mark = { type: 'line', point: true };
            }
        }
        
        return spec;
    }
    
    /**
     * @function createNetworkSpec
     * @description Crée une spécification pour un graphique de réseau
     * @param {Array} data - Les données au format Vega-Lite
     * @param {Object} params - Les paramètres de visualisation
     * @returns {Object} La spécification Vega-Lite
     */
    function createNetworkSpec(data, params) {
        const { xField, yField, colorField } = params;
        
        // Pour un graphique de réseau, nous devons restructurer les données
        // Créer les nœuds
        const nodes = [];
        const nodeMap = new Map();
        
        // Extraire les nœuds uniques des champs x et y
        data.forEach(d => {
            if (d[xField] && !nodeMap.has(d[xField])) {
                const node = { id: d[xField] };
                nodes.push(node);
                nodeMap.set(d[xField], node);
            }
            
            if (d[yField] && !nodeMap.has(d[yField])) {
                const node = { id: d[yField] };
                nodes.push(node);
                nodeMap.set(d[yField], node);
            }
        });
        
        // Créer les liens entre les nœuds
        const links = data.map(d => ({
            source: d[xField],
            target: d[yField],
            value: 1  // Valeur par défaut
        }));
        
        // Préparation des données pour Vega-Lite
        const networkData = {
            nodes: nodes,
            links: links
        };
        
        // Spécification pour un graphique de force dirigé
        return {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            description: 'Réseau d\'interactions basé sur les résultats SPARQL',
            width: 800,
            height: 600,
            padding: 0,
            autosize: "none",
            
            data: [
                {
                    name: "node-data",
                    values: networkData.nodes
                },
                {
                    name: "link-data",
                    values: networkData.links
                }
            ],
            
            scales: [
                {
                    name: "color",
                    type: "ordinal",
                    domain: { data: "node-data", field: "group" },
                    range: { scheme: "category20" }
                }
            ],
            
            marks: [
                {
                    name: "nodes",
                    type: "symbol",
                    zindex: 1,
                    
                    from: { data: "node-data" },
                    encode: {
                        enter: {
                            fill: { scale: "color", field: "group" },
                            stroke: { value: "white" }
                        },
                        update: {
                            size: { value: 100 },
                            tooltip: { signal: "datum" }
                        }
                    },
                    
                    transform: [
                        {
                            type: "force",
                            iterations: 300,
                            static: false,
                            forces: [
                                { force: "center", x: { signal: "width / 2" }, y: { signal: "height / 2" } },
                                { force: "collide", radius: 20 },
                                { force: "nbody", strength: -30 },
                                { force: "link", links: "link-data", distance: 30 }
                            ]
                        }
                    ]
                },
                {
                    type: "path",
                    from: { data: "link-data" },
                    encode: {
                        update: {
                            stroke: { value: "#ccc" },
                            strokeWidth: { value: 0.5 }
                        }
                    },
                    transform: [
                        {
                            type: "linkpath",
                            shape: "line",
                            sourceX: { field: "datum.source.x" },
                            sourceY: { field: "datum.source.y" },
                            targetX: { field: "datum.target.x" },
                            targetY: { field: "datum.target.y" }
                        }
                    ]
                },
                {
                    type: "text",
                    from: { data: "node-data" },
                    encode: {
                        enter: {
                            align: { value: "center" },
                            baseline: { value: "middle" },
                            fontSize: { value: 10 },
                            fontWeight: { value: "bold" },
                            fill: { value: "black" }
                        },
                        update: {
                            x: { field: "datum.x" },
                            y: { field: "datum.y" },
                            text: { field: "datum.id" },
                            dx: { value: 15 }
                        }
                    }
                }
            ]
        };
    }

    /**
     * @function renderVegaVisualization
     * @description Affiche la visualisation Vega-Lite dans le conteneur spécifié
     * @returns {void}
     */
    function renderVegaVisualization() {
        if (!state.vegaSpec) {
            console.error('Aucune spécification Vega-Lite à afficher');
            return;
        }
        
        // Afficher la visualisation
        vegaEmbed('#vega-visualization', state.vegaSpec, {
            actions: true,
            theme: 'dark'
        }).then(result => {
            console.log('Visualisation Vega-Lite rendue avec succès');
        }).catch(error => {
            console.error('Erreur lors du rendu de la visualisation Vega-Lite:', error);
        });
    }

    // Initialiser le module au chargement de la page
    window.addEventListener('DOMContentLoaded', init);

    // Exposer la fonction transformSparqlToVegaData pour être utilisée par le web component BarChart
    window.transformSparqlToVegaData = transformSparqlToVegaData;
    window.SAMPLE_SPARQL_DATA = SAMPLE_SPARQL_DATA;

    // API publique
    return {
        init,
        transformSparqlToVegaData
    };
})(); 