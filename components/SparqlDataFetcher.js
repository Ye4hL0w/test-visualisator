/**
 * Utilitaire pour récupérer des données SPARQL avec gestion automatique CORS/proxy
 * Réutilisable dans plusieurs composants
 */
export class SparqlDataFetcher {
  constructor() {
    this.currentEndpoint = null;
    this.currentProxyUrl = null;
  }

  /**
   * Affiche une erreur personnalisée
   */
  showCustomProxyError() {
    console.error('🚫 [SparqlDataFetcher] Problème de CORS détecté ou proxy non fonctionnel.');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('ℹ️ Pour résoudre ce problème, vous devez configurer un serveur proxy local.');
    console.error('📖 DOCUMENTATION COMPLÈTE:');
    console.error('   👉 https://github.com/Ye4hL0w/test-visualisator/blob/main/docs/proxy-setup.md');
    console.error('');
    console.error('🚀 RÉSUMÉ RAPIDE:');
    console.error('   1. Créez le fichier server/proxy.js (code dans la doc)');
    console.error('   2. Installez: npm install express node-fetch@2 cors');
    console.error('   3. Lancez: node server/proxy.js');
    console.error('   4. Rafraîchissez cette page');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  /**
   * Détecter si l'erreur est due à CORS
   */
  isCorsError(error) {
    const corsIndicators = [
      'Failed to fetch',
      'NetworkError',
      'CORS',
      'Cross-Origin',
      'blocked by CORS policy',
      'Access-Control-Allow-Origin',
      'TypeError: Failed to fetch'
    ];
    
    return corsIndicators.some(indicator => 
      error.message.includes(indicator) || error.toString().includes(indicator)
    );
  }

  /**
   * Exécute une requête SPARQL avec hiérarchie : proxy en priorité si fourni, sinon endpoint direct puis proxy
   */
  async executeSparqlQueryWithFallback(endpoint, query, proxyUrl = null, onProxyError = null, onNotification = null) {
    console.log('[SparqlDataFetcher] Début de l\'exécution de la requête SPARQL');
    console.log('[SparqlDataFetcher] Endpoint cible:', endpoint);
    
    // NOUVELLE LOGIQUE : Si proxy fourni, l'utiliser en priorité
    const proxyIsProvided = proxyUrl && proxyUrl.trim() !== '';
    if (proxyIsProvided) {
      console.log('[SparqlDataFetcher] 🚀 Proxy fourni, utilisation en priorité');
      try {
        console.log(`[SparqlDataFetcher] Tentative prioritaire: Proxy configuré via ${proxyUrl}`);
        
        const params = new URLSearchParams({ endpoint: endpoint, query: query });
        const fullProxyUrl = `${proxyUrl}?${params.toString()}`;

        const response = await fetch(fullProxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/sparql-results+json, application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Proxy error (${response.status}): ${errorData}`);
        }
        const result = await response.json();
        console.log('[SparqlDataFetcher] ✅ Succès avec proxy en priorité');
        return result;
      } catch (proxyError) {
        console.error('[SparqlDataFetcher] Échec avec proxy en priorité:', proxyError.message);
        
        const isProxyConnectionError = proxyError.message.includes('Failed to fetch') || 
                                      proxyError.message.includes('Connection refused') ||
                                      proxyError.message.includes('Network Error');
        
        if (isProxyConnectionError) {
          this.showCustomProxyError();
          if (onProxyError) onProxyError();
          if (onNotification) onNotification(`Le proxy configuré sur ${proxyUrl} semble ne pas fonctionner. Vérifiez que le proxy est démarré et accessible.`, 'error');
        } else {
          if (onNotification) onNotification(`Erreur de l'endpoint SPARQL distant via proxy. Vérifiez l'URL de l'endpoint ou essayez une requête plus simple.`, 'error');
          console.error('[SparqlDataFetcher] L\'endpoint SPARQL distant a retourné une erreur via proxy:', proxyError.message);
        }
        
        throw new Error(`Proxy configuré à ${proxyUrl} a échoué en priorité. Détails: ${proxyError.message}`);
      }
    }
    
    // LOGIQUE EXISTANTE : Endpoint direct puis proxy en fallback
    // 1 : Endpoint direct
    try {
      console.log('[SparqlDataFetcher] Tentative 1: Endpoint direct');
      return await this.executeSparqlQuery(endpoint, query);
    } catch (directError) {
      console.warn('[SparqlDataFetcher] Échec avec endpoint direct:', directError.message);
      
      // Vérification de si c'est bien une erreur CORS
      if (this.isCorsError(directError)) {
        console.log('[SparqlDataFetcher] 🎯 Erreur CORS détectée - Tentative avec proxy local...');

        // Vérifier si une URL de proxy est bien fournie
        if (!proxyUrl) {
          console.error('[SparqlDataFetcher] ❌ Aucune URL de proxy fournie pour contourner CORS');
          this.showCustomProxyError();
          if (onProxyError) onProxyError();
          if (onNotification) onNotification('Erreur CORS détectée mais aucune URL de proxy configurée. Veuillez configurer un proxy SPARQL.', 'error');
          throw new Error('Erreur CORS - URL de proxy manquante');
        }

        // 2 : Proxy configuré par l'utilisateur
        try {
          console.log(`[SparqlDataFetcher] Tentative 2: Proxy configuré via ${proxyUrl}`);
          
          const params = new URLSearchParams({ endpoint: endpoint, query: query });
          const fullProxyUrl = `${proxyUrl}?${params.toString()}`;

          const response = await fetch(fullProxyUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/sparql-results+json, application/json'
            }
          });

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Proxy error (${response.status}): ${errorData}`);
          }
          const result = await response.json();
          console.log('[SparqlDataFetcher] ✅ Succès avec proxy configuré');
          return result;
        } catch (proxyError) {
          console.error('[SparqlDataFetcher] Échec avec proxy configuré:', proxyError.message);
          
          const isProxyConnectionError = proxyError.message.includes('Failed to fetch') || 
                                        proxyError.message.includes('Connection refused') ||
                                        proxyError.message.includes('Network Error');
          
          if (isProxyConnectionError) {
            this.showCustomProxyError();
            if (onProxyError) onProxyError();
            if (onNotification) onNotification(`Le proxy configuré sur ${proxyUrl} semble ne pas fonctionner. Vérifiez que le proxy est démarré et accessible.`, 'error');
          } else {
            if (onNotification) onNotification(`Erreur de l'endpoint SPARQL distant. Vérifiez l'URL de l'endpoint ou essayez une requête plus simple.`, 'error');
            console.error('[SparqlDataFetcher] L\'endpoint SPARQL distant a retourné une erreur:', proxyError.message);
          }
          
          throw new Error(`Proxy configuré à ${proxyUrl} a échoué après une erreur CORS. Détails: ${proxyError.message}`);
        }
      } else {
        console.error('[SparqlDataFetcher] Erreur non-CORS avec endpoint direct:', directError);
        throw directError;
      }
    }
  }

  /**
   * Exécute une requête SPARQL directe
   */
  async executeSparqlQuery(endpoint, query) {
    const params = new URLSearchParams();
    params.append('query', query.trim());
    params.append('format', 'json');
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/sparql-results+json'
      },
      body: params
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Récupère les données avec hiérarchie : JSON direct > endpoint > proxy
   * MÉTHODE INTERNE : Utilisée par les composants pour récupérer les données brutes SPARQL
   */
  async fetchSparqlData(endpoint, query, jsonData = null, proxyUrl = null, onProxyError = null, onNotification = null) {
    try {
      // 1: Données JSON fournies directement
      if (jsonData) {
        console.log('[SparqlDataFetcher] 🎯 Utilisation des données JSON fournies directement');
        
        return {
          status: 'success',
          method: 'direct-json',
          message: `Données chargées depuis JSON`,
          data: jsonData,
          rawData: jsonData
        };
      }
      
      // 2 et 3: Endpoint puis proxy
      console.log('[SparqlDataFetcher] 🔍 Récupération des données depuis l\'endpoint...');
      this.currentEndpoint = endpoint;
      this.currentProxyUrl = proxyUrl;
      
      const rawData = await this.executeSparqlQueryWithFallback(endpoint, query, proxyUrl, onProxyError, onNotification);
      
      return {
        status: 'success',
        method: 'endpoint-or-proxy',
        message: `Données chargées depuis l'endpoint`,
        data: rawData,
        rawData: rawData
      };
    } catch (error) {
      console.error('[SparqlDataFetcher] ❌ Erreur lors du chargement des données:', error.message);
      return {
        status: 'error',
        message: `Erreur: ${error.message}`,
        data: null,
        rawData: null
      };
    }
  }
} 