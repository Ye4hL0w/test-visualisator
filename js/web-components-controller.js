/**
 * Contrôleur pour la page des composants web
 */

// Initialisation du contrôleur
document.addEventListener('DOMContentLoaded', function() {
    initVisualizationControls();
    
    // Vérifier la source de données sélectionnée par défaut
    const dataSource = document.getElementById('data-source').value;
    if (dataSource === 'sparql') {
        document.getElementById('sparql-inputs').style.display = 'block';
        // Auto-exécuter la requête SPARQL si elle est disponible
        autoExecuteSparqlQuery();
    } else {
        loadSampleData();
    }
});

/**
 * Auto-exécute la requête SPARQL si l'endpoint et la requête sont disponibles
 */
function autoExecuteSparqlQuery() {
    const endpoint = document.getElementById('sparql-endpoint').value;
    const query = document.getElementById('sparql-query').value;
    
    if (endpoint && query) {
        // Récupérer le composant de visualisation actif
        const activeVisType = document.querySelector('.vis-type-btn.active').id.replace('btn-', '');
        const visComponent = getVisualizationComponent(activeVisType);
        
        if (visComponent) {
            // Définir les champs pour le type de visualisation
            if (activeVisType === 'graph') {
                visComponent.setAttribute('source-field', 'metabolite');
                visComponent.setAttribute('target-field', 'enzyme');
                document.getElementById('graph-source-field').value = 'metabolite';
                document.getElementById('graph-target-field').value = 'enzyme';
            } else if (activeVisType === 'barchart') {
                visComponent.setAttribute('x-field', 'metabolite');
                visComponent.setAttribute('y-field', 'enzyme');
                document.getElementById('barchart-x-field').value = 'metabolite';
                document.getElementById('barchart-y-field').value = 'enzyme';
            }
            
            // Exécuter la requête
            visComponent.setQuery(query, endpoint);
        }
    }
}

/**
 * Initialise tous les contrôles de visualisation
 */
