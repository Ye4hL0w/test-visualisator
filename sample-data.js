/**
 * @fileOverview Données d'exemple pour le visualisateur métabolomique
 * @author Moncada Jérémy
 * @version 1.0.0
 */

/**
 * @function loadSampleData
 * @description Charge des données métabolomiques d'exemple dans le localStorage pour permettre la démonstration
 * @returns {Object} Les données chargées
 */
function loadSampleData() {
    // Créer des données d'exemple de métabolites
    const sampleData = {
        // Noms des colonnes/métabolites
        columns: [
            "glucose", "lactate", "pyruvate", "citrate", "alanine", 
            "glutamine", "glutamate", "serine", "glycine", "aspartate"
        ],
        // Valeurs d'échantillons pour chaque métabolite
        values: []
    };

    // Générer 40 échantillons simulés
    for (let i = 0; i < 40; i++) {
        // Créer un nouvel échantillon (patient/mesure)
        const sample = {};
        
        // Générer la concentration de glucose (entre 3.5 et 6.0 mmol/L)
        sample.glucose = 3.5 + Math.random() * 2.5;
        
        // Générer la concentration de lactate, corrélée négativement avec le glucose
        sample.lactate = 2.0 - sample.glucose * 0.2 + Math.random() * 0.8;
        
        // Générer la concentration de pyruvate, corrélée positivement avec le lactate
        sample.pyruvate = 0.5 + sample.lactate * 0.15 + Math.random() * 0.3;
        
        // Générer la concentration de citrate (entre 0.7 et 1.5 mmol/L)
        sample.citrate = 0.7 + Math.random() * 0.8;
        
        // Générer la concentration d'alanine, corrélée avec le pyruvate
        sample.alanine = 2.0 + sample.pyruvate * 0.6 + Math.random() * 1.5;
        
        // Générer la concentration de glutamine (entre 4.0 et 6.0 mmol/L)
        sample.glutamine = 4.0 + Math.random() * 2.0;
        
        // Générer la concentration de glutamate, corrélée avec la glutamine
        sample.glutamate = 1.0 + sample.glutamine * 0.2 + Math.random() * 0.8;
        
        // Générer la concentration de sérine (entre 0.8 et 1.4 mmol/L)
        sample.serine = 0.8 + Math.random() * 0.6;
        
        // Générer la concentration de glycine, corrélée avec la sérine
        sample.glycine = 1.5 + sample.serine * 0.7 + Math.random() * 0.5;
        
        // Générer la concentration d'aspartate (entre 0.1 et 0.4 mmol/L)
        sample.aspartate = 0.1 + Math.random() * 0.3;
        
        // Ajouter l'échantillon complet aux données
        sampleData.values.push(sample);
    }

    // Simuler des groupes expérimentaux
    // Groupe 1: échantillons 0-19 (contrôle)
    // Groupe 2: échantillons 20-39 (traitement - niveaux de métabolites altérés)
    for (let i = 20; i < 40; i++) {
        // Augmenter le glucose dans le groupe "traitement"
        sampleData.values[i].glucose *= 1.2;
        
        // Diminuer le lactate dans le groupe "traitement"
        sampleData.values[i].lactate *= 0.8;
        
        // Augmenter la glutamine dans le groupe "traitement"
        sampleData.values[i].glutamine *= 1.3;
    }

    // Ajouter une information de groupe pour chaque échantillon
    sampleData.columns.push("groupe");
    
    for (let i = 0; i < 40; i++) {
        sampleData.values[i].groupe = i < 20 ? "Contrôle" : "Traitement";
    }

    // Stocker les données dans localStorage au lieu des cookies
    try {
        localStorage.setItem('metabolomicsData', JSON.stringify(sampleData));
        console.log("Données d'exemple enregistrées dans localStorage");
    } catch (e) {
        console.error("Erreur lors de l'enregistrement dans localStorage:", e);
        // Fallback aux cookies si localStorage n'est pas disponible
        document.cookie = `metabolomicsData=${JSON.stringify(sampleData)}; path=/; max-age=604800`; // 7 jours
    }
    
    console.log("Données d'exemple chargées avec succès !");
    return sampleData;
}

/**
 * @function hasStoredData
 * @description Vérifie si des données sont stockées dans localStorage ou les cookies
 * @returns {boolean} True si des données sont disponibles
 */
