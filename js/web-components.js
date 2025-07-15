/**
 * Script pour la page web-components.html
 * Gère les interactions avec les composants Web personnalisés
 */
document.addEventListener('DOMContentLoaded', function() {
    // Récupération des éléments du DOM
    const graph = document.getElementById('metabolite-graph');
    const table = document.getElementById('metabolite-table');
    const visualMappingTextarea = document.getElementById('visual-mapping-input');
    const applyMappingBtn = document.getElementById('apply-mapping-btn');
    const removeMappingBtn = document.getElementById('remove-mapping-btn');
    
    // Nouveaux éléments pour la comparaison d'encodings
    const baseEncodingPreview = document.getElementById('base-encoding');
    const currentEncodingPreview = document.getElementById('current-encoding');
    const resetToBaseEncodingBtn = document.getElementById('reset-to-base-encoding');
    const copyCurrentEncodingBtn = document.getElementById('copy-current-encoding');
    
    // Variable pour stocker l'encoding de base
    let baseEncoding = null;
    
    // Initialiser les valeurs d'affichage
    document.getElementById('component-width-value').textContent = 
        graph.getAttribute('width') || '800';
    document.getElementById('component-height-value').textContent = 
        graph.getAttribute('height') || '600';
    
    // Remplir la zone de texte de l'encoding visuel avec la configuration par défaut au chargement
    if (visualMappingTextarea) {
        visualMappingTextarea.value = JSON.stringify(graph.getEncoding(), null, 2);
    }
    
    // === GESTION DES ENCODINGS ===
    
    // Fonction pour mettre à jour les aperçus d'encoding (SANS modifier la textarea)77
    function updateEncodingPreviews() {
        const currentEncoding = graph.getEncoding();
        
        // Mettre à jour l'aperçu de l'encoding actuel
        if (currentEncodingPreview) {
            currentEncodingPreview.textContent = JSON.stringify(currentEncoding, null, 2);
        }
        
        // Mettre à jour l'aperçu de l'encoding de base (s'il existe)
        if (baseEncoding && baseEncodingPreview) {
            baseEncodingPreview.textContent = JSON.stringify(baseEncoding, null, 2);
        }
        
        // IMPORTANTE: NE PAS modifier la textarea ici - elle garde son comportement original
    }
    
    // Fonction pour sauvegarder l'encoding de base
    function saveBaseEncoding() {
        baseEncoding = JSON.parse(JSON.stringify(graph.getEncoding())); // Copie profonde
        console.log('[web-components] 📋 Encoding de base sauvegardé:', baseEncoding);
        
        if (baseEncodingPreview) {
            baseEncodingPreview.textContent = JSON.stringify(baseEncoding, null, 2);
        }
    }
    
    // Fonction pour réinitialiser l'encoding
    function resetEncoding() {
        console.log('[web-components] 🔄 Reset de l\'encoding...');
        
        // Remettre à null pour forcer la régénération automatique
        graph.encoding = null;
        baseEncoding = null;
        
        // Réinitialiser les aperçus
        if (baseEncodingPreview) {
            baseEncodingPreview.textContent = '// Encoding de base non disponible. Exécutez une requête d\'abord.';
        }
        if (currentEncodingPreview) {
            currentEncodingPreview.textContent = '// Encoding actuel non disponible. Exécutez une requête d\'abord.';
        }
        
        // COMPORTEMENT ORIGINAL: Mettre à jour la textarea avec l'encoding par défaut
        if (visualMappingTextarea) {
            visualMappingTextarea.value = JSON.stringify(graph.getDefaultEncoding(), null, 2);
        }
    }
    
    // Gestionnaires pour les nouveaux boutons
    if (resetToBaseEncodingBtn) {
        resetToBaseEncodingBtn.addEventListener('click', function() {
            if (baseEncoding) {
                graph.encoding = JSON.parse(JSON.stringify(baseEncoding)); // Copie profonde
                
                // COMPORTEMENT ORIGINAL: Mettre à jour la textarea
                if (visualMappingTextarea) {
                    visualMappingTextarea.value = JSON.stringify(baseEncoding, null, 2);
                }
                
                // Mettre à jour les aperçus
                updateEncodingPreviews();
                
                queryStatus.textContent = 'Encoding de base restauré.';
                queryStatus.className = 'status-message status-success';
                console.log('[web-components] 🔄 Encoding de base restauré');
            } else {
                queryStatus.textContent = 'Aucun encoding de base disponible. Exécutez une requête d\'abord.';
                queryStatus.className = 'status-message status-error';
            }
        });
    }
    
    if (copyCurrentEncodingBtn) {
        copyCurrentEncodingBtn.addEventListener('click', async function() {
            try {
                const currentEncoding = graph.getEncoding();
                const encodingText = JSON.stringify(currentEncoding, null, 2);
                await navigator.clipboard.writeText(encodingText);
                queryStatus.textContent = 'Encoding actuel copié dans le presse-papiers.';
                queryStatus.className = 'status-message status-success';
                console.log('[web-components] 📋 Encoding copié');
            } catch (error) {
                console.error('Erreur lors de la copie:', error);
                queryStatus.textContent = 'Erreur lors de la copie dans le presse-papiers.';
                queryStatus.className = 'status-message status-error';
            }
        });
    }
    
    // Écouteur pour la mise à jour automatique de la textarea après calcul des domaines
    graph.addEventListener('domainsCalculated', function(event) {
        console.log('[web-components] 🎯 Domaines recalculés automatiquement, mise à jour de la textarea ET des aperçus');
        
        // COMPORTEMENT ORIGINAL: Mettre à jour la textarea avec l'encoding réel
        if (visualMappingTextarea) {
            visualMappingTextarea.value = JSON.stringify(event.detail.encoding, null, 2);
            
            // Notification visuelle que la textarea a été mise à jour
            visualMappingTextarea.style.borderColor = '#28a745';
            setTimeout(() => {
                visualMappingTextarea.style.borderColor = '';
            }, 1000);
        }
        
        // Mettre à jour aussi les aperçus
        updateEncodingPreviews();
    });
    
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
            
            // Configurer directement le composant graphe avec les nouvelles propriétés
            graph.sparqlEndpoint = selectedExample.endpoint;
            graph.sparqlQuery = selectedExample.query;
            // Le proxy reste celui configuré par l'utilisateur dans le champ
            
            // RESET ENCODING lors du changement d'exemple (préparation pour nouveau chargement)
            console.log('[web-components] 🔄 Nouvel exemple sélectionné - Préparation du reset encoding');
            // Note : le reset complet sera fait lors du clic sur "Exécuter"
            
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
    
    // Appliquer l'encoding visuel personnalisé
    applyMappingBtn.addEventListener('click', function() {
        try {
            const encodingConfig = JSON.parse(visualMappingTextarea.value);
            graph.encoding = encodingConfig;
            
            // Mettre à jour les aperçus d'encoding
            updateEncodingPreviews();
            
            queryStatus.textContent = 'Nouvel encoding visuel appliqué.';
            queryStatus.className = 'status-message status-success';
            console.log("🎨 Custom visual encoding applied from textarea.");
        } catch (error) {
            queryStatus.textContent = `Erreur dans le JSON de l'encoding: ${error.message}`;
            queryStatus.className = 'status-message status-error';
            console.error("Error parsing visual encoding JSON:", error);
        }
    });

    // Retirer l'encoding visuel personnalisé et revenir au défaut adaptatif
    removeMappingBtn.addEventListener('click', function() {
        // Remettre à null pour forcer la régénération de l'encoding adaptatif
        graph.encoding = null;
        
        // Régénérer l'encoding adaptatif en relançant la transformation
        if (graph.sparqlData) {
            graph.launch().then(() => {
                // COMPORTEMENT ORIGINAL: Mettre à jour la textarea avec l'encoding adaptatif généré
                const adaptiveMapping = graph.getEncoding();
                visualMappingTextarea.value = JSON.stringify(adaptiveMapping, null, 2);
                
                // Mettre à jour les aperçus d'encoding
                updateEncodingPreviews();
                
                queryStatus.textContent = 'Encoding visuel adaptatif restauré.';
                queryStatus.className = 'status-message status-success';
                console.log("🎨 Adaptive visual encoding restored.");
            });
        } else {
            // Si pas de données, utiliser l'encoding par défaut
            const defaultMapping = graph.getDefaultEncoding();
            visualMappingTextarea.value = JSON.stringify(defaultMapping, null, 2);
            
            // Mettre à jour les aperçus
            updateEncodingPreviews();
            
            queryStatus.textContent = 'Encoding visuel par défaut restauré (aucune donnée).';
            queryStatus.className = 'status-message status-success';
        }
    });
    
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
        
        // RESET ENCODING à chaque nouvelle requête
        console.log('[web-components] 🔄 Nouveau chargement détecté - Reset de l\'encoding');
        resetEncoding();
        
        // Afficher l'état de chargement
        queryStatus.textContent = 'Chargement des données...';
        queryStatus.className = 'status-message status-loading';
        
        try {
            // Configurer le composant avec les nouvelles propriétés
            graph.sparqlEndpoint = endpoint;
            graph.sparqlQuery = query;
            graph.proxy = proxyUrl || null; // Utilise l'alias 'proxy'
            
            // Lancer la visualisation avec la nouvelle méthode unifiée
            const result = await graph.launch();
            
            if (result.status === 'success') {
                queryStatus.textContent = result.message;
                queryStatus.className = 'status-message status-success';
                
                // SAUVEGARDER L'ENCODING DE BASE (généré automatiquement)
                saveBaseEncoding();
                
                // COMPORTEMENT ORIGINAL: Mettre à jour l'encoding dans la textarea avec l'encoding adaptatif réellement utilisé
                const currentEncoding = graph.getEncoding();
                visualMappingTextarea.value = JSON.stringify(currentEncoding, null, 2);
                
                // Mettre à jour les aperçus d'encoding
                updateEncodingPreviews();
                
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
        graph.nodes = [];
        graph.links = [];
        table.setData([]);
        
        // Effacer les données SPARQL pour forcer un retour à l'encoding par défaut
        graph.sparqlData = null;
        graph.encoding = null;
        
        // RESET complet des encodings
        resetEncoding();
        
        // Réinitialiser les aperçus de données
        rawDataPreview.textContent = '// Aucune donnée SPARQL. Exécutez une requête pour voir les résultats.';
        transformedDataPreview.textContent = '// Aucune donnée transformée. Exécutez une requête d\'abord.';
        
        // Réinitialiser le statut
        queryStatus.textContent = '';
        queryStatus.className = 'status-message';
        
        // Relancer le rendu avec des données vides
        graph.launch().catch(() => {
            // Si launch() échoue avec des données vides, on fait un rendu direct
            graph.render();
        });
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