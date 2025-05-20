/**
 * Script pour charger et traiter les exemples SPARQL
 */

class SparqlExampleLoader {
    constructor() {
        this.examples = [];
        this.examplesBySource = {};
        
        // Liste complète des sources disponibles (dossiers)
        this.sources = [
            'Bgee', 
            'dbgi', 
            'GlyConnect', 
            'HAMAP', 
            'MetaNetX',
            'OMA', 
            'OrthoDB', 
            'Rhea', 
            'SwissLipids', 
        ];
        
        // Sources connues pour avoir des fichiers avec le suffixe "-biosodafrontend"
        this.sourcesWithBiosodaFrontend = ['Bgee'];
        
        // Garde la liste des fichiers scannés pour éviter les doublons
        this.scannedFiles = {};
    }

    /**
     * Charge les métadonnées des exemples SPARQL
     */
    async loadExamplesList() {
        try {
            console.log("Chargement des exemples...");
            
            // Initialiser les structures
            this.examplesBySource = {};
            this.examples = [];
            this.scannedFiles = {};
            
            // Pour chaque source, vérifier d'abord la disponibilité du dossier
            const loadPromises = [];
            for (const source of this.sources) {
                // Chargement direct sans condition préalable
                loadPromises.push(this.loadAllExamplesForSource(source));
            }
            
            // Attendre que tous les chargements soient terminés
            await Promise.allSettled(loadPromises);
            
            console.log(`Total des exemples chargés: ${this.examples.length}`);
            return {
                examples: this.examples,
                examplesBySource: this.examplesBySource
            };
        } catch (error) {
            console.error('Erreur lors du chargement des exemples:', error);
            return { 
                examples: this.examples, 
                examplesBySource: this.examplesBySource 
            };
        }
    }
    
    /**
     * Charge un fichier d'exemple et extrait les informations pertinentes
     */
    async loadExampleFile(source, filename) {
        try {
            // Éviter les doublons
            const fileKey = `${source}/${filename}`;
            if (this.scannedFiles[fileKey]) {
                return null;
            }
            this.scannedFiles[fileKey] = true;
            
            const url = `../examples/${source}/${filename}`;
            console.log(`Tentative de chargement: ${url}`);
            const response = await fetch(url);
            if (!response.ok) {
                console.log(`Échec de chargement: ${url} (${response.status})`);
                return null;
            }
            
            const ttlContent = await response.text();
            console.log(`Fichier chargé avec succès: ${url}`);
            
            // Extraire les informations de l'exemple
            const id = filename.split('.')[0];
            const commentMatch = ttlContent.match(/rdfs:comment\s+"([^"]+)"/);
            const title = commentMatch ? commentMatch[1] : `Exemple ${id}`;
            
            // Extraire la requête SPARQL
            const queryMatch = ttlContent.match(/sh:select\s+"""([\s\S]+?)"""/);
            const query = queryMatch ? queryMatch[1] : '';
            
            // Extraire l'endpoint cible
            const endpointMatch = ttlContent.match(/schema:target\s+<([^>]+)>/);
            const endpoint = endpointMatch ? endpointMatch[1] : '';
            
            return {
                id: `${source}-${id}`,
                source: source,
                title: title,
                query: query,
                endpoint: endpoint,
                filename: filename
            };
        } catch (error) {
            console.error(`Erreur lors du chargement de ${source}/${filename}:`, error);
            return null;
        }
    }
    
    /**
     * Liste tous les fichiers .ttl dans un dossier d'exemples
     * Utilise un fallback avec des noms de fichiers prédéfinis si la liste ne peut pas être obtenue
     */
    async listTtlFiles(source) {
        try {
            const fileNames = [];
            
            // Vérifier seulement les 30 premiers fichiers pour éviter trop de requêtes 404
            for (let i = 1; i <= 30; i++) {
                const paddedName = `${String(i).padStart(3, '0')}.ttl`;
                const simpleName = `${i}.ttl`;
                
                // Vérifier si le fichier avec padding existe
                try {
                    const paddedResponse = await fetch(`../examples/${source}/${paddedName}`, { method: 'HEAD' });
                    if (paddedResponse.ok) {
                        fileNames.push(paddedName);
                    }
                } catch (e) {
                    // Ignorer silencieusement si le fichier n'existe pas
                }
                
                // Vérifier aussi le format sans padding (1.ttl, 2.ttl...)
                try {
                    const simpleResponse = await fetch(`../examples/${source}/${simpleName}`, { method: 'HEAD' });
                    if (simpleResponse.ok) {
                        fileNames.push(simpleName);
                    }
                } catch (e) {
                    // Ignorer silencieusement si le fichier n'existe pas
                }
            }
            
            // Pour Bgee, vérifier aussi les fichiers avec suffixe spécial
            if (this.sourcesWithBiosodaFrontend.includes(source)) {
                for (let i = 1; i <= 30; i++) {
                    const baseNum = String(i).padStart(3, '0');
                    const specialName = `${baseNum}-biosodafrontend.ttl`;
                    try {
                        const specialResponse = await fetch(`../examples/${source}/${specialName}`, { method: 'HEAD' });
                        if (specialResponse.ok) {
                            fileNames.push(specialName);
                        }
                    } catch (e) {
                        // Ignorer silencieusement
                    }
                }
            }
            
            return fileNames;
        } catch (error) {
            console.error(`Erreur lors de la liste des fichiers pour ${source}:`, error);
            return [];
        }
    }
    
    /**
     * Charge tous les exemples d'une source spécifiée
     */
    async loadAllExamplesForSource(source) {
        try {
            console.log(`Chargement des exemples pour ${source}...`);
            
            // Vérifier si nous avons déjà chargé des exemples pour cette source
            if (this.examplesBySource[source] && this.examplesBySource[source].examples.length > 0) {
                console.log(`Utilisation des exemples déjà chargés pour ${source}: ${this.examplesBySource[source].examples.length}`);
                return this.examplesBySource[source].examples;
            }
            
            // Initialiser le tableau des exemples pour cette source
            if (!this.examplesBySource[source]) {
                this.examplesBySource[source] = {
                    name: source,
                    examples: []
                };
            }
            
            // Récupérer la liste des fichiers .ttl disponibles
            const fileNames = await this.listTtlFiles(source);
            console.log(`${fileNames.length} fichiers trouvés pour ${source}`);
            
            if (fileNames.length === 0) {
                console.log(`Aucun fichier trouvé pour ${source}`);
                return [];
            }
            
            // Essayer de charger chaque fichier
            const examples = [];
            const loadPromises = [];
            
            for (const fileName of fileNames) {
                loadPromises.push(this.loadExampleFile(source, fileName));
            }
            
            // Attendre et traiter tous les résultats
            const results = await Promise.allSettled(loadPromises);
            
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    const example = result.value;
                    examples.push(example);
                    
                    // Éviter les doublons dans la liste globale
                    if (!this.examples.some(e => e.id === example.id)) {
                        this.examples.push(example);
                    }
                    
                    // Éviter les doublons dans la liste par source
                    if (!this.examplesBySource[source].examples.some(e => e.id === example.id)) {
                        this.examplesBySource[source].examples.push(example);
                    }
                }
            });
            
            console.log(`${examples.length} exemples chargés pour ${source}`);
            return examples;
        } catch (error) {
            console.error(`Erreur lors du chargement des exemples pour ${source}:`, error);
            return [];
        }
    }
}

// Exporter la classe
window.SparqlExampleLoader = SparqlExampleLoader; 