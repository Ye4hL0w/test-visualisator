/**
 * Script pour la page web-components.html
 * Gère les interactions avec les composants Web personnalisés
 */
document.addEventListener('DOMContentLoaded', function() {
    // Récupération des éléments du DOM
    const graph = document.getElementById('metabolite-graph');
    const table = document.getElementById('metabolite-table');
    const visualMappingTextarea = document.getElementById('visual-mapping-input');
    const encodingPresetsSelect = document.getElementById('encoding-presets');
    const refreshPresetsBtn = document.getElementById('refresh-presets-btn');
    const applyMappingBtn = document.getElementById('apply-mapping-btn');
    const removeMappingBtn = document.getElementById('remove-mapping-btn');
    
    // Nouveaux éléments pour la comparaison d'encodings
    const baseEncodingPreview = document.getElementById('base-encoding');
    const currentEncodingPreview = document.getElementById('current-encoding');
    const resetToBaseEncodingBtn = document.getElementById('reset-to-base-encoding');
    const copyCurrentEncodingBtn = document.getElementById('copy-current-encoding');
    const queryStatus = document.getElementById('query-status');
    
    // Variable pour stocker l'encoding de base
    let baseEncoding = null;
    
    // Presets d'encoding chargés dynamiquement depuis les fichiers
    let encodingPresets = {};
    
    // Initialiser les valeurs d'affichage
    document.getElementById('component-width-value').textContent = 
        graph.getAttribute('width') || '800';
    document.getElementById('component-height-value').textContent = 
        graph.getAttribute('height') || '600';
    
    // Remplir la zone de texte de l'encoding visuel avec la configuration par défaut au chargement
    if (visualMappingTextarea) {
        visualMappingTextarea.value = JSON.stringify(graph.getEncoding(), null, 2);
    }
    
    // Liste des fichiers d'encoding détectés automatiquement
    // 📁 DÉTECTION AUTOMATIQUE COMPLÈTE:
    // 1. Créez n'importe quel fichier .json ou .txt dans example-encoding/
    // 2. Le système teste automatiquement des centaines de patterns courants
    // 3. Cliquez sur 🔄 pour actualiser si vous ajoutez un fichier
    // 
    // 📝 PATTERNS AUTOMATIQUEMENT TESTÉS:
    // - test-* (test-size.json, test-cooccurence.json, etc.)
    // - encoding-* (encoding-basic.json, encoding-demo.json, etc.)
    // - Patterns numériques: preset1.json, config2.json, etc.
    // - Patterns alphabétiques: a.json, b.json, etc.
    // - Patterns thématiques: bio-genes.json, social-network.json, etc.
    let encodingFiles = [];
    
    // 🔧 Pour ajouter vos propres patterns de recherche, modifiez cette liste:
    const customPatterns = [
        // Ajoutez ici vos patterns personnalisés (sans extension)
        // Exemple: 'mon-preset', 'config-special', 'encoding-perso'
    ];
    
    // Fonction pour recharger les presets (utile après ajout de nouveaux fichiers)
    async function refreshEncodingPresets() {
        // console.log('[web-components] 🔄 Actualisation des presets d\'encoding...');
        
        // Vider les presets existants
        encodingPresets = {};
        
        // Recharger depuis les fichiers
        await initializeEncodingPresets();
        
        // Notifier l'utilisateur
        if (queryStatus) {
            queryStatus.textContent = `Presets actualisés: ${Object.keys(encodingPresets).length} fichier(s) trouvé(s)`;
            queryStatus.className = 'status-message status-success';
            
            setTimeout(() => {
                queryStatus.textContent = '';
                queryStatus.className = 'status-message';
            }, 3000);
        }
    }
    
    // Fonction pour découvrir automatiquement TOUS les fichiers d'encoding du dossier
    async function discoverEncodingFiles() {
        // console.log('[web-components] 🔍 Découverte automatique COMPLÈTE des fichiers d\'encoding...');
        
        const discoveredFiles = [];
        
        // STRATÉGIE 1: Patterns de noms communs pour encoding
        const commonPatterns = [
            // Patterns test-*
            'test-size', 'test-cooccurence', 'test-warn-nodes', 'test-no-colors',
            'test-palette-in-array'
        ];
        
        // Extensions à tester
        const extensions = ['.json', '.txt'];
        
        // OPTIMISATION: Créer toutes les combinaisons à tester d'un coup
        const allTestFiles = [];
        
        // Ajouter patterns communs
        for (const pattern of commonPatterns) {
            for (const ext of extensions) {
                allTestFiles.push(pattern + ext);
            }
        }
        
        // Ajouter patterns numériques
        const numericPatterns = ['preset', 'encoding', 'config', 'test'];
        for (const base of numericPatterns) {
            for (let i = 1; i <= 10; i++) {
                for (const ext of extensions) {
                    allTestFiles.push(`${base}${i}${ext}`);
                }
            }
        }
        
        // Ajouter patterns alphabétiques
        for (let charCode = 97; charCode <= 122; charCode++) { // a-z
            const letter = String.fromCharCode(charCode);
            for (const ext of extensions) {
                allTestFiles.push(letter + ext);
            }
        }
        
        // console.log(`[web-components] 🔍 Test en parallèle de ${allTestFiles.length} fichiers potentiels...`);
        
        // EXÉCUTION EN PARALLÈLE de tous les tests (beaucoup plus rapide)
        const testPromises = allTestFiles.map(async (filename) => {
            try {
                const response = await fetch(`../example-encoding/${filename}`, { 
                    method: 'HEAD' // Plus efficace pour juste tester l'existence
                });
                if (response.ok) {
                    // console.log(`[web-components] ✅ Fichier découvert: ${filename}`);
                    return filename;
                }
            } catch (error) {
                // Fichier n'existe pas, c'est normal
            }
            return null;
        });
        
        // Attendre tous les tests en parallèle
        const testResults = await Promise.all(testPromises);
        
        // Garder seulement les fichiers qui existent
        discoveredFiles.push(...testResults.filter(filename => filename !== null));
        
        // Supprimer les doublons et trier par nom
        const uniqueFiles = [...new Set(discoveredFiles)].sort();
        
        encodingFiles = uniqueFiles;
        
        // console.log(`[web-components] 🎉 DÉCOUVERTE TERMINÉE !`);
        // console.log(`[web-components] 📋 ${uniqueFiles.length} fichiers d'encoding trouvés sur ${allTestFiles.length} testés:`);
        // uniqueFiles.forEach((file, index) => {
        //     console.log(`[web-components]   ${index + 1}. ${file}`);
        // });
        
        // if (uniqueFiles.length === 0) {
        //     console.log(`[web-components] 💡 Aucun fichier trouvé. Créez des fichiers .json ou .txt dans example-encoding/`);
        // }
        
        return uniqueFiles;
    }

    // Fonction pour charger dynamiquement les presets depuis les fichiers découverts
    async function loadEncodingPresets() {
        // console.log('[web-components] 🔄 Chargement des presets d\'encoding depuis les fichiers...');
        
        // D'abord découvrir les fichiers disponibles
        await discoverEncodingFiles();
        
        for (const filename of encodingFiles) {
            try {
                const response = await fetch(`../example-encoding/${filename}`);
                if (response.ok) {
                    const content = await response.text();
                    
                    // Parser le JSON du fichier
                    let encoding;
                    try {
                        encoding = JSON.parse(content);
                    } catch (parseError) {
                        console.warn(`[web-components] ⚠️ Erreur de parsing JSON pour ${filename}:`, parseError);
                        continue;
                    }
                    
                    // Créer l'identifiant du preset à partir du nom de fichier (sans extension)
                    const presetKey = filename.replace(/\.(txt|json)$/, '');
                    
                    // Générer un nom lisible
                    const presetName = presetKey
                        .replace(/-/g, ' ')
                        .replace(/\b\w/g, l => l.toUpperCase());
                    
                    // Stocker le preset
                    encodingPresets[presetKey] = {
                        name: presetName,
                        filename: filename,
                        encoding: encoding,
                        description: encoding.description || `Preset ${presetName}`
                    };
                    
                    // console.log(`[web-components] ✅ Preset "${presetName}" chargé depuis ${filename}`);
                } else {
                    console.warn(`[web-components] ⚠️ Impossible de charger ${filename}: ${response.status}`);
                }
            } catch (error) {
                console.warn(`[web-components] ⚠️ Erreur lors du chargement de ${filename}:`, error);
            }
        }
        
        // console.log(`[web-components] 📋 ${Object.keys(encodingPresets).length} presets chargés:`, Object.keys(encodingPresets));
    }
    
    // Initialiser le sélecteur de presets d'encoding
    async function initializeEncodingPresets() {
        if (!encodingPresetsSelect) return;
        
        // Charger les presets depuis les fichiers
        await loadEncodingPresets();
        
        // Vider les options existantes (sauf la première)
        encodingPresetsSelect.innerHTML = '<option value="">-- Sélectionner un preset --</option>';
        
        // Ajouter les options des presets chargés
        Object.keys(encodingPresets).forEach(presetKey => {
            const preset = encodingPresets[presetKey];
            const option = document.createElement('option');
            option.value = presetKey;
            option.textContent = preset.name;
            option.title = preset.description; // Tooltip avec description
            encodingPresetsSelect.appendChild(option);
        });
        
        // console.log(`[web-components] 🎨 Sélecteur d'encoding initialisé avec ${Object.keys(encodingPresets).length} presets`);
    }
    
    // Gestionnaire pour le changement de preset d'encoding
    if (encodingPresetsSelect) {
        encodingPresetsSelect.addEventListener('change', function() {
            const selectedPresetKey = this.value;
            
            if (!selectedPresetKey) {
                return; // Aucun preset sélectionné
            }
            
            const selectedPreset = encodingPresets[selectedPresetKey];
            if (selectedPreset && visualMappingTextarea) {
                // Charger l'encoding du preset dans la textarea
                visualMappingTextarea.value = JSON.stringify(selectedPreset.encoding, null, 2);
                
                // Notification visuelle que la textarea a été mise à jour
                visualMappingTextarea.style.borderColor = '#007cba';
                setTimeout(() => {
                    visualMappingTextarea.style.borderColor = '';
                }, 1000);
                
                // Mettre à jour le statut
                if (queryStatus) {
                    queryStatus.textContent = `Preset "${selectedPreset.name}" chargé dans la configuration.`;
                    queryStatus.className = 'status-message status-success';
                    
                    // Effacer le message après un délai
                    setTimeout(() => {
                        queryStatus.textContent = '';
                        queryStatus.className = 'status-message';
                    }, 3000);
                }
                
                // console.log(`[web-components] 🎨 Preset "${selectedPreset.name}" chargé dans la textarea`);
            }
        });
    }
    
    // Gestionnaire pour le bouton d'actualisation des presets
    if (refreshPresetsBtn) {
        refreshPresetsBtn.addEventListener('click', async function() {
            // console.log('[web-components] 🔄 Actualisation manuelle des presets demandée');
            
            // Animation du bouton
            this.style.transform = 'rotate(180deg)';
            this.disabled = true;
            
            try {
                await refreshEncodingPresets();
            } catch (error) {
                console.error('[web-components] ❌ Erreur lors de l\'actualisation:', error);
                if (queryStatus) {
                    queryStatus.textContent = `Erreur lors de l'actualisation: ${error.message}`;
                    queryStatus.className = 'status-message status-error';
                }
            } finally {
                // Remettre le bouton en état normal
                setTimeout(() => {
                    this.style.transform = '';
                    this.disabled = false;
                }, 500);
            }
        });
    }
    
    // Initialiser les presets (asynchrone)
    initializeEncodingPresets().catch(error => {
        console.error('[web-components] ❌ Erreur lors de l\'initialisation des presets:', error);
    });
    
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
        // console.log('[web-components] 📋 Encoding de base sauvegardé:', baseEncoding);
        
        if (baseEncodingPreview) {
            baseEncodingPreview.textContent = JSON.stringify(baseEncoding, null, 2);
        }
    }
    
    // Fonction pour réinitialiser l'encoding
    function resetEncoding() {
        // console.log('[web-components] 🔄 Reset de l\'encoding...');
        
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
                // console.log('[web-components] 🔄 Encoding de base restauré');
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
                // console.log('[web-components] 📋 Encoding copié');
            } catch (error) {
                console.error('Erreur lors de la copie:', error);
                queryStatus.textContent = 'Erreur lors de la copie dans le presse-papiers.';
                queryStatus.className = 'status-message status-error';
            }
        });
    }
    
    // Écouteur pour la mise à jour automatique de la textarea après calcul des domaines
    graph.addEventListener('domainsCalculated', function(event) {
        // console.log('[web-components] 🎯 Domaines recalculés automatiquement, mise à jour de la textarea ET des aperçus');
        
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
        // console.log(`Source sélectionnée: ${source}`);
        
        if (!source) {
            // Réinitialiser le sélecteur d'exemples
            exampleQuerySelect.innerHTML = '<option value="">-- Sélectionner un exemple --</option>';
            exampleDescription.textContent = '';
            return;
        }
        
        // Charger tous les exemples pour cette source
        // console.log(`Chargement des exemples pour la source: ${source}`);
        const examples = await exampleLoader.loadAllExamplesForSource(source);
        // console.log(`Exemples chargés: ${examples.length}`);
        
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
            // console.log('[web-components] 🔄 Nouvel exemple sélectionné - Préparation du reset encoding');
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
    const loadExampleDataButton = document.getElementById('load-example-data');
    const loadExampleSizeButton = document.getElementById('load-example-size');
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
            // console.log("🎨 Custom visual encoding applied from textarea.");
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
                // console.log("🎨 Adaptive visual encoding restored.");
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
        // console.log('[web-components] 🔄 Nouveau chargement détecté - Reset de l\'encoding');
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
        // console.log('[web-components] 🗑️ Effacement de tous les résultats...');
        
        // Réinitialiser complètement les composants
        graph.nodes = [];
        graph.links = [];
        table.setData([]);
        
        // Effacer TOUTES les données du composant (SPARQL et JSON)
        graph.sparqlData = null;
        graph.sparqlResult = null; // Important: effacer aussi les données JSON
        graph.encoding = null;
        
        // Remettre les propriétés internes à null
        graph.sparqlEndpoint = null;
        graph.sparqlQuery = null;
        graph.proxy = null;
        
        // RESET complet des encodings
        resetEncoding();
        
        // Réinitialiser les aperçus de données
        rawDataPreview.textContent = '// Aucune donnée SPARQL. Exécutez une requête pour voir les résultats.';
        transformedDataPreview.textContent = '// Aucune donnée transformée. Exécutez une requête d\'abord.';
        
        // Réinitialiser les champs de formulaire
        document.getElementById('endpoint-url').value = '';
        document.getElementById('query-input').value = 'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\nSELECT ?metabolite ?target ?correlation ?value\nWHERE {\n  ?metabolite rdf:type <http://example.org/Metabolite> .\n  ?metabolite <http://example.org/correlatesWith> ?correlation .\n  ?correlation <http://example.org/target> ?target .\n  ?correlation <http://example.org/value> ?value .\n}';
        document.getElementById('proxy-url').value = 'http://localhost:3001/sparql-proxy';
        
        // Réinitialiser les sélecteurs d'exemples
        document.getElementById('example-source').value = '';
        document.getElementById('example-query').value = '';
        document.getElementById('example-description').textContent = '';
        
        // Réinitialiser le statut
        queryStatus.textContent = 'Tous les résultats ont été effacés.';
        queryStatus.className = 'status-message status-success';
        
        // Relancer le rendu avec des données vides
        try {
            graph.render(); // Rendu direct au lieu de launch() pour éviter les erreurs
        } catch (error) {
            console.warn('[web-components] ⚠️ Erreur lors du rendu après effacement:', error);
        }
        
        // console.log('[web-components] ✅ Effacement terminé - composant réinitialisé');
        
        // Effacer le message de statut après un délai
        setTimeout(() => {
            queryStatus.textContent = '';
            queryStatus.className = 'status-message';
        }, 2000);
    });
    
    // Charger les données d'exemple depuis example-data.json
    loadExampleDataButton.addEventListener('click', async () => {
        try {
            // Afficher l'état de chargement
            queryStatus.textContent = 'Chargement des données d\'exemple...';
            queryStatus.className = 'status-message status-loading';
            
            // RESET ENCODING à chaque nouveau chargement
            // console.log('[web-components] 🔄 Chargement des données d\'exemple - Reset de l\'encoding');
            resetEncoding();
            
            // Charger le fichier example-data.json (chemin corrigé)
            const response = await fetch('../example-json/example-data.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const jsonData = await response.json();
            
            if (typeof graph.launch === 'function') {
                // Remettre l'encoding à null pour forcer la régénération adaptative
                graph.encoding = null;
                
                // Configurer avec les données JSON et lancer
                graph.sparqlResult = jsonData;
                const result = await graph.launch();
                
                // console.log("Résultat du chargement de l'exemple:", result);
                if (result && result.status === 'success') {
                    // console.log(`Données de l'exemple chargées: ${result.data.nodes.length} nœuds, ${result.data.links.length} liens.`);
                    
                    queryStatus.textContent = `Données d'exemple chargées: ${result.data.nodes.length} nœuds, ${result.data.links.length} liens`;
                    queryStatus.className = 'status-message status-success';
                    
                    // SAUVEGARDER L'ENCODING DE BASE (généré automatiquement)
                    saveBaseEncoding();
                    
                    // Récupérer et afficher l'encoding adaptatif généré
                    try {
                        const adaptiveEncoding = graph.getEncoding();
                        visualMappingTextarea.value = JSON.stringify(adaptiveEncoding, null, 2);
                        // console.log("🎨 Encoding adaptatif appliqué pour l'exemple:", adaptiveEncoding);
                        
                        // Mettre à jour les aperçus d'encoding
                        updateEncodingPreviews();
                        
                        // Mettre à jour les aperçus de données
                        updateDataPreviews(jsonData, result.data);
                        
                        // Transformer les données SPARQL pour le tableau si elles sont au format SPARQL
                        if (jsonData && jsonData.results && jsonData.results.bindings) {
                            const tableData = jsonData.results.bindings.map(binding => {
                                const row = {};
                                Object.keys(binding).forEach(key => {
                                    row[key] = binding[key].value;
                                });
                                return row;
                            });
                            // Mettre à jour le tableau avec les données transformées
                            table.setData(tableData);
                        }
                        
                        // Effacer les champs endpoint et query car on utilise des données pré-formatées
                        document.getElementById('endpoint-url').value = '';
                        document.getElementById('query-input').value = '';
                        document.getElementById('proxy-url').value = '';
                        
                    } catch (encodingError) {
                        console.warn("Impossible de récupérer l'encoding adaptatif pour l'exemple:", encodingError);
                    }
                } else if (result) {
                    console.warn(`Problème lors du chargement de l'exemple : ${result.message}`);
                    queryStatus.textContent = `Erreur lors du chargement des données d'exemple: ${result.message}`;
                    queryStatus.className = 'status-message status-error';
                } else {
                    console.warn("Une réponse inattendue a été reçue pour l'exemple.");
                    queryStatus.textContent = 'Réponse inattendue lors du chargement de l\'exemple';
                    queryStatus.className = 'status-message status-error';
                }
            } else {
                console.error("La méthode 'launch' n'est pas disponible.", graph);
                queryStatus.textContent = 'Erreur: méthode launch non disponible';
                queryStatus.className = 'status-message status-error';
            }
        } catch (e) {
            console.error("Erreur lors du chargement du fichier d'exemple:", e);
            queryStatus.textContent = `Erreur: ${e.message}`;
            queryStatus.className = 'status-message status-error';
        }
    });
    
    // Charger les données d'exemple depuis example-size.json
    loadExampleSizeButton.addEventListener('click', async () => {
        try {
            // Afficher l'état de chargement
            queryStatus.textContent = 'Chargement des données d\'exemple (taille par âge)...';
            queryStatus.className = 'status-message status-loading';
            
            // RESET ENCODING à chaque nouveau chargement
            // console.log('[web-components] 🔄 Chargement des données d\'exemple size - Reset de l\'encoding');
            resetEncoding();
            
            // Charger le fichier example-size.json
            const response = await fetch('../example-json/example-size.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const jsonData = await response.json();
            
            if (typeof graph.launch === 'function') {
                // Remettre l'encoding à null pour forcer la régénération adaptative
                graph.encoding = null;
                
                // Configurer avec les données JSON et lancer
                graph.sparqlResult = jsonData;
                const result = await graph.launch();
                
                // console.log("Résultat du chargement de l'exemple size:", result);
                if (result && result.status === 'success') {
                    // console.log(`Données de l'exemple size chargées: ${result.data.nodes.length} nœuds, ${result.data.links.length} liens.`);
                    
                    queryStatus.textContent = `Données d'exemple (taille par âge) chargées: ${result.data.nodes.length} nœuds, ${result.data.links.length} liens`;
                    queryStatus.className = 'status-message status-success';
                    
                    // SAUVEGARDER L'ENCODING DE BASE (généré automatiquement)
                    saveBaseEncoding();
                    
                    // Récupérer et afficher l'encoding adaptatif généré
                    try {
                        const adaptiveEncoding = graph.getEncoding();
                        visualMappingTextarea.value = JSON.stringify(adaptiveEncoding, null, 2);
                        // console.log("🎨 Encoding adaptatif appliqué pour l'exemple size:", adaptiveEncoding);
                        
                        // Mettre à jour les aperçus d'encoding
                        updateEncodingPreviews();
                        
                        // Mettre à jour les aperçus de données
                        updateDataPreviews(jsonData, result.data);
                        
                        // Transformer les données SPARQL pour le tableau si elles sont au format SPARQL
                        if (jsonData && jsonData.results && jsonData.results.bindings) {
                            const tableData = jsonData.results.bindings.map(binding => {
                                const row = {};
                                Object.keys(binding).forEach(key => {
                                    row[key] = binding[key].value;
                                });
                                return row;
                            });
                            // Mettre à jour le tableau avec les données transformées
                            table.setData(tableData);
                        }
                        
                        // Effacer les champs endpoint et query car on utilise des données pré-formatées
                        document.getElementById('endpoint-url').value = '';
                        document.getElementById('query-input').value = '';
                        document.getElementById('proxy-url').value = '';
                        
                    } catch (encodingError) {
                        console.warn("Impossible de récupérer l'encoding adaptatif pour l'exemple size:", encodingError);
                    }
                } else if (result) {
                    console.warn(`Problème lors du chargement de l'exemple size : ${result.message}`);
                    queryStatus.textContent = `Erreur lors du chargement des données d'exemple size: ${result.message}`;
                    queryStatus.className = 'status-message status-error';
                } else {
                    console.warn("Une réponse inattendue a été reçue pour l'exemple size.");
                    queryStatus.textContent = 'Réponse inattendue lors du chargement de l\'exemple size';
                    queryStatus.className = 'status-message status-error';
                }
            } else {
                console.error("La méthode 'launch' n'est pas disponible.", graph);
                queryStatus.textContent = 'Erreur: méthode launch non disponible';
                queryStatus.className = 'status-message status-error';
            }
        } catch (e) {
            console.error("Erreur lors du chargement du fichier d'exemple size:", e);
            queryStatus.textContent = `Erreur: ${e.message}`;
            queryStatus.className = 'status-message status-error';
        }
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
            // console.log("Initialisation du sélecteur d'exemples...");
            // Charger la liste des exemples
            const result = await exampleLoader.loadExamplesList();
            // console.log("Résultat du chargement des exemples:", result);
            
            // Remplir le sélecteur de sources
            const sources = Object.keys(exampleLoader.examplesBySource);
            sources.sort();
            // console.log("Sources disponibles:", sources);
            
            let sourceOptions = '<option value="">-- Sélectionner une source --</option>';
            sources.forEach(source => {
                const examplesCount = exampleLoader.examplesBySource[source]?.examples?.length || 0;
                // console.log(`Source ${source}: ${examplesCount} exemples`);
                if (examplesCount > 0) {
                    sourceOptions += `<option value="${source}">${source} (${examplesCount})</option>`;
                }
            });
            
            exampleSourceSelect.innerHTML = sourceOptions;
            // console.log("Sélecteur de sources mis à jour");
            
            // Si Bgee est disponible, le sélectionner par défaut
            if (exampleLoader.examplesBySource['Bgee'] && 
                exampleLoader.examplesBySource['Bgee'].examples.length > 0) {
                // console.log("Sélection de Bgee par défaut");
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