function hasStoredData() {
    return localStorage.getItem('metabolomicsData') !== null || 
           document.cookie.includes('metabolomicsData=');
}

/**
 * @function getStoredData
 * @description Récupère les données stockées (localStorage ou cookies)
 * @returns {Object|null} Les données ou null si aucune donnée n'est trouvée
 */
function getStoredData() {
    try {
        // Essayer d'abord localStorage
        const localData = localStorage.getItem('metabolomicsData');
        if (localData) {
            return JSON.parse(localData);
        }
        
        // Sinon, essayer les cookies
        const cookieMatch = document.cookie.match(/metabolomicsData=([^;]+)/);
        if (cookieMatch && cookieMatch[1]) {
            return JSON.parse(cookieMatch[1]);
        }
    } catch (e) {
        console.error("Erreur lors de la récupération des données:", e);
    }
    
    return null;
}

/**
 * @function clearStoredData
 * @description Supprime les données stockées
 */
function clearStoredData() {
    try {
        localStorage.removeItem('metabolomicsData');
    } catch (e) {
        console.error("Erreur lors de la suppression de localStorage:", e);
    }
    
    document.cookie = "metabolomicsData=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    console.log("Données effacées");
}

/**
 * @function initializeVisualizationIfNeeded
 * @description Initialise la visualisation si les données sont disponibles
 */
function initializeVisualizationIfNeeded() {
    // Vérifier si des données existent
    if (hasStoredData()) {
        console.log("Données trouvées, initialisation de la visualisation...");
        
        try {
            // Si le visualisateur est disponible, forcer son initialisation
            if (typeof VisualisateurMetabolomique !== 'undefined') {
                // D'abord, mettre à jour l'état de données du visualisateur
                // On simule le chargement depuis les cookies pour compatibilité
                document.cookie = `metabolomicsData=${JSON.stringify(getStoredData())}; path=/`;
                
                console.log("Forçage de l'initialisation du visualisateur...");
                
                // Initialiser et configurer après un court délai
                setTimeout(() => {
                    // Initialiser le visualisateur
                    VisualisateurMetabolomique.init();
                    
                    // Après l'initialisation, sélectionner les dimensions par défaut
                    setTimeout(() => {
                        const xAxisSelect = document.getElementById('x-axis-select');
                        const yAxisSelect = document.getElementById('y-axis-select');
                        const colorSelect = document.getElementById('color-by-select');
                        
                        if (xAxisSelect && xAxisSelect.options.length > 0) {
                            xAxisSelect.selectedIndex = 0; // Sélectionner le premier élément
                        }
                        
                        if (yAxisSelect && yAxisSelect.options.length > 1) {
                            yAxisSelect.selectedIndex = 1; // Sélectionner le deuxième élément
                        }
                        
                        if (colorSelect && colorSelect.options.length > 0) {
                            // Trouver l'option 'groupe' si elle existe
                            for (let i = 0; i < colorSelect.options.length; i++) {
                                if (colorSelect.options[i].value === 'groupe') {
                                    colorSelect.selectedIndex = i;
                                    break;
                                }
                            }
                        }
                        
                        // Déclencher un événement de changement pour tous les sélecteurs
                        [xAxisSelect, yAxisSelect, colorSelect].forEach(select => {
                            if (select) {
                                const event = new Event('change');
                                select.dispatchEvent(event);
                            }
                        });
                        
                        // Forcer l'affichage du graphique à dispersion
                        const scatterButton = document.getElementById('view-scatter');
                        if (scatterButton) {
                            scatterButton.click();
                        }
                        
                        console.log("Visualisation initialisée avec succès!");
                    }, 300);
                }, 100);
            } else {
                console.warn("Le visualisateur n'est pas disponible");
            }
        } catch (error) {
            console.error("Erreur lors de l'initialisation forcée:", error);
        }
    } else {
        console.log("Aucune donnée trouvée. Chargez des données d'exemple.");
    }
}

// Initialisation au chargement de la page, sans rechargement automatique
window.addEventListener('DOMContentLoaded', function() {
    console.log("Page chargée, vérification des données...");
    
    // Mettre à jour le statut des données
    if (typeof checkDataStatus === 'function') {
        checkDataStatus();
    }
    
    // Initialiser la visualisation si des données existent
    if (hasStoredData()) {
        setTimeout(initializeVisualizationIfNeeded, 300);
    }
}); 