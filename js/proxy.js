/**
 * Proxy SPARQL pour résoudre les problèmes CORS
 * Ce fichier doit être configuré selon votre environnement
 */

// Configuration par défaut - À MODIFIER selon vos besoins
const PROXY_CONFIG = {
  // Option 1: Service CORS proxy public (à utiliser avec parcimonie)
  corsAnywhereUrl: 'https://cors-anywhere.herokuapp.com/',
  
  // Option 2: Votre propre serveur proxy
  customProxyUrl: 'http://localhost:3001/sparql-proxy',
  
  // Option 3: Proxy AllOrigins (service gratuit)
  allOriginsUrl: 'https://api.allorigins.win/get?url=',
  
  // Préférence de proxy (dans l'ordre de priorité)
  preferredMethod: 'custom', // 'custom', 'cors-anywhere', 'allorigins'
  
  // Timeout pour les requêtes
  timeout: 30000,
  
  // Headers additionnels
  additionalHeaders: {
    'User-Agent': 'VisGraph SPARQL Client 1.0'
  }
};

/**
 * Interface principale du proxy
 */
export default {
  
  /**
   * Exécute une requête SPARQL via le proxy configuré
   * @param {string} endpoint - L'endpoint SPARQL cible
   * @param {string} sparqlQuery - La requête SPARQL à exécuter
   * @returns {Promise<Object>} - Les résultats JSON de la requête
   */
  async query(endpoint, sparqlQuery) {
    console.log('[SparqlProxy] Début de la requête via proxy');
    console.log('[SparqlProxy] Endpoint cible:', endpoint);
    console.log('[SparqlProxy] Méthode préférée:', PROXY_CONFIG.preferredMethod);
    
    const methods = {
      'custom': () => this.queryViaCustomProxy(endpoint, sparqlQuery),
      'cors-anywhere': () => this.queryViaCorsAnywhere(endpoint, sparqlQuery),
      'allorigins': () => this.queryViaAllOrigins(endpoint, sparqlQuery)
    };
    
    // Essayer la méthode préférée d'abord
    try {
      if (methods[PROXY_CONFIG.preferredMethod]) {
        return await methods[PROXY_CONFIG.preferredMethod]();
      }
    } catch (error) {
      console.warn(`[SparqlProxy] Échec avec méthode préférée ${PROXY_CONFIG.preferredMethod}:`, error);
    }
    
    // Essayer les autres méthodes en fallback
    for (const [methodName, method] of Object.entries(methods)) {
      if (methodName === PROXY_CONFIG.preferredMethod) continue;
      
      try {
        console.log(`[SparqlProxy] Tentative avec méthode ${methodName}`);
        return await method();
      } catch (error) {
        console.warn(`[SparqlProxy] Échec avec méthode ${methodName}:`, error);
      }
    }
    
    throw new Error('Toutes les méthodes de proxy ont échoué');
  },
  
  /**
   * Requête via un proxy personnalisé
   */
  async queryViaCustomProxy(endpoint, sparqlQuery) {
    if (!PROXY_CONFIG.customProxyUrl) {
      throw new Error('URL du proxy personnalisé non configurée');
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROXY_CONFIG.timeout);
    
    try {
      const response = await fetch(PROXY_CONFIG.customProxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...PROXY_CONFIG.additionalHeaders
        },
        body: JSON.stringify({
          endpoint: endpoint,
          query: sparqlQuery,
          format: 'json'
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Erreur proxy personnalisé: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },
  
  /**
   * Requête via CORS Anywhere
   */
  async queryViaCorsAnywhere(endpoint, sparqlQuery) {
    const proxyUrl = PROXY_CONFIG.corsAnywhereUrl + endpoint;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROXY_CONFIG.timeout);
    
    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest',
          ...PROXY_CONFIG.additionalHeaders
        },
        body: new URLSearchParams({
          query: sparqlQuery,
          format: 'json'
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Erreur CORS Anywhere: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },
  
  /**
   * Requête via AllOrigins
   */
  async queryViaAllOrigins(endpoint, sparqlQuery) {
    const params = new URLSearchParams({
      query: sparqlQuery,
      format: 'json'
    });
    
    const targetUrl = `${endpoint}?${params.toString()}`;
    const proxyUrl = PROXY_CONFIG.allOriginsUrl + encodeURIComponent(targetUrl);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROXY_CONFIG.timeout);
    
    try {
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: PROXY_CONFIG.additionalHeaders,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Erreur AllOrigins: ${response.status}`);
      }
      
      const result = await response.json();
      return JSON.parse(result.contents);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },
  
  /**
   * Teste la disponibilité des différents proxies
   */
  async testProxyAvailability() {
    const results = {
      custom: false,
      corsAnywhere: false,
      allOrigins: false
    };
    
    // Test du proxy personnalisé
    if (PROXY_CONFIG.customProxyUrl) {
      try {
        const response = await fetch(PROXY_CONFIG.customProxyUrl + '/health', {
          method: 'GET',
          timeout: 5000
        });
        results.custom = response.ok;
      } catch (error) {
        console.warn('[SparqlProxy] Proxy personnalisé non disponible:', error);
      }
    }
    
    // Test de CORS Anywhere
    try {
      const response = await fetch(PROXY_CONFIG.corsAnywhereUrl, {
        method: 'HEAD',
        timeout: 5000
      });
      results.corsAnywhere = response.ok || response.status === 405; // 405 = Method Not Allowed mais service disponible
    } catch (error) {
      console.warn('[SparqlProxy] CORS Anywhere non disponible:', error);
    }
    
    // Test d'AllOrigins
    try {
      const response = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://httpbin.org/status/200'), {
        method: 'GET',
        timeout: 5000
      });
      results.allOrigins = response.ok;
    } catch (error) {
      console.warn('[SparqlProxy] AllOrigins non disponible:', error);
    }
    
    return results;
  },
  
  /**
   * Obtient la configuration actuelle
   */
  getConfig() {
    return { ...PROXY_CONFIG };
  },
  
  /**
   * Met à jour la configuration
   */
  updateConfig(newConfig) {
    Object.assign(PROXY_CONFIG, newConfig);
    console.log('[SparqlProxy] Configuration mise à jour:', PROXY_CONFIG);
  }
};

// Test automatique au chargement (optionnel)
if (typeof window !== 'undefined') {
  console.log('[SparqlProxy] Module proxy SPARQL chargé');
  console.log('[SparqlProxy] Configuration:', PROXY_CONFIG);
  
  // Optionnel: tester la disponibilité des proxies au chargement
  // export default.testProxyAvailability().then(results => {
  //   console.log('[SparqlProxy] Disponibilité des proxies:', results);
  // });
} 