function initVisualizationControls() {
    // Gestion des boutons de type de visualisation
    document.querySelectorAll('.vis-type-btn').forEach(button => {
        button.addEventListener('click', function() {
            // Désactiver tous les boutons
            document.querySelectorAll('.vis-type-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Activer le bouton cliqué
            this.classList.add('active');
            
            // Masquer tous les panneaux de contrôle
            document.querySelectorAll('.control-panel').forEach(panel => {
                panel.style.display = 'none';
            });
            
            // Masquer tous les composants de visualisation
            hideAllVisualizations();
            
            // Afficher le panneau et le composant correspondant au bouton
            const visType = this.id.replace('btn-', '');
            
            // Afficher les contrôles spécifiques
            const controlPanel = document.getElementById(visType + '-controls');
            if (controlPanel) {
                controlPanel.style.display = 'block';
            }
            
            // Afficher la visualisation sélectionnée
            showVisualization(visType);
        });
    });
    
    // Gestion de la source de données
    document.getElementById('data-source').addEventListener('change', function() {
        if (this.value === 'sparql') {
            document.getElementById('sparql-inputs').style.display = 'block';
        } else {
            document.getElementById('sparql-inputs').style.display = 'none';
            loadSampleData(); // Charger les données d'exemple
        }
    });
    
    // Contrôles pour le diagramme à barres
    initBarchartControls();
    
    // Contrôles pour le graphe
    initGraphControls();
    
    // Exécution de la requête SPARQL
    document.getElementById('execute-query').addEventListener('click', function() {
        const endpoint = document.getElementById('sparql-endpoint').value;
        const query = document.getElementById('sparql-query').value;
        
        if (!endpoint || !query) {
            alert('Veuillez fournir un endpoint SPARQL et une requête valide.');
            return;
        }
        
        // Récupérer le composant de visualisation actif
        const activeVisType = document.querySelector('.vis-type-btn.active').id.replace('btn-', '');
        const visComponent = getVisualizationComponent(activeVisType);
        
        if (visComponent) {
            visComponent.setQuery(query, endpoint);
        }
    });
}

/**
 * Initialise les contrôles pour le diagramme à barres
 */
function initBarchartControls() {
    // Sliders pour la taille du barchart
    document.getElementById('barchart-width').addEventListener('input', function() {
        const value = this.value;
        document.getElementById('barchart-width-value').textContent = value;
        const barchart = document.getElementById('vis-barchart-component');
        if (barchart) {
            barchart.setAttribute('width', value);
        }
    });
    
    document.getElementById('barchart-height').addEventListener('input', function() {
        const value = this.value;
        document.getElementById('barchart-height-value').textContent = value;
        const barchart = document.getElementById('vis-barchart-component');
        if (barchart) {
            barchart.setAttribute('height', value);
        }
    });
    
    // Champs X et Y
    document.getElementById('barchart-x-field').addEventListener('change', function() {
        const barchart = document.getElementById('vis-barchart-component');
        if (barchart && this.value) {
            barchart.setAttribute('x-field', this.value);
        }
    });
    
    document.getElementById('barchart-y-field').addEventListener('change', function() {
        const barchart = document.getElementById('vis-barchart-component');
        if (barchart && this.value) {
            barchart.setAttribute('y-field', this.value);
        }
    });
}

/**
 * Initialise les contrôles pour le graphe
 */
function initGraphControls() {
    // Sliders pour la taille du graphe
    document.getElementById('graph-width').addEventListener('input', function() {
        const value = this.value;
        document.getElementById('graph-width-value').textContent = value;
        const graph = document.getElementById('vis-graph-component');
        if (graph) {
            graph.setAttribute('width', value);
        }
    });
    
    document.getElementById('graph-height').addEventListener('input', function() {
        const value = this.value;
        document.getElementById('graph-height-value').textContent = value;
        const graph = document.getElementById('vis-graph-component');
        if (graph) {
            graph.setAttribute('height', value);
        }
    });
    
    // Champs source et target
    document.getElementById('graph-source-field').addEventListener('change', function() {
        const graph = document.getElementById('vis-graph-component');
        if (graph && this.value) {
            graph.setAttribute('source-field', this.value);
        }
    });
    
    document.getElementById('graph-target-field').addEventListener('change', function() {
        const graph = document.getElementById('vis-graph-component');
        if (graph && this.value) {
            graph.setAttribute('target-field', this.value);
        }
    });
}

/**
 * Charge les données d'exemple
 */
function loadSampleData() {
    // Utiliser les données d'exemple du fichier sample-data.js
    if (window.SAMPLE_SPARQL_DATA) {
        // Récupérer le composant de visualisation actif
        const activeVisType = document.querySelector('.vis-type-btn.active').id.replace('btn-', '');
        const visComponent = getVisualizationComponent(activeVisType);
        
        if (visComponent) {
            visComponent.setSparqlResults(window.SAMPLE_SPARQL_DATA);
        }
    }
}

/**
 * Masque toutes les visualisations
 */
function hideAllVisualizations() {
    // Masquer tous les composants de visualisation
    document.querySelectorAll('#visualization-container > *').forEach(component => {
        component.style.display = 'none';
    });
}

/**
 * Affiche la visualisation sélectionnée
 */
function showVisualization(type) {
    switch (type) {
        case 'barchart':
            const barchart = document.getElementById('vis-barchart-component');
            if (barchart) {
                barchart.style.display = 'block';
                // Si des données sont déjà chargées, elles seront affichées
            }
            break;
            
        case 'graph':
            const graph = document.getElementById('vis-graph-component');
            if (graph) {
                graph.style.display = 'block';
                // Si des données sont déjà chargées, elles seront affichées
            }
            break;
            
        case 'scatter':
            alert('Le composant de visualisation Nuage de points sera implémenté prochainement');
            break;
            
        case 'heatmap':
            alert('Le composant de visualisation Carte de chaleur sera implémenté prochainement');
            break;
    }
    
    // Si une source de données est sélectionnée, charger les données appropriées
    const dataSource = document.getElementById('data-source').value;
    if (dataSource === 'sample') {
        loadSampleData();
    } else if (dataSource === 'sparql') {
        // Exécuter la requête SPARQL si disponible
        autoExecuteSparqlQuery();
    }
}

/**
 * Récupère le composant de visualisation actif
 */
function getVisualizationComponent(type) {
    switch (type) {
        case 'barchart':
            return document.getElementById('vis-barchart-component');
        case 'graph':
            return document.getElementById('vis-graph-component');
        case 'scatter':
        case 'heatmap':
            // À implémenter quand les composants seront créés
            return null;
    }
    return null;
} 