/**
 * Script pour la page web-components.html
 * Gère les interactions avec les composants Web personnalisés
 */
document.addEventListener('DOMContentLoaded', function() {
    // Récupération des éléments du DOM
    const graph = document.getElementById('metabolite-graph');
    const table = document.getElementById('metabolite-table');
    
    // Initialiser les valeurs d'affichage
    document.getElementById('component-width-value').textContent = 
        graph.getAttribute('width') || '800';
    document.getElementById('component-height-value').textContent = 
        graph.getAttribute('height') || '600';
    
    // Basculer entre graphe et tableau
    document.getElementById('btn-graph').addEventListener('click', function() {
        this.classList.add('active');
        document.getElementById('btn-table').classList.remove('active');
        graph.style.display = 'block';
        table.style.display = 'none';
        document.getElementById('table-controls').style.display = 'none';
    });
    
    document.getElementById('btn-table').addEventListener('click', function() {
        this.classList.add('active');
        document.getElementById('btn-graph').classList.remove('active');
        graph.style.display = 'none';
        table.style.display = 'block';
        document.getElementById('table-controls').style.display = 'block';
    });
    
    // Contrôles de taille communs
    document.getElementById('component-width').addEventListener('input', function() {
        const value = this.value;
        document.getElementById('component-width-value').textContent = value;
        graph.setAttribute('width', value);
        table.setAttribute('width', value);
    });
    
    document.getElementById('component-height').addEventListener('input', function() {
        const value = this.value;
        document.getElementById('component-height-value').textContent = value;
        graph.setAttribute('height', value);
        table.setAttribute('height', value);
    });
    
    // Contrôle spécifique pour l'affichage JSON
    document.getElementById('show-json').addEventListener('change', function() {
        table.setAttribute('show-json', this.checked);
    });
    
    // Gestion des exemples SPARQL
    const exampleLoader = new SparqlExampleLoader();
    const exampleSourceSelect = document.getElementById('example-source');
    const exampleQuerySelect = document.getElementById('example-query');
    const exampleDescription = document.getElementById('example-description');
    
    // Charger les sources d'exemples
    initializeExampleSelector();
    
    // Gestion des changements de source d'exemples
    exampleSourceSelect.addEventListener('change', async function() {
        const source = this.value;
        console.log(`Source sélectionnée: ${source}`);
        
        if (!source) {
            // Réinitialiser le sélecteur d'exemples
            exampleQuerySelect.innerHTML = '<option value="">-- Sélectionner un exemple --</option>';
            exampleDescription.textContent = '';
            return;
        }
        
        // Charger tous les exemples pour cette source
        console.log(`Chargement des exemples pour la source: ${source}`);
        const examples = await exampleLoader.loadAllExamplesForSource(source);
        console.log(`Exemples chargés: ${examples.length}`);
        
        // Mettre à jour le sélecteur d'exemples
        updateExampleQuerySelect(examples);
    });
    
    // Gestion des changements d'exemples
    exampleQuerySelect.addEventListener('change', function() {
        const exampleId = this.value;
        const source = exampleSourceSelect.value;
        
        if (!exampleId || !source) {
            exampleDescription.textContent = '';
            return;
        }
        
        // Trouver l'exemple sélectionné
        const selectedExample = exampleLoader.examplesBySource[source].examples.find(e => e.id === exampleId);
        
        if (selectedExample) {
            // Afficher la description
            exampleDescription.textContent = selectedExample.title;
            
            // Remplir les champs de requête SPARQL
            document.getElementById('endpoint-url').value = selectedExample.endpoint;
            document.getElementById('query-input').value = selectedExample.query;
            
            // Configurer directement le composant graphe
            graph.sparqlEndpoint = selectedExample.endpoint;
            graph.sparqlQuery = selectedExample.query;
            // Le proxy reste celui configuré par l'utilisateur
            
            // Mettre en évidence le bouton d'exécution
            const executeButton = document.getElementById('execute-query');
            executeButton.classList.add('highlight');
            setTimeout(() => executeButton.classList.remove('highlight'), 2000);
        }
    });
    
    // Gestion des requêtes SPARQL
    const endpointInput = document.getElementById('endpoint-url');
    const proxyInput = document.getElementById('proxy-url');
    const queryInput = document.getElementById('query-input');
    const executeButton = document.getElementById('execute-query');
    const clearButton = document.getElementById('clear-results');
    const queryStatus = document.getElementById('query-status');
    const rawDataPreview = document.getElementById('raw-data');
    const transformedDataPreview = document.getElementById('transformed-data');
    
    // Exécuter la requête SPARQL
    executeButton.addEventListener('click', async function() {
        // Récupérer les valeurs des champs
        const endpoint = endpointInput.value.trim();
        const proxyUrl = proxyInput.value.trim();
        const query = queryInput.value.trim();
        
        // Vérifier que les champs obligatoires ne sont pas vides
        if (!endpoint || !query) {
            queryStatus.textContent = 'Veuillez remplir l\'endpoint et la requête (le proxy est optionnel)';
            queryStatus.className = 'status-message status-error';
            return;
        }
        
        // Afficher l'état de chargement
        queryStatus.textContent = 'Chargement des données...';
        queryStatus.className = 'status-message status-loading';
        
        try {
            // Configurer le composant avec les nouvelles propriétés
            graph.sparqlEndpoint = endpoint;
            graph.sparqlQuery = query;
            graph.sparqlProxy = proxyUrl || null;
            
            // Exécuter la requête SPARQL
            const result = await graph.setSparqlQuery();
            
            if (result.status === 'success') {
                queryStatus.textContent = result.message;
                queryStatus.className = 'status-message status-success';
                
                // Mettre à jour les aperçus de données
                updateDataPreviews(result.rawData, result.data);
                
                // Transformer les données SPARQL pour le tableau
                if (result.rawData && result.rawData.results && result.rawData.results.bindings) {
                    const tableData = result.rawData.results.bindings.map(binding => {
                        const row = {};
                        Object.keys(binding).forEach(key => {
                            row[key] = binding[key].value;
                        });
                        return row;
                    });
                    // Mettre à jour le tableau avec les données transformées
                    table.setData(tableData);
                }
            } else {
                queryStatus.textContent = result.message;
                queryStatus.className = 'status-message status-error';
            }
        } catch (error) {
            queryStatus.textContent = `Erreur: ${error.message}`;
            queryStatus.className = 'status-message status-error';
        }
    });
    
    // Effacer les résultats
    clearButton.addEventListener('click', function() {
        // Réinitialiser les composants
        graph.setData([], []);
        table.setData([]);
        
        // Réinitialiser les aperçus
        rawDataPreview.textContent = '// Aucune donnée SPARQL. Exécutez une requête pour voir les résultats.';
        transformedDataPreview.textContent = '// Aucune donnée transformée. Exécutez une requête d\'abord.';
        
        // Réinitialiser le statut
        queryStatus.textContent = '';
        queryStatus.className = 'status-message';
    });
    
    // Fonction pour mettre à jour les aperçus de données
    function updateDataPreviews(rawData, transformedData) {
        if (rawData) {
            // Afficher les données SPARQL brutes complètes
            rawDataPreview.textContent = JSON.stringify(rawData, null, 2);
        }
        
        if (transformedData) {
            // Afficher toutes les données transformées
            transformedDataPreview.textContent = JSON.stringify(transformedData, null, 2);
        }
    }
    
    // Fonction pour initialiser le sélecteur d'exemples
    async function initializeExampleSelector() {
        try {
            console.log("Initialisation du sélecteur d'exemples...");
            // Charger la liste des exemples
            const result = await exampleLoader.loadExamplesList();
            console.log("Résultat du chargement des exemples:", result);
            
            // Remplir le sélecteur de sources
            const sources = Object.keys(exampleLoader.examplesBySource);
            sources.sort();
            console.log("Sources disponibles:", sources);
            
            let sourceOptions = '<option value="">-- Sélectionner une source --</option>';
            sources.forEach(source => {
                const examplesCount = exampleLoader.examplesBySource[source]?.examples?.length || 0;
                console.log(`Source ${source}: ${examplesCount} exemples`);
                if (examplesCount > 0) {
                    sourceOptions += `<option value="${source}">${source} (${examplesCount})</option>`;
                }
            });
            
            exampleSourceSelect.innerHTML = sourceOptions;
            console.log("Sélecteur de sources mis à jour");
            
            // Si Bgee est disponible, le sélectionner par défaut
            if (exampleLoader.examplesBySource['Bgee'] && 
                exampleLoader.examplesBySource['Bgee'].examples.length > 0) {
                console.log("Sélection de Bgee par défaut");
                exampleSourceSelect.value = 'Bgee';
                exampleSourceSelect.dispatchEvent(new Event('change'));
            }
        } catch (error) {
            console.error('Erreur lors de l\'initialisation du sélecteur d\'exemples:', error);
        }
    }
    
    // Fonction pour mettre à jour le sélecteur d'exemples
    function updateExampleQuerySelect(examples) {
        let options = '<option value="">-- Sélectionner un exemple --</option>';
        
        examples.forEach(example => {
            const shortTitle = example.title.length > 60 
                ? example.title.substring(0, 57) + '...' 
                : example.title;
            options += `<option value="${example.id}">${example.id.split('-')[1]}: ${shortTitle}</option>`;
        });
        
        exampleQuerySelect.innerHTML = options;
    }
}); 