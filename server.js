/**
 * @fileOverview Serveur Express pour le visualisateur métabolomique avec support SPARQL
 * @author Moncada Jérémy
 * @version 1.0.0
 */

// Import des dépendances
const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const cors = require('cors');

// Création de l'application Express
const app = express();
const PORT = process.env.PORT || 5000;

// Configuration du middleware
app.use(cors()); // Active CORS pour les requêtes cross-origin
app.use(express.json()); // Parse le corps des requêtes JSON
app.use(express.static(path.join(__dirname, './'))); // Sert les fichiers statiques

// Route principale - sert l'interface utilisateur
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * Route pour exécuter une requête SPARQL vers un endpoint externe
 * Exemple: /api/sparql?endpoint=https://sparql.endpoint.org&query=SELECT * WHERE { ?s ?p ?o } LIMIT 10
 */
app.get('/api/sparql', async (req, res) => {
    try {
        const { endpoint, query } = req.query;

        if (!endpoint || !query) {
            return res.status(400).json({
                error: 'L\'endpoint SPARQL et la requête sont requis'
            });
        }

        console.log(`=== Exécution de la requête SPARQL ===`);
        console.log(`Vers endpoint: ${endpoint}`);
        console.log(`Requête:\n${query}`);

        // Ajouter le CORS pour le débogage
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

        try {
            // Exécution de la requête SPARQL
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/sparql-query',
                    'Accept': 'application/json'
                },
                body: query
            });

            if (!response.ok) {
                console.error(`Erreur de l'endpoint SPARQL: ${response.status} ${response.statusText}`);
                throw new Error(`Erreur SPARQL: ${response.statusText}`);
            }

            // Récupérer les données JSON de la réponse
            const data = await response.json();
            
            // Log des métadonnées de la réponse pour le débogage
            console.log(`=== Réponse de l'endpoint SPARQL ===`);
            console.log(`Status: ${response.status} ${response.statusText}`);
            console.log(`Variables dans la réponse: ${data.head && data.head.vars ? data.head.vars.join(', ') : 'aucune'}`);
            console.log(`Nombre de résultats: ${data.results && data.results.bindings ? data.results.bindings.length : 0}`);
            
            // Si nécessaire, afficher un échantillon du premier résultat
            if (data.results && data.results.bindings && data.results.bindings.length > 0) {
                console.log(`Premier résultat (exemple):`);
                console.log(JSON.stringify(data.results.bindings[0], null, 2));
            }
            
            // Envoyer les données au client
            res.json(data);
        } catch (fetchError) {
            console.error(`Erreur lors de la requête à l'endpoint SPARQL: ${fetchError.message}`);
            
            // Essayer avec une requête GET si POST échoue
            console.log(`Tentative avec GET au lieu de POST...`);
            
            try {
                const getUrl = `${endpoint}?query=${encodeURIComponent(query)}`;
                const getResponse = await fetch(getUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                if (!getResponse.ok) {
                    throw new Error(`Erreur GET SPARQL: ${getResponse.statusText}`);
                }
                
                const getData = await getResponse.json();
                
                console.log(`=== Réponse de l'endpoint SPARQL (GET) ===`);
                console.log(`Variables dans la réponse: ${getData.head && getData.head.vars ? getData.head.vars.join(', ') : 'aucune'}`);
                console.log(`Nombre de résultats: ${getData.results && getData.results.bindings ? getData.results.bindings.length : 0}`);
                
                res.json(getData);
            } catch (getError) {
                throw new Error(`Échec des requêtes POST et GET: ${fetchError.message}, ${getError.message}`);
            }
        }
    } catch (error) {
        console.error('Erreur lors de l\'exécution de la requête SPARQL:', error);
        res.status(500).json({
            error: `Erreur lors de l'exécution de la requête SPARQL: ${error.message}`
        });
    }
});

/**
 * Route pour transformer des données SPARQL au format Vega-Lite
 * Exemple d'utilisation: POST /api/transform-sparql avec les données SPARQL dans le corps
 */
app.post('/api/transform-sparql', (req, res) => {
    try {
        const sparqlData = req.body;

        if (!sparqlData || !sparqlData.head || !sparqlData.results) {
            return res.status(400).json({
                error: 'Format de données SPARQL invalide'
            });
        }

        // Transformation des données SPARQL vers Vega-Lite
        const vegaData = transformSparqlToVegaData(sparqlData);
        
        res.json(vegaData);
    } catch (error) {
        console.error('Erreur lors de la transformation des données:', error);
        res.status(500).json({
            error: `Erreur lors de la transformation des données: ${error.message}`
        });
    }
});

/**
 * Transforme les données SPARQL en format compatible avec Vega-Lite
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

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
    console.log(`- Interface utilisateur: http://localhost:${PORT}`);
    console.log(`- API SPARQL: http://localhost:${PORT}/api/sparql?endpoint=URL&query=QUERY`);
}); 