/**
 * Module pour les visualisations Vega-Lite avec SPARQL
 */
import { extractNameFromURI } from './utils.js';

// État interne du visualisateur
const state = {
    sparqlData: null,
    vegaSpec: null,
    fields: [],
    currentVisualization: 'bar'
};

/**
 * Initialise le visualisateur
 */
function init() {
    // Attacher les gestionnaires d'événements
    attachEventListeners();
    
    // Initialiser une interface vide
    initializeEmptyInterface();
    
    // Exposer les fonctions globalement
    if (window.initSparqlVegaGlobals) {
        window.initSparqlVegaGlobals({
            transformSparqlToVegaData,
            updateDataPreview,
            applyVisualization,
            getState: () => state
        });
    }
    
    // Rendre accessible globalement pour le debug
    window.SparqlVegaVisualizer = {
        transformSparqlToVegaData,
        updateDataPreview,
        applyVisualization,
        getState: () => state
    };
}

/**
 * Initialise l'interface avec un message d'instruction
 */
function initializeEmptyInterface() {
    const vegaContainer = document.getElementById('vega-visualization');
    if (vegaContainer) {
        vegaContainer.innerHTML = `
            <div class="info-message">
                <h3>Aucune donnée à visualiser</h3>
                <p>Veuillez saisir un endpoint SPARQL et une requête, puis cliquez sur "Exécuter".</p>
            </div>
        `;
    }
    
    // Initialiser les aperçus de données vides
    document.getElementById('raw-sparql-data').textContent = '// Aucune donnée SPARQL. Exécutez une requête pour voir les résultats.';
    document.getElementById('transformed-vega-data').textContent = '// Aucune donnée transformée. Exécutez une requête d\'abord.';
    
    // Désactiver le bouton d'application de la visualisation
    document.getElementById('apply-visualization').disabled = true;
}

/**
 * Attache les gestionnaires d'événements
 */
function attachEventListeners() {
    document.getElementById('apply-visualization').addEventListener('click', applyVisualization);
    document.getElementById('execute-query').addEventListener('click', executeSparqlQuery);
    document.getElementById('update-data-preview').addEventListener('click', updateDataPreview);
    
    // Gestionnaire pour le type de visualisation
    document.getElementById('visualization-type').addEventListener('change', function() {
        state.currentVisualization = this.value;
        console.log('Type de visualisation modifié:', state.currentVisualization);
        // Appliquer immédiatement le changement de visualisation si des données sont disponibles
        if (state.sparqlData) {
            applyVisualization();
        }
    });
    
    // Gestionnaires pour les changements de champs X, Y et couleur
    const fieldSelectors = ['x-field', 'y-field', 'color-field', 'aggregate-type'];
    fieldSelectors.forEach(selector => {
        document.getElementById(selector).addEventListener('change', function() {
            // Mettre à jour automatiquement la visualisation quand un champ change
            if (state.sparqlData) {
                applyVisualization();
            }
        });
    });
}

/**
 * Nettoie l'état du visualisateur
 */
function clearState() {
    state.vegaSpec = null;
    state.fields = [];
    // Garder le type de visualisation actuel
}

/**
 * Exécute une requête SPARQL vers un endpoint
 */
function executeSparqlQuery() {
    const endpoint = document.getElementById('sparql-endpoint').value;
    const query = document.getElementById('sparql-query').value;
    
    if (!endpoint || !query) {
        alert('Veuillez fournir un endpoint SPARQL et une requête valide.');
        return;
    }
    
    // Nettoyer l'état
    clearState();
    
    // Activer le bouton d'application de la visualisation
    document.getElementById('apply-visualization').disabled = false;
    
    // Afficher un indicateur de chargement
    const vegaContainer = document.getElementById('vega-visualization');
    if (vegaContainer) {
        vegaContainer.innerHTML = '<div class="loading-indicator">Chargement des données en cours...</div>';
    }
    
    // Essayer d'abord d'utiliser le serveur Node.js local comme proxy
    fetch(`/api/sparql?endpoint=${encodeURIComponent(endpoint)}&query=${encodeURIComponent(query)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Le serveur local n\'est pas disponible. Tentative directe...');
            }
            return response.json();
        })
        .then(data => {
            // Traiter les données SPARQL
            state.sparqlData = data;
            processNewSparqlData();
        })
        .catch(error => {
            console.error('Erreur lors de l\'exécution de la requête SPARQL:', error);
            
            // Tentative directe avec CORS
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
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                state.sparqlData = data;
                processNewSparqlData();
            })
            .catch(finalError => {
                console.error('Erreur lors de la tentative directe:', finalError);
                vegaContainer.innerHTML = `
                    <div class="error">
                        <p>Erreur lors de l'exécution de la requête SPARQL:</p>
                        <p>${finalError.message}</p>
                        <p>Vérifiez l'endpoint et la requête, ou essayez d'activer CORS sur l'endpoint.</p>
                    </div>
                `;
            });
        });
}

/**
 * Traite les nouvelles données SPARQL
 */
function processNewSparqlData() {
    if (!state.sparqlData) return;
    
    // Transformer les données SPARQL en données compatibles avec Vega-Lite
    const vegaData = transformSparqlToVegaData(state.sparqlData);
    
    // Mettre à jour les sélecteurs de champs
    updateFieldSelectors();
    
    // Mettre à jour l'aperçu des données
    updateDataPreview();
    
    // Créer une visualisation par défaut
    createDefaultVisualization(vegaData);
}

/**
 * Met à jour l'aperçu des données
 */
function updateDataPreview() {
    if (!state.sparqlData) {
        console.warn("Aucune donnée SPARQL disponible pour l'aperçu");
        return;
    }
    
    // Afficher les données SPARQL brutes
    const rawDataElement = document.getElementById('raw-sparql-data');
    if (rawDataElement) {
        // Afficher les données SPARQL brutes complètes
        rawDataElement.textContent = JSON.stringify(state.sparqlData, null, 2);
    }
    
    // Transformer et afficher les données transformées
    const transformedData = transformSparqlToVegaData(state.sparqlData);
    const transformedDataElement = document.getElementById('transformed-vega-data');
    if (transformedDataElement) {
        // Afficher toutes les données transformées
        transformedDataElement.textContent = JSON.stringify(transformedData, null, 2);
    }
    
    console.log("Aperçu des données mis à jour avec succès");
}

/**
 * Met à jour les sélecteurs de champs
 */
function updateFieldSelectors() {
    if (!state.sparqlData || !state.sparqlData.head || !state.sparqlData.head.vars) return;
    
    const vars = state.sparqlData.head.vars;
    state.fields = vars;
    
    const xField = document.getElementById('x-field');
    const yField = document.getElementById('y-field');
    const colorField = document.getElementById('color-field');
    
    if (!xField || !yField || !colorField) return;
    
    // Vider les sélecteurs
    xField.innerHTML = '';
    yField.innerHTML = '';
    colorField.innerHTML = '';
    
    // Ajouter une option vide pour le sélecteur de couleur
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '-- Aucun --';
    colorField.appendChild(emptyOption);
    
    // Remplir les sélecteurs avec les variables SPARQL
    vars.forEach((varName, index) => {
        const xOption = document.createElement('option');
        xOption.value = varName;
        xOption.textContent = varName;
        if (index === 0) xOption.selected = true;
        xField.appendChild(xOption);
        
        const yOption = document.createElement('option');
        yOption.value = varName;
        yOption.textContent = varName;
        if (index === 1 && vars.length > 1) yOption.selected = true;
        yField.appendChild(yOption);
        
        const colorOption = document.createElement('option');
        colorOption.value = varName;
        colorOption.textContent = varName;
        colorField.appendChild(colorOption);
    });
}

/**
 * Transforme les données SPARQL en format compatible avec Vega-Lite
 */
function transformSparqlToVegaData(sparqlData) {
    if (!sparqlData || !sparqlData.head || !sparqlData.results || !sparqlData.results.bindings) {
        console.warn("Données SPARQL invalides pour la transformation");
        return [];
    }
    
    const vars = sparqlData.head.vars;
    const bindings = sparqlData.results.bindings;
    
    return bindings.map(binding => {
        const result = {};
        
        vars.forEach(varName => {
            if (binding[varName]) {
                // Adapter le traitement selon le type de la valeur
                switch (binding[varName].type) {
                    case 'uri':
                        result[varName] = extractNameFromURI(binding[varName].value);
                        break;
                    case 'literal':
                        // Convertir en nombre si c'est un nombre
                        if (!isNaN(binding[varName].value)) {
                            result[varName] = parseFloat(binding[varName].value);
                        } else {
                            result[varName] = binding[varName].value;
                        }
                        break;
                    case 'typed-literal':
                        // Traiter selon le datatype
                        if (binding[varName]['datatype'] === 'http://www.w3.org/2001/XMLSchema#integer' ||
                            binding[varName]['datatype'] === 'http://www.w3.org/2001/XMLSchema#decimal' ||
                            binding[varName]['datatype'] === 'http://www.w3.org/2001/XMLSchema#float' ||
                            binding[varName]['datatype'] === 'http://www.w3.org/2001/XMLSchema#double') {
                            result[varName] = parseFloat(binding[varName].value);
                        } else if (binding[varName]['datatype'] === 'http://www.w3.org/2001/XMLSchema#boolean') {
                            result[varName] = binding[varName].value === 'true';
                        } else {
                            result[varName] = binding[varName].value;
                        }
                        break;
                    default:
                        result[varName] = binding[varName].value;
                }
            } else {
                result[varName] = null;
            }
        });
        
        return result;
    });
}

/**
 * Crée une visualisation par défaut
 */
function createDefaultVisualization(data) {
    if (!data || data.length === 0 || !state.fields || state.fields.length < 1) {
        document.getElementById('vega-visualization').innerHTML = '<div class="error">Aucune donnée à visualiser.</div>';
        return;
    }
    
    // Utiliser les deux premiers champs pour X et Y
    const xField = state.fields[0];
    const yField = state.fields.length > 1 ? state.fields[1] : 'count';
    
    // Créer une spécification Vega-Lite basique
    const spec = createVegaLiteSpec(data, {
        x: xField,
        y: yField,
        color: '',
        type: state.currentVisualization,
        aggregate: 'count'
    });
    
    // Rendre la visualisation
    state.vegaSpec = spec;
    renderVegaVisualization();
}

/**
 * Applique la visualisation avec les paramètres actuels
 */
function applyVisualization() {
    if (!state.sparqlData) {
        alert('Aucune donnée SPARQL disponible. Veuillez d\'abord charger des données.');
        return;
    }
    
    // Récupérer les paramètres de visualisation
    const xField = document.getElementById('x-field').value;
    const yField = document.getElementById('y-field').value;
    const colorField = document.getElementById('color-field').value;
    const visType = document.getElementById('visualization-type').value;
    const aggregateType = document.getElementById('aggregate-type').value;
    
    if (!xField) {
        alert('Veuillez sélectionner au moins un champ pour l\'axe X.');
        return;
    }
    
    // MAJ du type de visualisation dans l'état
    state.currentVisualization = visType;
    console.log('Application d\'une visualisation de type:', visType);
    
    // Transformer les données SPARQL
    const data = transformSparqlToVegaData(state.sparqlData);
    
    // Créer la spécification Vega-Lite
    const spec = createVegaLiteSpec(data, {
        x: xField,
        y: yField,
        color: colorField,
        type: visType,
        aggregate: aggregateType
    });
    
    // Mettre à jour l'état et rendre la visualisation
    state.vegaSpec = spec;
    renderVegaVisualization();
}

/**
 * Crée une spécification Vega-Lite
 */
function createVegaLiteSpec(data, params) {
    const { x, y, color, type, aggregate } = params;
    
    console.log('Création d\'une spécification Vega-Lite de type:', type);
    
    // Spécification de base
    const spec = {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        data: { values: data },
        width: 'container',
        height: 400,
        title: `Visualisation ${type} - ${x} vs ${y}`,
        background: '#fff'
    };
    
    // Ajouter le type de visualisation
    switch (type) {
        case 'bar':
            spec.mark = { 
                type: 'bar',
                tooltip: true,
                cornerRadius: 3
            };
            break;
        case 'pie':
            spec.mark = { 
                type: 'arc',
                tooltip: true
            };
            spec.width = 400;
            spec.height = 400;
            break;
        case 'scatter':
            spec.mark = { 
                type: 'point',
                tooltip: true,
                filled: true,
                opacity: 0.7
            };
            break;
        case 'line':
            spec.mark = { 
                type: 'line',
                tooltip: true,
                point: true
            };
            break;
        case 'area':
            spec.mark = { 
                type: 'area',
                tooltip: true,
                line: true,
                point: true
            };
            break;
        case 'heatmap':
            spec.mark = 'rect';
            break;
        case 'network':
            // Pour les réseaux, utiliser une spécification personnalisée
            return createNetworkSpec(data, params);
        default:
            spec.mark = { 
                type: 'bar',
                tooltip: true
            };
    }
    
    // Configurer les encodages
    const encoding = {};
    
    // Encodage X
    encoding.x = {
        field: x,
        type: 'nominal',
        title: x,
        axis: {
            labelAngle: -45
        }
    };
    
    // Encodage Y
    if (y) {
        encoding.y = {
            field: y,
            type: 'quantitative',
            title: y
        };
        
        // Ajouter l'agrégation si spécifiée
        if (aggregate && aggregate !== '') {
            switch (aggregate) {
                case 'count':
                    encoding.y = {
                        aggregate: 'count',
                        title: `Comptage de ${y}`
                    };
                    break;
                case 'sum':
                    encoding.y.aggregate = 'sum';
                    encoding.y.title = `Somme de ${y}`;
                    break;
                case 'average':
                    encoding.y.aggregate = 'mean';
                    encoding.y.title = `Moyenne de ${y}`;
                    break;
                case 'min':
                    encoding.y.aggregate = 'min';
                    encoding.y.title = `Minimum de ${y}`;
                    break;
                case 'max':
                    encoding.y.aggregate = 'max';
                    encoding.y.title = `Maximum de ${y}`;
                    break;
            }
        }
    }
    
    // Cas spécial pour le diagramme circulaire
    if (type === 'pie') {
        encoding.theta = encoding.y;
        delete encoding.y;
        encoding.color = {
            field: x,
            type: 'nominal',
            legend: {
                title: x
            }
        };
    } else {
        // Encodage de la couleur pour les autres types
        if (color && color !== '') {
            encoding.color = {
                field: color,
                type: 'nominal',
                legend: {
                    title: color
                }
            };
        }
    }
    
    spec.encoding = encoding;
    
    return spec;
}

/**
 * Crée une spécification pour un graphe de réseau
 */
function createNetworkSpec(data, params) {
    // Pour un réseau, nous avons besoin de nœuds et de liens
    // Adapter les données SPARQL à ce format
    
    // Exemple simple : considérer le premier champ comme source et le deuxième comme cible
    const { x, y } = params;
    
    // Extraire les nœuds uniques
    const nodeSet = new Set();
    data.forEach(d => {
        if (d[x]) nodeSet.add(d[x]);
        if (d[y]) nodeSet.add(d[y]);
    });
    
    const nodes = Array.from(nodeSet).map(name => ({ id: name }));
    
    // Créer les liens
    const links = data.map(d => ({
        source: d[x],
        target: d[y]
    }));
    
    // Retourner une spécification de force-directed graph pour Vega
    return {
        $schema: 'https://vega.github.io/schema/vega/v5.json',
        width: 800,
        height: 600,
        padding: 0,
        autosize: 'none',
        
        data: [
            {
                name: 'node-data',
                values: nodes,
            },
            {
                name: 'link-data',
                values: links,
            }
        ],
        
        scales: [
            {
                name: 'color',
                type: 'ordinal',
                domain: { data: 'node-data', field: 'id' },
                range: { scheme: 'category20' }
            }
        ],
        
        marks: [
            {
                name: 'nodes',
                type: 'symbol',
                zindex: 1,
                
                from: { data: 'node-data' },
                
                encode: {
                    enter: {
                        fill: { scale: 'color', field: 'id' },
                        stroke: { value: 'white' },
                        strokeWidth: { value: 1 },
                        size: { value: 300 }
                    }
                },
                
                transform: [
                    {
                        type: 'force',
                        iterations: 300,
                        static: false,
                        forces: [
                            { force: 'center', x: { signal: 'width / 2' }, y: { signal: 'height / 2' } },
                            { force: 'collide', radius: 20 },
                            { force: 'nbody', strength: -30 },
                            { force: 'link', links: 'link-data', distance: 100 }
                        ]
                    }
                ]
            },
            {
                name: 'links',
                type: 'path',
                from: { data: 'link-data' },
                encode: {
                    update: {
                        stroke: { value: '#ccc' },
                        strokeWidth: { value: 0.5 }
                    }
                },
                transform: [
                    {
                        type: 'linkpath',
                        shape: 'line',
                        sourceX: { field: 'source.x' },
                        sourceY: { field: 'source.y' },
                        targetX: { field: 'target.x' },
                        targetY: { field: 'target.y' }
                    }
                ]
            },
            {
                name: 'node-labels',
                type: 'text',
                from: { data: 'nodes' },
                encode: {
                    enter: {
                        text: { field: 'datum.id' },
                        fontSize: { value: 10 },
                        fill: { value: 'black' },
                        align: { value: 'center' },
                        baseline: { value: 'middle' },
                        dx: { value: 0 },
                        dy: { value: 15 }
                    }
                }
            }
        ]
    };
}

/**
 * Rend la visualisation Vega-Lite
 */
function renderVegaVisualization() {
    if (!state.vegaSpec) return;
    
    const vegaContainer = document.getElementById('vega-visualization');
    vegaContainer.innerHTML = '';
    
    // Si c'est un graphe réseau, utiliser vegaEmbed directement
    vegaEmbed(vegaContainer, state.vegaSpec, {
        actions: true,
        renderer: 'svg'
    }).then(result => {
        // La visualisation a été rendue avec succès
        console.log('Visualisation Vega-Lite rendue avec succès');
    }).catch(error => {
        console.error('Erreur lors du rendu de la visualisation:', error);
        vegaContainer.innerHTML = `
            <div class="error">
                <p>Erreur lors du rendu de la visualisation:</p>
                <p>${error.message}</p>
            </div>
        `;
    });
}

// Initialiser le visualisateur quand le DOM est chargé
document.addEventListener('DOMContentLoaded', init); 