/**
 * Composant Web pour la visualisation de graphes de connaissances.
 * Utilise D3.js pour le rendu SVG et un système d'encoding visuel configurable.
 */
// import * as d3 from 'd3'; // penser a décommenter si l'on veut publier le composant
import { SparqlDataFetcher } from './SparqlDataFetcher.js';
import { DomainCalculator } from './DomainCalculator.js';

export class VisGraph extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.nodes = [];
    this.links = [];
    this.width = 800;
    this.height = 600;
    this.selectedNode = null;
    this.tooltipTimeout = null;
    this.currentEndpoint = null; // Stocker l'endpoint actif
    this.currentProxyUrl = null; // Stocker l'URL du proxy configurée
    this.sparqlData = null; // Stocker les données brutes de la requête SPARQL
    
    // Instance du fetcher pour récupérer les données SPARQL
    this.sparqlFetcher = new SparqlDataFetcher();
    
    // Instance du calculateur de domaines pour l'encoding visuel
    this.domainCalculator = new DomainCalculator();
    
    // Organisation des attributs privés (requête, endpoint, etc.)
    this.internalData = new WeakMap();
    this.internalData.set(this, {}); // Initialisation du stockage interne

    // Encoding visuel VEGA - configuration par défaut
    this.visualEncoding = this.getDefaultEncoding();
  }

  /**
   * Configuration VEGA par défaut pour l'encoding visuel.
   * Peut être adaptée dynamiquement selon les variables SPARQL disponibles.
   */
  getDefaultEncoding() {
    return {
      "description": "Configuration d'encoding visuel par défaut",
      "width": 800,
      "height": 600,
      "autosize": "none",
      "nodes": {
        "field": ["source"], // array avec minimum 1 valeur
        "color": {
          "field": "type", // Colorer les nœuds par propriété
          "scale": {
            "type": "ordinal",
            "domain": ["uri", "literal"],
            "range": ["#69b3a2", "#ff7f0e"]
          }
        },
        "size": {
          "field": "connections", // Tailler les nœuds par nombre de connexions
          "scale": {
            "type": "linear",
            "domain": [0, 10],
            "range": [8, 25] // Rayon en pixels
          }
        }
      },
      "links": {
        "field": {source: "source", target: "target"}, // Lien directionnel par défaut
        "distance": 100, // Distance par défaut entre les nœuds
        "width": {
          "value": 1.5
        },
        "color": {
          "value": "#999"
        }
      }
    };
  }

  /**
   * Crée un encoding adaptatif basé sur les variables SPARQL disponibles.
   * @param {Array} sparqlVars - Les variables disponibles dans les données SPARQL
   * @returns {Object} Encoding adapté aux données
   */
  createAdaptiveEncoding(sparqlVars) {
    if (!sparqlVars || sparqlVars.length === 0) {
      return this.getDefaultEncoding();
    }

    const defaultEncoding = this.getDefaultEncoding();
    
    // Adapter le field des nœuds à la première variable SPARQL (format array)
    defaultEncoding.nodes.field = [sparqlVars[0]];
    
    // Adapter le field des liens si on a au moins 2 variables
    if (sparqlVars.length > 1) {
      defaultEncoding.links.field = {source: sparqlVars[0], target: sparqlVars[1]};
    } else {
      // Si une seule variable, créer un lien sémantique
      defaultEncoding.links.field = sparqlVars[0];
    }
    
    console.log(`[vis-graph] 🎯 Encoding adaptatif créé avec les variables SPARQL:`, sparqlVars);
    console.log(`[vis-graph] -> Nœuds basés sur:`, defaultEncoding.nodes.field);
    console.log(`[vis-graph] -> Liens basés sur:`, defaultEncoding.links.field);
    
    return defaultEncoding;
  }

  /**
   * Améliore l'encoding adaptatif avec détection automatique des champs de classification
   * et génération des palettes de couleurs. Appelée après la transformation des données.
   * @param {Array} sparqlVars - Les variables SPARQL disponibles
   * @param {Array} nodeData - Les données des nœuds à analyser
   */
  enhanceAdaptiveEncodingWithClassification(sparqlVars, nodeData = null) {
    const nodes = nodeData || this.nodes;
    if (!nodes || nodes.length === 0 || !sparqlVars) {
      console.log('[vis-graph] ⚠️ Pas de données pour améliorer l\'encoding adaptatif');
      return;
    }

    console.log('[vis-graph] 🔍 Amélioration de l\'encoding adaptatif avec détection automatique...');

    // Détecter le meilleur champ de classification pour les couleurs des nœuds
    const bestClassificationField = this.detectClassificationField(nodes, sparqlVars);
    
    if (bestClassificationField.field !== 'type') {
      console.log(`[vis-graph] 🎨 Remplacement du champ couleur "type" par "${bestClassificationField.field}"`);
      
      // Mettre à jour l'encoding avec le meilleur champ détecté
      this.visualEncoding.nodes.color.field = bestClassificationField.field;
      
      // Générer automatiquement le domaine et la palette de couleurs
      const fieldValues = this.domainCalculator.getVal(nodes, bestClassificationField.field);
      const sortedDomain = this.domainCalculator.sortDomainValues(fieldValues, 'ordinal');
      const colorPalette = this.generateColorPalette(sortedDomain.length);
      
      // Mettre à jour l'échelle de couleur
      this.visualEncoding.nodes.color.scale = {
        type: 'ordinal',
        domain: sortedDomain,
        range: colorPalette
      };
      
      console.log(`[vis-graph] ✅ Encoding couleur mis à jour:`);
      console.log(`[vis-graph] -> Champ: "${bestClassificationField.field}"`);
      console.log(`[vis-graph] -> Domaine (${sortedDomain.length} valeurs):`, sortedDomain);
      console.log(`[vis-graph] -> Palette:`, colorPalette);
      
      // Émettre un événement pour notifier le changement
      this.dispatchEvent(new CustomEvent('encodingEnhanced', {
        detail: {
          field: bestClassificationField.field,
          reason: bestClassificationField.reason,
          domain: sortedDomain,
          palette: colorPalette,
          timestamp: new Date().toISOString()
        },
        bubbles: true
      }));
    } else {
      console.log('[vis-graph] 📝 Conservation du champ couleur "type" (aucun meilleur champ trouvé)');
    }
  }

  // --- GETTERS ET SETTERS POUR L'API PUBLIQUE ---

  /**
   * Définit la configuration pour l'encoding visuel.
   * Cette méthode déclenche une nouvelle transformation et un nouveau rendu.
   * @param {object} encoding - La configuration d'encoding au format JSON.
   */
  setEncoding(encoding) {
    console.log('[vis-graph] 🎨 New encoding received.');
    
    // Vérifier les problèmes potentiels d'encoding
    if (encoding?.links?.field) {
      console.log('[vis-graph] 🔍 Validation de l\'encoding des liens...');
      
      // Avertissement sur les clés dupliquées
      console.warn('[vis-graph] ⚠️ IMPORTANT: Si vous avez défini "field" plusieurs fois dans links (ex: field: "goLabel" puis field: {source: "x", target: "y"}), JavaScript ne garde que la dernière définition !');
      
      if (typeof encoding.links.field === 'string') {
        console.log('[vis-graph] 📝 Lien sémantique détecté avec field:', encoding.links.field);
      } else if (typeof encoding.links.field === 'object') {
        console.log('[vis-graph] 📝 Lien directionnel détecté avec field:', encoding.links.field);
      }
    }
    
    // Si encoding est null, réinitialiser à l'encoding adaptatif ou par défaut
    if (encoding === null) {
      if (this.sparqlData && this.sparqlData.head && this.sparqlData.head.vars) {
        // Créer un encoding adaptatif basé sur les données SPARQL existantes
        this.visualEncoding = this.createAdaptiveEncoding(this.sparqlData.head.vars);
        console.log('[vis-graph] 🔄 Reset to adaptive encoding based on existing SPARQL data');
      } else {
        // Pas de données SPARQL, utiliser l'encoding par défaut
        this.visualEncoding = this.getDefaultEncoding();
        console.log('[vis-graph] 🔄 Reset to default encoding (no SPARQL data)');
      }
    } else {
      // Valider l'encoding par rapport aux données SPARQL disponibles
      if (this.sparqlData && this.sparqlData.head && this.sparqlData.head.vars) {
        const validationResult = this.validateEncoding(encoding, this.sparqlData.head.vars);
        if (!validationResult.isValid) {
          console.error('[vis-graph] ❌ Validation échouée:', validationResult.warnings);
          // Afficher les erreurs à l'utilisateur
          validationResult.warnings.forEach(warning => {
            this.showNotification(warning, 'error');
          });
          // Arrêter le processus - pas de fallback ni de rendu
          return;
        }
      }
      
      this.visualEncoding = { ...this.getDefaultEncoding(), ...encoding };
    }

    if (this.sparqlData) {
        console.log('[vis-graph] 🔄 Re-transforming and re-rendering with new encoding.');
        try {
          const transformedData = this.transformSparqlResults(this.sparqlData);
          this.nodes = transformedData.nodes;
          this.links = transformedData.links;
          
          // IMPORTANT: Mettre à jour l'encoding avec les domaines calculés automatiquement
          this.updateEncodingWithCalculatedDomains();
          
          this.render();
        } catch (error) {
          console.error('[vis-graph] ❌ Erreur lors de la transformation des données:', error.message);
          this.showNotification(error.message, 'error');
          return;
        }
    } else if (this.nodes && this.nodes.length > 0) {
        // Cas où on a déjà des données mais pas de sparqlData (données manuelles)
        console.log('[vis-graph] 🔄 Mise à jour de l\'encoding avec données existantes');
        
        // Mettre à jour l'encoding avec les domaines calculés
        this.updateEncodingWithCalculatedDomains();
        
        this.render();
    } else {
        console.log('[vis-graph] ⚠️ Aucune donnée disponible pour appliquer le nouvel encoding');
    }
  }

  /**
   * Valide un encoding par rapport aux variables SPARQL disponibles.
   * @param {Object} encoding - L'encoding à valider
   * @param {Array} sparqlVars - Les variables SPARQL disponibles
   * @returns {Object} Résultat de validation avec isValid et warnings
   */
  validateEncoding(encoding, sparqlVars) {
    const warnings = [];
    let isValid = true;

    // Valider le field des nœuds (doit être un array avec minimum 1 valeur)
    if (encoding.nodes?.field) {
      const nodeField = encoding.nodes.field;
      if (!Array.isArray(nodeField) || nodeField.length === 0) {
        console.error('[vis-graph] ❌ Le field des nœuds doit être un array avec au moins une valeur');
        warnings.push('Le field des nœuds doit être un array avec au moins une valeur');
        isValid = false;
      } else {
        // Valider chaque champ du tableau
        nodeField.forEach((field, index) => {
          if (field !== "connections" && field !== "type" && !sparqlVars.includes(field)) {
            warnings.push(`Field nœud #${index+1} "${field}" n'existe pas dans les données. Variables disponibles: ${sparqlVars.join(', ')}`);
            isValid = false;
          }
        });
      }
    }

    // Note importante : JavaScript écrase automatiquement les clés dupliquées
    // Si l'utilisateur définit field deux fois, seule la dernière sera conservée
    // On ajoute un avertissement préventif
    if (encoding.links?.field) {
      console.warn('[vis-graph] ⚠️ Attention: si vous avez défini "field" plusieurs fois dans links, JavaScript ne garde que la dernière définition');
    }

    // Valider le field des liens
    if (encoding.links?.field) {
      const linkField = encoding.links.field;
      
      // Cas 1: Lien sémantique (string)
      if (typeof linkField === 'string') {
        if (!sparqlVars.includes(linkField)) {
          warnings.push(`Field lien sémantique "${linkField}" n'existe pas dans les données. Variables disponibles: ${sparqlVars.join(', ')}`);
          isValid = false;
        }
        
        // Vérifier qu'on a au moins 1 nœud pour les liens sémantiques
        if (encoding.nodes?.field && Array.isArray(encoding.nodes.field)) {
          if (encoding.nodes.field.length < 1) {
            console.error('[vis-graph] ❌ Pour les liens sémantiques, il faut au moins 1 variable dans le field des nœuds');
            warnings.push('Pour les liens sémantiques, il faut au moins 1 variable dans le field des nœuds');
            isValid = false;
          } else if (encoding.nodes.field.length === 1) {
            console.log('[vis-graph] 📊 Liens sémantiques avec 1 seule variable - utilisation de la cooccurrence automatique');
            // Dans ce cas, on calculera automatiquement la cooccurrence dans transformSparqlResults
          }
        } else {
          console.error('[vis-graph] ❌ Pour les liens sémantiques, le field des nœuds doit être un array avec au moins 1 variable');
          warnings.push('Pour les liens sémantiques, le field des nœuds doit être un array avec au moins 1 variable');
          isValid = false;
        }
      }
      // Cas 2: Lien directionnel (objet {source, target})
      else if (typeof linkField === 'object' && linkField !== null) {
        if (!linkField.source || !linkField.target) {
          console.error('[vis-graph] ❌ Le field directionnel des liens doit avoir les propriétés "source" et "target"');
          warnings.push('Le field directionnel des liens doit avoir les propriétés "source" et "target"');
          isValid = false;
        } else {
          if (!sparqlVars.includes(linkField.source)) {
            warnings.push(`Variable source "${linkField.source}" n'existe pas dans les données. Variables disponibles: ${sparqlVars.join(', ')}`);
            isValid = false;
          }
          if (!sparqlVars.includes(linkField.target)) {
            warnings.push(`Variable target "${linkField.target}" n'existe pas dans les données. Variables disponibles: ${sparqlVars.join(', ')}`);
            isValid = false;
          }
        }
      } else {
        console.error('[vis-graph] ❌ Le field des liens doit être soit une string (lien sémantique) soit un objet {source, target} (lien directionnel)');
        warnings.push('Le field des liens doit être soit une string soit un objet {source, target}');
        isValid = false;
      }
    }

    // Valider les fields dans les configurations de couleur et taille
    if (encoding.nodes?.color?.field) {
      const colorField = encoding.nodes.color.field;
      if (colorField !== "type" && colorField !== "connections" && !sparqlVars.includes(colorField)) {
        warnings.push(`Field couleur "${colorField}" n'existe pas dans les données. Variables disponibles: ${sparqlVars.join(', ')}`);
      }
    }

    if (encoding.nodes?.size?.field) {
      const sizeField = encoding.nodes.size.field;
      if (sizeField !== "connections" && !sparqlVars.includes(sizeField)) {
        warnings.push(`Field taille "${sizeField}" n'existe pas dans les données. Variables disponibles: ${sparqlVars.join(', ')}`);
      }
    }

    return { isValid, warnings };
  }

  /**
   * Met à jour l'encoding visuel interne avec les domaines calculés automatiquement.
   * Cette méthode modifie directement this.visualEncoding.
   */
  updateEncodingWithCalculatedDomains() {
    if (!this.nodes || this.nodes.length === 0) {
      console.warn('[vis-graph] ⚠️ Aucune donnée disponible pour calculer les domaines');
      return;
    }

    console.log('[vis-graph] 🔄 Mise à jour des domaines dans l\'encoding interne...');
    console.log('[vis-graph] 🔍 Debug - encoding actuel:', this.visualEncoding);

    // --- DOMAINES DES NŒUDS ---
    
    // Domaine pour la couleur des nœuds
    console.log('[vis-graph] 🔍 Debug couleur - Conditions:');
    console.log('  -> nodes.color.field:', this.visualEncoding.nodes?.color?.field);
    console.log('  -> nodes.color.scale:', this.visualEncoding.nodes?.color?.scale);
    
    if (this.visualEncoding.nodes?.color?.field && this.visualEncoding.nodes?.color?.scale) {
      const colorField = this.visualEncoding.nodes.color.field;
      const userDomain = this.visualEncoding.nodes.color.scale.domain;
      const scaleType = this.visualEncoding.nodes.color.scale.type || 'ordinal';
      
      console.log(`[vis-graph] 🎨 Calcul du domaine couleur pour le champ "${colorField}" avec domaine utilisateur:`, userDomain);
      
      this.visualEncoding.nodes.color.scale.domain = this.domainCalculator.getDomain(
        this.nodes, 
        colorField, 
        userDomain, 
        scaleType
      );
      
      console.log(`[vis-graph] 🎨 Domaine couleur nœuds mis à jour:`, this.visualEncoding.nodes.color.scale.domain);
    } else {
      console.log('[vis-graph] ⚠️ Pas de configuration couleur nœuds valide - conditions non remplies');
    }
    
    // Domaine pour la taille des nœuds
    if (this.visualEncoding.nodes?.size?.field && this.visualEncoding.nodes?.size?.scale) {
      const sizeField = this.visualEncoding.nodes.size.field;
      const userDomain = this.visualEncoding.nodes.size.scale.domain;
      const scaleType = this.visualEncoding.nodes.size.scale.type || 'linear';
      
      this.visualEncoding.nodes.size.scale.domain = this.domainCalculator.getDomain(
        this.nodes, 
        sizeField, 
        userDomain, 
        scaleType
      );
      
      console.log(`[vis-graph] 📏 Domaine taille nœuds mis à jour:`, this.visualEncoding.nodes.size.scale.domain);
    }

    // --- DOMAINES DES LIENS ---
    
    // Domaine pour la couleur des liens
    if (this.visualEncoding.links?.color?.field && this.visualEncoding.links?.color?.scale && this.links) {
      const colorField = this.visualEncoding.links.color.field;
      const userDomain = this.visualEncoding.links.color.scale.domain;
      const scaleType = this.visualEncoding.links.color.scale.type || 'ordinal';
      
      this.visualEncoding.links.color.scale.domain = this.domainCalculator.getDomain(
        this.links, 
        colorField, 
        userDomain, 
        scaleType
      );
      
      console.log(`[vis-graph] 🌈 Domaine couleur liens mis à jour:`, this.visualEncoding.links.color.scale.domain);
    }

    console.log('[vis-graph] ✅ Encoding interne mis à jour avec domaines calculés');
    
    // Émettre un événement personnalisé pour notifier que les domaines ont été mis à jour
    this.dispatchEvent(new CustomEvent('domainsCalculated', {
      detail: {
        encoding: this.getEncoding(),
        timestamp: new Date().toISOString()
      },
      bubbles: true
    }));
  }

  /**
   * Retourne l'encoding visuel avec les domaines calculés automatiquement.
   * Les domaines sont maintenus à jour automatiquement dans this.visualEncoding.
   * @returns {Object} L'encoding avec domaines à jour
   */
  getEncoding() {
    // Créer une copie de l'encoding pour éviter de modifier l'original
    const encodingCopy = JSON.parse(JSON.stringify(this.visualEncoding));
    
    // Afficher les métadonnées en console uniquement
    const metadata = {
      domainsUpdated: true,
      lastUpdate: new Date().toISOString(),
      dataStats: {
        nodeCount: this.nodes ? this.nodes.length : 0,
        linkCount: this.links ? this.links.length : 0
      }
    };

    console.log('[vis-graph] 📋 Encoding avec domaines à jour retourné');
    console.log('[vis-graph] 📊 Métadonnées:', metadata);
    
    return encodingCopy; // Sans les métadonnées
  }

  set sparqlQuery(query) {
    const data = this.internalData.get(this) || {};
    data.sparqlQuery = query;
    this.internalData.set(this, data);
  }
  
  get sparqlQuery() {
    return this.internalData.get(this)?.sparqlQuery;
  }

  set sparqlEndpoint(endpoint) {
    const data = this.internalData.get(this) || {};
    data.sparqlEndpoint = endpoint;
    this.internalData.set(this, data);
  }
  
  get sparqlEndpoint() {
    return this.internalData.get(this)?.sparqlEndpoint;
  }

  set sparqlResult(jsonData) {
    const data = this.internalData.get(this) || {};
    data.sparqlResult = jsonData;
    this.internalData.set(this, data);
  }

  get sparqlResult() {
    return this.internalData.get(this)?.sparqlResult;
  }

  set encoding(mapping) {
    const data = this.internalData.get(this) || {};
    data.encoding = mapping;
    this.internalData.set(this, data);
    this.setEncoding(mapping);
  }

  get encoding() {
    return this.internalData.get(this)?.encoding;
  }

  set proxy(url) {
    const data = this.internalData.get(this) || {};
    data.proxy = url;
    this.internalData.set(this, data);
  }

  get proxy() {
    return this.internalData.get(this)?.proxy;
  }

  /**
   * Lance la récupération des données, leur transformation et le rendu du graphe.
   * Cette méthode est le point d'entrée principal et fonctionne sans paramètres.
   */
  async launch() {
    console.log('[vis-graph] 🚀 Lancement du processus de visualisation...');

    try {
      // 1. Appliquer l'encoding visuel personnalisé si défini
      if (this.encoding && this.encoding !== this.getDefaultEncoding()) {
        console.log('[vis-graph] -> Application de l\'encoding visuel personnalisé');
        this.setEncoding(this.encoding);
      }

      // 2. Priorité 1: Utiliser sparqlResult (données JSON pré-formatées)
      if (this.sparqlResult) {
        console.log('[vis-graph] -> Priorité 1: Traitement des données JSON (sparqlResult)');
        return await this.setSparqlResult(this.sparqlResult);
      }

      // 3. Priorité 2: Exécuter une requête SPARQL
      if (this.sparqlEndpoint && this.sparqlQuery) {
        console.log('[vis-graph] -> Priorité 2: Exécution de la requête SPARQL');
        return await this.executeSparqlQuery();
      }

      // 4. Priorité 3: Utiliser les données manuelles si elles existent
      if (this.nodes && this.nodes.length > 0) {
        console.log('[vis-graph] -> Priorité 3: Rendu des données manuelles existantes');
        this.render();
        return { status: 'success', message: 'Données manuelles rendues.' };
      }

      // Si aucune source de données n'est configurée
      const errorMessage = 'Aucune source de données configurée. Définissez `sparqlResult`, `sparqlEndpoint`/`sparqlQuery`, ou `nodes`/`links` avant d\'appeler launch().';
      console.warn(`[vis-graph] ${errorMessage}`);
      throw new Error(errorMessage);

    } catch (error) {
      console.error('[vis-graph] ❌ Erreur lors du lancement:', error);
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Execute SPARQL query using the configured endpoint, query and proxy
   * This is the new simplified method that uses the getters/setters
   */
  async executeSparqlQuery() {// executeSparqlQuery()
    const endpoint = this.sparqlEndpoint;
    const query = this.sparqlQuery;
    const proxyUrl = this.proxy;
    
    if (!endpoint || !query) {
      throw new Error('Veuillez configurer sparqlEndpoint et sparqlQuery avant d\'exécuter la requête');
    }
    
    return await this.loadFromSparqlEndpoint(endpoint, query, null, proxyUrl);
  }

  /**
   * Liste des attributs à observer
   */
  static get observedAttributes() {
    return ['width', 'height'];
  }

  /**
   * Gestion des changements d'attributs
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === 'width') {
      this.width = parseInt(newValue) || 800;
      this.render();
    } else if (name === 'height') {
      this.height = parseInt(newValue) || 600;
      this.render();
    }
  }

  /**
   * Initialisation quand le composant est ajouté au DOM
   */
  connectedCallback() {
    this.render();
  }

  /**
   * Définit manuellement les données (priorité absolue)
   */
  setData(nodes, links) {
    console.log('[vis-graph] 📋 Définition manuelle des données');
    this.nodes = nodes;
    this.links = links;
    
    // Vider le cache du calculateur de domaines car les données ont changé
    if (this.domainCalculator) {
      this.domainCalculator.clearCache();
    }
    
    // Mettre à jour l'encoding avec les domaines calculés
    this.updateEncodingWithCalculatedDomains();
    
    this.render();
  }

  /**
   * Charge des données JSON pré-formatées
   */
  setSparqlResult(jsonData) {
    console.log('[vis-graph] 📄 Chargement de données JSON pré-formatées');
    return this.loadFromSparqlEndpoint(null, null, jsonData);
  }

  /**
   * Affiche une erreur proxy en créant un panneau dans l'interface
   */
  showProxyErrorPanel() {
    const oldPanel = this.shadowRoot.querySelector('.node-details-panel');
    if (oldPanel) {
      oldPanel.remove();
    }
    
    const errorPanel = document.createElement('div');
    errorPanel.className = 'proxy-error-panel';
    errorPanel.innerHTML = `
      <div class="error-header">
        <h2>🚫 Configuration Proxy Requise</h2>
        <button class="close-btn">×</button>
      </div>
      <div class="error-content">
        <div class="error-message">
          <p><strong>Le composant n'a pas pu accéder directement à l'endpoint SPARQL à cause des restrictions CORS.</strong></p>
          <p>Un proxy local est nécessaire pour contourner ces limitations.</p>
        </div>
        <div class="error-actions">
          <button class="doc-button" onclick="window.open('https://github.com/Ye4hL0w/test-visualisator/blob/main/docs/proxy-setup.md', '_blank')">
            📖 Guide de configuration du proxy
          </button>
        </div>
      </div>
    `;
    
    // Gestionnaire de fermeture
    errorPanel.querySelector('.close-btn').addEventListener('click', () => {
      errorPanel.remove();
    });
    
    this.shadowRoot.querySelector('.graph-container').appendChild(errorPanel);
  }

  /**
   * Charge les données avec hiérarchie : JSON direct > endpoint > proxy
   * MÉTHODE PUBLIQUE : C'est l'interface principale pour les utilisateurs du composant
   * Le composant délègue la récupération des données au SparqlDataFetcher puis transforme les résultats
   */
  async loadFromSparqlEndpoint(endpoint, query, jsonData = null, proxyUrl = null) {
    try {
      this.currentEndpoint = endpoint;
      this.currentProxyUrl = proxyUrl;
      
      const result = await this.sparqlFetcher.fetchSparqlData(
        endpoint, 
        query, 
        jsonData,
        proxyUrl,
        () => this.showProxyErrorPanel(), // Callback pour afficher le panneau d'erreur proxy
        (message, type) => this.showNotification(message, type) // Callback pour les notifications
      );
      
      if (result.status === 'success') {
        this.sparqlData = result.data; // Conserver les données brutes

        if (result.method === 'direct-json') {
          // Données JSON directes
          try {
            const transformedData = this.transformSparqlResults(result.data);
            this.nodes = transformedData.nodes;
            this.links = transformedData.links;
            
            // Mettre à jour l'encoding avec les domaines calculés
            this.updateEncodingWithCalculatedDomains();
            
            this.render();
            
            return {
              ...result,
              message: `Données chargées depuis JSON: ${this.nodes.length} nœuds, ${this.links.length} liens`,
              data: transformedData
            };
          } catch (error) {
            console.error('[vis-graph] ❌ Erreur lors de la transformation (JSON):', error.message);
            this.showNotification(error.message, 'error');
            return {
              status: 'error',
              message: error.message,
              data: null
            };
          }
        } else {
          // Données depuis endpoint/proxy
          try {
            const transformedData = this.transformSparqlResults(result.data);
            this.nodes = transformedData.nodes;
            this.links = transformedData.links;
            
            // Mettre à jour l'encoding avec les domaines calculés
            this.updateEncodingWithCalculatedDomains();
            
            this.render();
            
            return {
              ...result,
              message: `Données chargées: ${this.nodes.length} nœuds, ${this.links.length} liens`,
              data: transformedData
            };
          } catch (error) {
            console.error('[vis-graph] ❌ Erreur lors de la transformation (SPARQL):', error.message);
            this.showNotification(error.message, 'error');
            return {
              status: 'error',
              message: error.message,
              data: null
            };
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('[vis-graph] ❌ Erreur lors du chargement des données:', error.message);
      return {
        status: 'error',
        message: `Erreur: ${error.message}`,
        data: null,
        rawData: null
      };
    }
  }

  /**
   * Essaie de déterminer le label le plus pertinent pour un nœud à partir d'un binding SPARQL.
   * @param {object} entityBindingValue - L'objet binding pour l'entité (ex: binding[sourceVar]).
   * @param {string} entityVarName - Le nom de la variable SPARQL pour l'entité (ex: "gene", "proteinOrtholog").
   * @param {object} currentBinding - L'ensemble du binding (la ligne de résultat SPARQL).
   * @param {string[]} allVars - Toutes les variables de la requête SPARQL.
   */
  _determineNodeLabelFromBinding(entityBindingValue, entityVarName, currentBinding, allVars) {
    const defaultId = this.extractIdFromBinding(entityBindingValue);

    if (!entityBindingValue) return defaultId;

    // Priorité 1: Valeur littérale de l'entité elle-même.
    if (entityBindingValue.type === 'literal') {
      return entityBindingValue.value;
    }

    // Si c'est une URI, chercher des labels associés.
    if (entityBindingValue.type === 'uri') {
      // Priorité 2: Labels conventionnels directs (ex: geneLabel pour gene).
      const directLabelSuffixes = ['Label', 'Name', 'Title', 'Term', 'Identifier', 'Id', 'Description'];
      for (const suffix of directLabelSuffixes) {
        const directLabelKey = entityVarName + suffix;
        if (currentBinding[directLabelKey] && currentBinding[directLabelKey].type === 'literal') {
          return currentBinding[directLabelKey].value;
        }
        // Essayer aussi avec la première lettre en minuscule pour le suffixe (ex: entityVarName + 'label')
        const directLabelKeyLowerSuffix = entityVarName + suffix.charAt(0).toLowerCase() + suffix.slice(1);
        if (currentBinding[directLabelKeyLowerSuffix] && currentBinding[directLabelKeyLowerSuffix].type === 'literal') {
          return currentBinding[directLabelKeyLowerSuffix].value;
        }
      }
      
      // Priorité 3: Labels descriptifs d'autres colonnes.
      let bestOtherLabel = null;
      let bestOtherLabelScore = -1;

      const descriptiveKeywords = {
        label: 5, name: 5, title: 5, term: 4, // Forte pertinence
        description: 3, summary: 3, comment: 3, text: 2, // Pertinence moyenne
        taxon: 2, species: 2, organism: 2, // Contexte taxonomique
        disease: 2, condition: 2, syndrome: 2, // Contexte maladie
        gene: 1, protein: 1, ensembl: 1, uniprot: 1, // Identifiants/types communs
        annotation: 1
      };

      for (const otherVar of allVars) {
        if (otherVar === entityVarName) continue; // Ne pas se considérer soi-même

        const otherVarBinding = currentBinding[otherVar];
        if (otherVarBinding && otherVarBinding.type === 'literal' && otherVarBinding.value) {
          const otherVarLower = otherVar.toLowerCase();
          let currentScore = 0;

          for (const keyword in descriptiveKeywords) {
            if (otherVarLower.includes(keyword)) {
              currentScore = Math.max(currentScore, descriptiveKeywords[keyword]);
            }
          }
          
          // Bonus si la variable est simplement "label", "name", "title"
          if (['label', 'name', 'title'].includes(otherVarLower)) currentScore += 2;

          if (currentScore > bestOtherLabelScore) {
            bestOtherLabelScore = currentScore;
            bestOtherLabel = otherVarBinding.value;
          } else if (currentScore === bestOtherLabelScore && bestOtherLabel && otherVarBinding.value.length < bestOtherLabel.length) {
            // En cas d'égalité de score, préférer le label le plus court (moins verbeux)
            bestOtherLabel = otherVarBinding.value;
          }
        }
      }

      if (bestOtherLabel) {
        return bestOtherLabel;
      }
    }

    // Priorité 4: Identifiant extrait.
    return defaultId;
  }
  
  /**
   * Transforme les résultats SPARQL en format compatible avec le graphe
   */
  transformSparqlResults(results) {
    if (!results.results || !results.results.bindings || results.results.bindings.length === 0) {
      console.warn("SPARQL results are empty or invalid");
      return { nodes: [], links: [] };
    }
    
    // CORRECTION: Nettoyer les données temporaires d'une transformation précédente
    this.cooccurrenceData = null;
    
    const nodesMap = new Map();
    const linksMap = new Map();
    
    const vars = results.head.vars;
    console.log("Available SPARQL variables:", vars);
    
    // Si aucun encoding personnalisé n'a été défini, utiliser l'encoding adaptatif
    let mapping = this.visualEncoding;
    const isDefaultEncoding = !this.encoding || 
      (this.encoding === this.getDefaultEncoding()) ||
      (this.visualEncoding.nodes.field === "source" && this.visualEncoding.links.field === "source-target");
    
    let usingAdaptiveEncoding = false;
    if (isDefaultEncoding) {
      mapping = this.createAdaptiveEncoding(vars);
      this.visualEncoding = mapping; // Mettre à jour l'encoding courant
      usingAdaptiveEncoding = true;
      console.log("[vis-graph] 🔄 Utilisation de l'encoding adaptatif");
    } else {
      console.log("[vis-graph] 🎨 Utilisation de l'encoding personnalisé");
    }

    // --- FIELD MAPPING ---
    // Résoudre les champs de mapping selon les variables SPARQL disponibles
    const resolvedMapping = this.resolveFieldMapping(mapping, vars);
    
    const sourceVar = resolvedMapping.sourceVar;
    const targetVar = resolvedMapping.targetVar;
    const linkType = resolvedMapping.linkType;
    
    // Pour les liens sémantiques, récupérer la variable sémantique
    const semanticVar = (linkType === 'semantic' && typeof mapping.links.field === 'string') ? mapping.links.field : null;
    
    console.log(`[vis-graph] 🎯 Mapping final - Source: '${sourceVar}', Target: '${targetVar}', Type: '${linkType}'`);
    if (semanticVar) {
      console.log(`[vis-graph] 🎯 Variable sémantique: '${semanticVar}'`);
    }

    results.results.bindings.forEach(binding => {
      if (binding[sourceVar]) {
        const sourceId = this.extractIdFromBinding(binding[sourceVar]);
        if (!nodesMap.has(sourceId)) {
          const node = {
            id: sourceId,
            label: this._determineNodeLabelFromBinding(binding[sourceVar], sourceVar, binding, vars),
            uri: binding[sourceVar].type === 'uri' ? binding[sourceVar].value : null,
            type: binding[sourceVar].type, // Default property for coloring
            originalData: {}
          };
          // Attach all data from the binding for potential encoding
          for (const varName of vars) {
            if (binding[varName]) {
              node[varName] = binding[varName].value;
              node.originalData[varName] = binding[varName];
            }
          }
          nodesMap.set(sourceId, node);
        }

        if (linkType === 'directional' && targetVar && binding[targetVar]) {
          const targetId = this.extractIdFromBinding(binding[targetVar]);
          if (!nodesMap.has(targetId)) {
            const node = {
              id: targetId,
              label: this._determineNodeLabelFromBinding(binding[targetVar], targetVar, binding, vars),
              uri: binding[targetVar].type === 'uri' ? binding[targetVar].value : null,
              type: binding[targetVar].type,
              originalData: {}
            };
            for (const varName of vars) {
              if (binding[varName]) {
                node[varName] = binding[varName].value;
                node.originalData[varName] = binding[varName];
              }
            }
            nodesMap.set(targetId, node);
          }

          const linkKey = `${sourceId}-${targetId}`;
          if (!linksMap.has(linkKey)) {
            const link = { 
              source: sourceId, 
              target: targetId,
              type: 'directional'
            };
            // Attach all data to the link as well
            for (const varName of vars) {
              if (binding[varName]) {
                link[varName] = binding[varName].value;
              }
            }
            linksMap.set(linkKey, link);
          }
        } else if (linkType === 'semantic' && targetVar && binding[targetVar]) {
          // Pour les liens sémantiques, créer un lien entre les nœuds avec le label sémantique
          const targetId = this.extractIdFromBinding(binding[targetVar]);
          if (!nodesMap.has(targetId)) {
            const node = {
              id: targetId,
              label: this._determineNodeLabelFromBinding(binding[targetVar], targetVar, binding, vars),
              uri: binding[targetVar].type === 'uri' ? binding[targetVar].value : null,
              type: binding[targetVar].type,
              originalData: {}
            };
            for (const varName of vars) {
              if (binding[varName]) {
                node[varName] = binding[varName].value;
                node.originalData[varName] = binding[varName];
              }
            }
            nodesMap.set(targetId, node);
          }

          const linkKey = `${sourceId}-${targetId}-semantic`;
          if (!linksMap.has(linkKey)) {
            const semanticLabel = (semanticVar && binding[semanticVar]) ? binding[semanticVar].value : 'relation';
            const link = { 
              source: sourceId, 
              target: targetId,
              type: 'semantic',
              semanticLabel: semanticLabel,
              tooltip: semanticLabel
            };
            // Attach all data to the link as well
            for (const varName of vars) {
              if (binding[varName]) {
                link[varName] = binding[varName].value;
              }
            }
            linksMap.set(linkKey, link);
          }
        } else if (linkType === 'semantic' && !targetVar) {
          // Mode cooccurrence : collecter les binding pour calculer les liens après
          if (!this.cooccurrenceData) {
            this.cooccurrenceData = new Map();
          }
          
          const semanticValue = (semanticVar && binding[semanticVar]) ? binding[semanticVar].value : 'relation';
          
          if (!this.cooccurrenceData.has(semanticValue)) {
            this.cooccurrenceData.set(semanticValue, new Set());
          }
          
          this.cooccurrenceData.get(semanticValue).add(sourceId);
        }
      }
    });

    // Traitement de la cooccurrence après avoir collecté toutes les données
    if (linkType === 'semantic' && !targetVar && this.cooccurrenceData) {
      console.log('[vis-graph] 📊 Calcul des liens de cooccurrence...');
      
      for (const [semanticValue, nodeSet] of this.cooccurrenceData.entries()) {
        const nodes = Array.from(nodeSet);
        
        // Créer des liens entre tous les nœuds qui partagent la même valeur sémantique
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const sourceNodeId = nodes[i];
            const targetNodeId = nodes[j];
            
            const linkKey = `${sourceNodeId}-${targetNodeId}-cooccurrence`;
            if (!linksMap.has(linkKey)) {
              const link = {
                source: sourceNodeId,
                target: targetNodeId,
                type: 'semantic',
                semanticLabel: semanticValue,
                tooltip: `Cooccurrence via ${semanticValue}`,
                cooccurrence: true
              };
              linksMap.set(linkKey, link);
            }
          }
        }
      }
      
      console.log(`[vis-graph] ✅ ${linksMap.size} liens de cooccurrence créés`);
      
      // Nettoyer les données temporaires
      this.cooccurrenceData = null;
    }

    const finalNodes = Array.from(nodesMap.values());
    const finalLinks = Array.from(linksMap.values());

    // Add connection counts to nodes, as this is a common encoding field
    const connectionCount = new Map();
    finalNodes.forEach(n => connectionCount.set(n.id, 0));
    finalLinks.forEach(l => {
      connectionCount.set(l.source, (connectionCount.get(l.source) || 0) + 1);
      connectionCount.set(l.target, (connectionCount.get(l.target) || 0) + 1);
    });
    finalNodes.forEach(n => n.connections = connectionCount.get(n.id));

    console.log(`[vis-graph] ✅ Transformation terminée: ${finalNodes.length} nœuds, ${finalLinks.length} liens`);
    
    // Vider le cache du calculateur de domaines car de nouvelles données ont été transformées
    if (this.domainCalculator) {
      this.domainCalculator.clearCache();
    }
    
    // Si on utilise l'encoding adaptatif, améliorer automatiquement avec détection des champs de classification
    if (usingAdaptiveEncoding) {
      try {
        this.enhanceAdaptiveEncodingWithClassification(vars, finalNodes);
      } catch (error) {
        console.warn('[vis-graph] ⚠️ Erreur lors de l\'amélioration de l\'encoding adaptatif:', error.message);
      }
    }
    
    return {
      nodes: finalNodes,
      links: finalLinks
    };
  }

  /**
   * Résout le mapping des champs selon les variables SPARQL disponibles.
   * @param {Object} mapping - La configuration d'encoding
   * @param {Array} vars - Les variables SPARQL disponibles
   * @returns {Object} Le mapping résolu avec sourceVar, targetVar et linkType
   */
  resolveFieldMapping(mapping, vars) {
    const linkField = mapping.links?.field;
    let sourceVar = vars[0]; // Par défaut, première variable
    let targetVar = vars.length > 1 ? vars[1] : null; // Par défaut, deuxième variable
    let linkType = 'directional'; // Par défaut directionnel

    // Si un field spécifique est défini pour les nœuds, utiliser le premier
    if (mapping.nodes?.field && Array.isArray(mapping.nodes.field) && mapping.nodes.field.length > 0) {
      sourceVar = mapping.nodes.field[0];
    }

    // Résoudre le mapping des liens
    if (linkField) {
      if (typeof linkField === 'string') {
        // Lien sémantique : une seule variable, mais on a besoin des variables des nœuds
        if (vars.includes(linkField)) {
          linkType = 'semantic';
          // Pour les liens sémantiques, on utilise les variables des nœuds
          if (mapping.nodes?.field && Array.isArray(mapping.nodes.field) && mapping.nodes.field.length >= 2) {
            sourceVar = mapping.nodes.field[0];
            targetVar = mapping.nodes.field[1];
          } else if (mapping.nodes?.field && Array.isArray(mapping.nodes.field) && mapping.nodes.field.length === 1) {
            // Cas spécial : une seule variable de nœud, on calculera la cooccurrence
            sourceVar = mapping.nodes.field[0];
            targetVar = null; // Sera calculé automatiquement par cooccurrence
            console.log(`[vis-graph] 📊 Mode cooccurrence activé pour la variable "${sourceVar}"`);
          } else {
            console.error(`[vis-graph] ❌ Pour les liens sémantiques, il faut au moins 1 variable dans nodes.field`);
            throw new Error('Pour les liens sémantiques, il faut au moins 1 variable dans nodes.field');
          }
        } else {
          console.warn(`[vis-graph] ⚠️ Variable de lien sémantique "${linkField}" non trouvée. Variables disponibles:`, vars);
        }
      } else if (typeof linkField === 'object' && linkField !== null) {
        // Lien directionnel : objet {source, target}
        if (linkField.source && linkField.target) {
          if (vars.includes(linkField.source) && vars.includes(linkField.target)) {
            sourceVar = linkField.source;
            targetVar = linkField.target;
            linkType = 'directional';
          } else {
            console.warn(`[vis-graph] ⚠️ Variables de lien directionnel non trouvées. Source: "${linkField.source}", Target: "${linkField.target}". Variables disponibles:`, vars);
          }
        }
      }
    }

    return { sourceVar, targetVar, linkType };
  }
  
  /**
   * Extrait un identifiant d'un binding SPARQL
   */
  extractIdFromBinding(binding) {
    if (!binding) return "unknown";
    // Si la valeur liée est un littéral, sa "valeur" est son identifiant pour l'affichage si aucun autre label n'est trouvé.
    if (binding.type === 'literal') return binding.value;

    const value = binding.value;
    if (!value) return "unknown";

    // Gestion spécifique pour les liens OMA gateway.pl
    if (value.includes('gateway.pl') && value.includes('p1=')) {
      try {
        // Essayer d'extraire p1 proprement avec URLSearchParams
        // Il faut une base si l'URL est relative, mais ici on attend des URI complètes.
        const urlObj = new URL(value);
        const params = new URLSearchParams(urlObj.search);
        if (params.has('p1')) {
          return params.get('p1');
        }
      } catch (e) {
        // En cas d'échec du parsing d'URL (ex: URI malformée), tenter une extraction par regex
        const regexMatch = value.match(/p1=([^&]+)/);
        if (regexMatch && regexMatch[1]) {
          return regexMatch[1];
        }
      }
    }

    // Extraction générique par split sur / et #
    const parts = value.split(/[/#]/);
    let lastPart = parts.pop(); 

    // Si la dernière partie contient encore des paramètres query (ex: ?foo=bar), les enlever.
    if (lastPart && lastPart.includes('?')) {
        lastPart = lastPart.split('?')[0];
    }
    // Si lastPart est vide (ex: URI se terminant par /), essayer de prendre l'avant-dernière partie si elle existe.
    if (!lastPart && parts.length > 0) {
        lastPart = parts.pop();
    }

    return lastPart || value; // Retourner la dernière partie, ou la valeur originale en dernier recours.
  }

  /**
   * Exécute une requête SPARQL détaillée pour un nœud spécifique avec hiérarchie
   */
  async executeNodeQuery(node) {
    if (!node || !node.uri) {
      console.error("[vis-graph] ❌ Aucun URI disponible pour ce nœud");
      this.showNotification("Ce nœud n'a pas d'URI associé", 'error');
      return;
    }
    
    try {
      console.log(`[vis-graph] 🔍 Récupération des détails pour ${node.label}...`);
      this.showNotification(`Récupération des détails pour ${node.label}...`);
      
      const endpoint = this.currentEndpoint || this.getAttribute('endpoint') || 'https://dbpedia.org/sparql';
      const proxyUrl = this.currentProxyUrl || this.getAttribute('proxy-url'); // Récupérer URL du proxy
      const queries = this.buildInformativeQueries(node.uri);
      
      let allData = {
        descriptive: null,
        technical: null,
        relationships: null
      };
      
      console.log(`[vis-graph] Requêtes pour les détails du nœud ${node.label} (URI: ${node.uri}) sur l'endpoint: ${endpoint}`);
      if (proxyUrl) {
        console.log(`[vis-graph] URL du proxy configurée: ${proxyUrl}`);
      }

      for (const [queryType, queryContent] of Object.entries(queries)) {
        console.log(`[vis-graph] Exécution de la requête de type "${queryType}"`);
        console.log(`[vis-graph] Contenu de la requête ${queryType}:\n${queryContent}`);
        try {
          // Utiliser le sparqlFetcher avec hiérarchie endpoint > proxy
          const data = await this.sparqlFetcher.executeSparqlQueryWithFallback(
            endpoint, 
            queryContent,
            proxyUrl,
            () => this.showProxyErrorPanel(),
            (message, type) => this.showNotification(message, type)
          );
          allData[queryType] = data;
          console.log(`[vis-graph] ✅ Succès pour la requête ${queryType}`);
        } catch (error) {
          console.warn(`[vis-graph] ⚠️ Erreur pour la requête ${queryType}:`, error.message);
          this.showNotification(`Erreur lors de la récupération des données de type ${queryType}.`, 'error');
        }
      }
      
      this.displayRichNodeDetails(node, allData);
      return { status: 'success', data: allData };

    } catch (error) {
      console.error('[vis-graph] ❌ Erreur majeure lors de la récupération des détails du nœud:', error.message);
      this.showNotification(`Erreur: ${error.message}`, 'error');
      this.displayBasicNodeDetails(node); // Fallback
      return { status: 'error', message: error.message };
    }
  }
  
  /**
   * Construit des requêtes SPARQL informatives selon le type d'URI
   */
  buildInformativeQueries(uri) {
    const queries = {};
    
    // Requête pour informations descriptives (labels, définitions, commentaires)
    queries.descriptive = `
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      PREFIX dc: <http://purl.org/dc/elements/1.1/>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX foaf: <http://xmlns.com/foaf/0.1/>
      
      SELECT DISTINCT ?property ?value ?lang
      WHERE {
        <${uri}> ?property ?value .
        
        FILTER (
          ?property = rdfs:label ||
          ?property = rdfs:comment ||
          ?property = skos:prefLabel ||
          ?property = skos:altLabel ||
          ?property = skos:definition ||
          ?property = skos:note ||
          ?property = dc:title ||
          ?property = dcterms:title ||
          ?property = dc:description ||
          ?property = dcterms:description ||
          ?property = foaf:name
        )
        
        BIND(LANG(?value) as ?lang)
      }
      ORDER BY ?property
      LIMIT 100
    `;
    
    // Requête pour relations sémantiques
    queries.relationships = `
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX owl: <http://www.w3.org/2002/07/owl#>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      
      SELECT DISTINCT ?property ?value ?valueLabel
      WHERE {
        <${uri}> ?property ?value .
        
        FILTER (
          ?property = rdfs:subClassOf ||
          ?property = rdf:type ||
          ?property = skos:broader ||
          ?property = skos:narrower ||
          ?property = skos:related ||
          ?property = owl:sameAs ||
          ?property = owl:equivalentClass ||
          ?property = rdfs:seeAlso ||
          ?property = dcterms:isPartOf ||
          ?property = dcterms:hasPart
        )
        
        OPTIONAL {
          ?value rdfs:label ?valueLabel .
          FILTER(LANG(?valueLabel) = "" || LANGMATCHES(LANG(?valueLabel), "en") || LANGMATCHES(LANG(?valueLabel), "fr"))
        }
        OPTIONAL {
            ?value skos:prefLabel ?prefLabel .
            FILTER(LANG(?prefLabel) = "" || LANGMATCHES(LANG(?prefLabel), "en") || LANGMATCHES(LANG(?prefLabel), "fr"))
        }
        BIND(COALESCE(?valueLabel, ?prefLabel, "") AS ?valueLabel)

      }
      ORDER BY ?property
      LIMIT 50
    `;
    
    // Requête pour propriétés techniques et métadonnées
    queries.technical = `
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX owl: <http://www.w3.org/2002/07/owl#>
      PREFIX dc: <http://purl.org/dc/elements/1.1/>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX foaf: <http://xmlns.com/foaf/0.1/>
      
      SELECT DISTINCT ?property ?value ?valueType
      WHERE {
        <${uri}> ?property ?value .
        
        FILTER (
          ?property != rdfs:label &&
          ?property != rdfs:comment &&
          ?property != skos:prefLabel &&
          ?property != skos:altLabel &&
          ?property != skos:definition &&
          ?property != skos:note &&
          ?property != dc:title &&
          ?property != dcterms:title &&
          ?property != dc:description &&
          ?property != dcterms:description &&
          ?property != foaf:name &&
          ?property != rdfs:subClassOf &&
          ?property != rdf:type &&
          ?property != skos:broader &&
          ?property != skos:narrower &&
          ?property != skos:related &&
          ?property != owl:sameAs &&
          ?property != owl:equivalentClass &&
          ?property != rdfs:seeAlso &&
          ?property != dcterms:isPartOf &&
          ?property != dcterms:hasPart
        )
        
        BIND(
          IF(isLiteral(?value), "literal",
            IF(isURI(?value), "uri", "unknown")
          ) AS ?valueType
        )
      }
      ORDER BY ?property
      LIMIT 150
    `;
    
    return queries;
  }
  
  /**
   * Affiche les détails riches d'un nœud
   */
  displayRichNodeDetails(node, allData) {
    const oldPanel = this.shadowRoot.querySelector('.node-details-panel');
    if (oldPanel) {
      oldPanel.remove();
    }
    
    const panel = document.createElement('div');
    panel.className = 'node-details-panel';
    
    // En-tête
    const header = document.createElement('div');
    header.className = 'panel-header';
    
    const title = document.createElement('h2');
    title.textContent = node.label;
    title.style.margin = '0';
    title.style.fontSize = '18px';
    title.style.fontWeight = 'bold';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.className = 'close-btn';
    closeBtn.addEventListener('click', () => panel.remove());
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);
    
    // Contenu principal
    const content = document.createElement('div');
    content.className = 'panel-content';
    
    // Section informations de base (toujours affichée)
    this.addBasicInfoSection(content, node);
    
    // Section contexte du graphe (à partir des données originales du graphe)
    this.addGraphContextSection(content, node);
    
    // Section informations descriptives complètes
    if (allData.descriptive && allData.descriptive.results && allData.descriptive.results.bindings.length > 0) {
      this.addCompleteDescriptiveSection(content, allData.descriptive.results.bindings);
    }
    
    // Section relations complètes avec détails
    if (allData.relationships && allData.relationships.results && allData.relationships.results.bindings.length > 0) {
      this.addCompleteRelationshipsSection(content, allData.relationships.results.bindings);
    }
    
    // Section propriétés techniques complètes
    if (allData.technical && allData.technical.results && allData.technical.results.bindings.length > 0) {
      this.addCompleteTechnicalSection(content, allData.technical.results.bindings);
    }
    
    // Résumé des données récupérées
    this.addDataSummary(content, allData);
    
    panel.appendChild(content);
    this.shadowRoot.querySelector('.graph-container').appendChild(panel);
  }
  
  /**
   * Ajoute une section d'informations de base
   */
  addBasicInfoSection(container, node) {
    const section = document.createElement('div');
    section.className = 'info-section';
    section.style.marginBottom = '20px';
    
    const title = document.createElement('h3');
    title.textContent = 'Basic Information';
    title.style.borderBottom = '2px solid #007cba';
    title.style.paddingBottom = '5px';
    title.style.marginBottom = '15px';
    section.appendChild(title);
    
    this.addDetailedInfoRow(section, 'Label', node.label);
    this.addDetailedInfoRow(section, 'URI', node.uri, true);
    this.addDetailedInfoRow(section, 'Accession', this.extractAccessionFromURI(node.uri));
    

    
    const connections = this.links.filter(l => 
      l.source.id === node.id || l.target.id === node.id
    ).length;
    this.addDetailedInfoRow(section, 'Connections in Graph', connections.toString());
    
    container.appendChild(section);
  }
  
  /**
   * Ajoute une section de contexte du graphe basée sur les données originales.
   */
  addGraphContextSection(container, node) {
    if (!node.originalData) return;

    const graphContextInfo = this.extractGraphContext(node);
    if (graphContextInfo.length === 0) return;

    const section = document.createElement('div');
    section.className = 'info-section';
    section.style.marginBottom = '20px';
    
    const title = document.createElement('h3');
    title.textContent = 'Graph Context (from original data)';
    title.style.borderBottom = '2px solid #17a2b8';
    title.style.paddingBottom = '5px';
    title.style.marginBottom = '15px';
    section.appendChild(title);
    
    graphContextInfo.forEach(info => {
      this.addDetailedInfoRow(section, info.type, info.value, info.isUri);
    });
    
    container.appendChild(section);
  }
  
  /**
   * Extrait le contexte du graphe d'un nœud à partir de ses données originales.
   */
  extractGraphContext(node) {
    const context = [];
    if (!node.originalData || !this.sparqlData || !this.sparqlData.head || !this.sparqlData.head.vars) {
      return context;
    }

    const mainSparqlVars = this.sparqlData.head.vars;
    const sourceVar = mainSparqlVars[0];
    const targetVar = mainSparqlVars.length > 1 ? mainSparqlVars[1] : null;

    // Identifier les variables qui pourraient être des labels déjà utilisés pour le nœud principal
    // (pour éviter de les répéter dans le contexte)
    const potentialLabelVars = mainSparqlVars.filter(v => 
        v.toLowerCase().includes('label') || 
        v.toLowerCase().includes('name') || 
        v.toLowerCase().includes('title')
    );

    for (const [key, valueObj] of Object.entries(node.originalData)) {
      // Exclure les variables principales (source, target) et les variables de label probables
      // ainsi que les "meta-variables" comme type et lang qui sont attachées aux valeurs elles-mêmes.
      if (key !== sourceVar && 
          key !== targetVar && 
          !potentialLabelVars.includes(key) &&
          key !== 'type' && key !== 'lang' && // Clés ajoutées par SPARQL JSON pour le type/lang de la valeur
          valueObj && typeof valueObj.value !== 'undefined') { 
        
        context.push({
          type: this.getReadablePropertyName(key), 
          value: valueObj.value,
          isUri: valueObj.type === 'uri'
        });
      }
    }
    
    return context;
  }
  
  /**
   * Ajoute la section informations descriptives complètes
   */
  addCompleteDescriptiveSection(container, bindings) {
    const section = document.createElement('div');
    section.className = 'info-section';
    section.style.marginBottom = '20px';
    
    const title = document.createElement('h3');
    title.textContent = `Descriptive Information (${bindings.length} properties)`;
    title.style.borderBottom = '2px solid #28a745';
    title.style.paddingBottom = '5px';
    title.style.marginBottom = '15px';
    section.appendChild(title);
    
    bindings.forEach((binding, index) => {
      const propContainer = document.createElement('div');
      propContainer.style.marginBottom = '15px';
      propContainer.style.padding = '12px';
      propContainer.style.border = '1px solid #dee2e6';
      propContainer.style.borderRadius = '5px';
      propContainer.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
      
      // Nom de la propriété
      const propHeader = document.createElement('div');
      propHeader.style.display = 'flex';
      propHeader.style.justifyContent = 'space-between';
      propHeader.style.alignItems = 'center';
      propHeader.style.marginBottom = '8px';
      
      const propName = document.createElement('strong');
      propName.textContent = this.getReadablePropertyName(binding.property.value);
      propName.style.color = '#495057';
      propName.style.fontSize = '14px';
      propHeader.appendChild(propName);
      
      const propType = document.createElement('span');
      propType.textContent = binding.lang && binding.lang.value ? `[${binding.lang.value}]` : '[text]';
      propType.style.fontSize = '11px';
      propType.style.color = '#6c757d';
      propType.style.backgroundColor = '#e9ecef';
      propType.style.padding = '2px 6px';
      propType.style.borderRadius = '3px';
      propHeader.appendChild(propType);
      
      propContainer.appendChild(propHeader);
      
      // URI de la propriété
      const propUri = document.createElement('div');
      propUri.style.fontSize = '11px';
      propUri.style.color = '#6c757d';
      propUri.style.marginBottom = '8px';
      propUri.style.wordBreak = 'break-all';
      propUri.innerHTML = `Property URI: <a href="${binding.property.value}" target="_blank" style="color: #007cba;">${binding.property.value}</a>`;
      propContainer.appendChild(propUri);
      
      // Valeur
      const valueDiv = document.createElement('div');
      valueDiv.style.color = '#212529';
      valueDiv.style.fontSize = '13px';
      valueDiv.style.lineHeight = '1.5';
      valueDiv.style.padding = '8px';
      valueDiv.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
      valueDiv.style.borderRadius = '3px';
      valueDiv.style.wordBreak = 'break-word';
      valueDiv.textContent = binding.value.value;
      propContainer.appendChild(valueDiv);
      
      section.appendChild(propContainer);
    });
    
    container.appendChild(section);
  }
  
  /**
   * Ajoute la section relations complètes avec détails
   */
  addCompleteRelationshipsSection(container, bindings) {
    // Déduplication des relations basée sur propriété + valeur cible
    const uniqueRelations = new Map();
    bindings.forEach(binding => {
      const key = `${binding.property.value}|${binding.value.value}`;
      if (!uniqueRelations.has(key)) {
        uniqueRelations.set(key, binding);
      }
    });
    const deduplicatedBindings = Array.from(uniqueRelations.values());
    
    console.log(`[vis-graph] Déduplication des relations: ${bindings.length} → ${deduplicatedBindings.length}`);
    
    const section = document.createElement('div');
    section.className = 'info-section';
    section.style.marginBottom = '20px';
    
    const title = document.createElement('h3');
    title.textContent = `Relationships & Classifications (${deduplicatedBindings.length} relations)`;
    title.style.borderBottom = '2px solid #ffc107';
    title.style.paddingBottom = '5px';
    title.style.marginBottom = '15px';
    section.appendChild(title);
    
    // Expliquer la différence avec les connexions du graphe
    const explanation = document.createElement('div');
    explanation.style.backgroundColor = '#fff3cd';
    explanation.style.border = '1px solid #ffeaa7';
    explanation.style.borderRadius = '4px';
    explanation.style.padding = '8px';
    explanation.style.marginBottom = '15px';
    explanation.style.fontSize = '12px';
    explanation.innerHTML = `
      <strong>ℹ️ Note:</strong> These are <strong>semantic relationships</strong> from ontologies (what this term IS), 
      different from the <strong>graph connections</strong> (which entities are associated with this term in your data).
    `;
    section.appendChild(explanation);
    
    deduplicatedBindings.forEach((binding, index) => {
      const relationContainer = document.createElement('div');
      relationContainer.style.marginBottom = '15px';
      relationContainer.style.padding = '12px';
      relationContainer.style.border = '1px solid #ffc107';
      relationContainer.style.borderRadius = '5px';
      relationContainer.style.backgroundColor = index % 2 === 0 ? '#fff8e1' : '#ffffff';
      
      // Type de relation avec explication
      const relationHeader = document.createElement('div');
      relationHeader.style.display = 'flex';
      relationHeader.style.justifyContent = 'space-between';
      relationHeader.style.alignItems = 'center';
      relationHeader.style.marginBottom = '8px';
      
      const relationType = document.createElement('strong');
      relationType.textContent = this.getReadablePropertyName(binding.property.value);
      relationType.style.color = '#856404';
      relationType.style.fontSize = '14px';
      relationHeader.appendChild(relationType);
      
      const relationBadge = document.createElement('span');
      relationBadge.textContent = '[SEMANTIC]';
      relationBadge.style.fontSize = '10px';
      relationBadge.style.color = '#856404';
      relationBadge.style.backgroundColor = '#ffc107';
      relationBadge.style.padding = '2px 6px';
      relationBadge.style.borderRadius = '3px';
      relationHeader.appendChild(relationBadge);
      
      relationContainer.appendChild(relationHeader);
      
      // URI de la propriété de relation
      const propUri = document.createElement('div');
      propUri.style.fontSize = '11px';
      propUri.style.color = '#6c757d';
      propUri.style.marginBottom = '8px';
      propUri.style.wordBreak = 'break-all';
      propUri.innerHTML = `Relation URI: <a href="${binding.property.value}" target="_blank" style="color: #007cba;">${binding.property.value}</a>`;
      relationContainer.appendChild(propUri);
      
      // Entité liée
      const targetContainer = document.createElement('div');
      targetContainer.style.padding = '10px';
      targetContainer.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
      targetContainer.style.borderRadius = '4px';
      targetContainer.style.border = '1px solid rgba(255, 193, 7, 0.3)';
      
      // Label de l'entité liée (si disponible)
      if (binding.valueLabel && binding.valueLabel.value) {
        const targetLabel = document.createElement('div');
        targetLabel.style.fontWeight = 'bold';
        targetLabel.style.color = '#212529';
        targetLabel.style.fontSize = '14px';
        targetLabel.style.marginBottom = '6px';
        targetLabel.textContent = `➤ ${binding.valueLabel.value}`;
        targetContainer.appendChild(targetLabel);
        
        const ontologySourceText = this.getSimpleOntologySource(binding.value.value);
        if (ontologySourceText) {
          const sourceDiv = document.createElement('div');
          sourceDiv.style.fontSize = '11px';
          sourceDiv.style.color = '#6c757d';
          sourceDiv.style.marginBottom = '6px';
          sourceDiv.innerHTML = `📚 <strong>Source:</strong> ${ontologySourceText}`;
          targetContainer.appendChild(sourceDiv);
        }
      }
      
      // URI de l'entité liée
      const targetUri = document.createElement('div');
      targetUri.style.fontSize = '11px';
      targetUri.style.color = '#495057';
      targetUri.style.wordBreak = 'break-all';
      targetUri.innerHTML = `🔗 Target URI: <a href="${binding.value.value}" target="_blank" style="color: #007cba;">${binding.value.value}</a>`;
      targetContainer.appendChild(targetUri);
      
      relationContainer.appendChild(targetContainer);
      section.appendChild(relationContainer);
    });
    
    container.appendChild(section);
  }
  
  /**
   * Extrait une information de source simplifiée depuis une URI (domaine ou préfixe connu).
   */
  getSimpleOntologySource(uri) {
    if (!uri || typeof uri !== 'string') return 'Unknown Source';

    // Priorité aux préfixes bien connus pour les ontologies courantes
    const knownPrefixes = {
      'http://www.w3.org/1999/02/22-rdf-syntax-ns#': 'RDF',
      'http://www.w3.org/2000/01/rdf-schema#': 'RDFS',
      'http://www.w3.org/2002/07/owl#': 'OWL',
      'http://www.w3.org/2004/02/skos/core#': 'SKOS',
      'http://purl.org/dc/elements/1.1/': 'DC',
      'http://purl.org/dc/terms/': 'DCTERMS',
      'http://xmlns.com/foaf/0.1/': 'FOAF',
      'http://purl.obolibrary.org/obo/GO_': 'GO (OBO)',       // Gene Ontology
      'http://purl.obolibrary.org/obo/DOID_': 'DOID (OBO)',   // Human Disease Ontology
      'http://purl.obolibrary.org/obo/CHEBI_': 'ChEBI (OBO)', // Chemical Entities of Biological Interest
      'http://purl.obolibrary.org/obo/CL_': 'CL (OBO)',       // Cell Ontology
      'http://purl.obolibrary.org/obo/PR_': 'PRO (OBO)',      // Protein Ontology
      'http://purl.obolibrary.org/obo/UBERON_': 'Uberon (OBO)', // Uber-anatomy ontology
      'http://purl.obolibrary.org/obo/SO_': 'SO (OBO)',       // Sequence Ontology
      'http://purl.obolibrary.org/obo/NCBITaxon_': 'NCBI Taxonomy (OBO)',
      'http://purl.obolibrary.org/obo/RO_': 'RO (OBO)', // Relations Ontology
      'http://purl.obolibrary.org/obo/BFO_': 'BFO (OBO)', // Basic Formal Ontology
      'http://purl.uniprot.org/core/': 'UniProt Core',
      'http://rdf.ebi.ac.uk/terms/ensembl/' : 'Ensembl (EBI)',
      'http://www.ebi.ac.uk/ols/ontologies/': 'OLS (EBI)'
    };

    for (const prefix in knownPrefixes) {
      if (uri.startsWith(prefix)) {
        return knownPrefixes[prefix];
      }
    }

    // Si aucun préfixe connu, essayer d'extraire le nom de domaine
    try {
      const url = new URL(uri);
      // Cas spécifique pour purl.obolibrary.org si non capturé par préfixe direct
      if (url.hostname === 'purl.obolibrary.org' && url.pathname.startsWith('/obo/')) {
        const pathParts = url.pathname.split('/');
        if (pathParts.length > 2 && pathParts[1] === 'obo') {
            const oboTermPart = pathParts[2];
            const oboNamespace = oboTermPart.split('_')[0];
            if (oboNamespace) return `${oboNamespace.toUpperCase()} (OBO Library)`;
        }
        return 'OBO Library';
      }
      return url.hostname; // Retourne le nom de domaine comme source générique
    } catch (error) {
      // En cas d'URI invalide ou relative (peu probable ici car on attend une URI de ?value)
      // Tenter une extraction simple du "namespace" avant le # ou le dernier /
      const hashIndex = uri.lastIndexOf('#');
      if (hashIndex > 0) {
        const potentialNs = uri.substring(0, hashIndex);
        if (potentialNs.length > 5) return potentialNs; // Éviter les "http:"
      }
      const slashIndex = uri.lastIndexOf('/');
      if (slashIndex > 0) {
        const potentialNs = uri.substring(0, slashIndex);
        if (potentialNs.length > 5 && potentialNs.includes(':/')) return potentialNs;
      }
      return 'Unknown Source'; // Fallback final
    }
  }

  /**
   * Ajoute la section propriétés techniques complètes
   */
  addCompleteTechnicalSection(container, bindings) {
    const section = document.createElement('div');
    section.className = 'info-section';
    section.style.marginBottom = '20px';
    
    const titleContainer = document.createElement('div');
    titleContainer.style.cursor = 'pointer';
    titleContainer.style.borderBottom = '2px solid #6c757d';
    titleContainer.style.paddingBottom = '5px';
    titleContainer.style.marginBottom = '15px';
    
    const title = document.createElement('h3');
    title.textContent = `▼ Technical Properties (${bindings.length} properties)`;
    title.style.margin = '0';
    titleContainer.appendChild(title);
    
    const content = document.createElement('div');
    content.className = 'technical-content';
    content.style.display = 'none';
    
    bindings.forEach((binding, index) => {
      const propContainer = document.createElement('div');
      propContainer.style.marginBottom = '12px';
      propContainer.style.padding = '10px';
      propContainer.style.border = '1px solid #dee2e6';
      propContainer.style.borderRadius = '4px';
      propContainer.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
      
      // En-tête de la propriété technique
      const propHeader = document.createElement('div');
      propHeader.style.display = 'flex';
      propHeader.style.justifyContent = 'space-between';
      propHeader.style.alignItems = 'center';
      propHeader.style.marginBottom = '6px';
      
      const propName = document.createElement('strong');
      propName.textContent = binding.property.value.split(/[/#]/).pop();
      propName.style.fontSize = '12px';
      propName.style.color = '#495057';
      propHeader.appendChild(propName);
      
      const valueType = binding.valueType ? binding.valueType.value : 'unknown';
      const typeBadge = document.createElement('span');
      typeBadge.textContent = valueType.toUpperCase();
      typeBadge.style.fontSize = '9px';
      typeBadge.style.color = valueType === 'uri' ? '#007cba' : '#28a745';
      typeBadge.style.backgroundColor = valueType === 'uri' ? '#e3f2fd' : '#e8f5e9';
      typeBadge.style.padding = '2px 4px';
      typeBadge.style.borderRadius = '2px';
      propHeader.appendChild(typeBadge);
      
      propContainer.appendChild(propHeader);
      
      // URI complète de la propriété
      const fullPropUri = document.createElement('div');
      fullPropUri.style.fontSize = '10px';
      fullPropUri.style.color = '#6c757d';
      fullPropUri.style.marginBottom = '6px';
      fullPropUri.style.wordBreak = 'break-all';
      fullPropUri.innerHTML = `<a href="${binding.property.value}" target="_blank" style="color: #6c757d;">${binding.property.value}</a>`;
      propContainer.appendChild(fullPropUri);
      
      // Valeur
      const valueDiv = document.createElement('div');
      valueDiv.style.fontSize = '11px';
      valueDiv.style.padding = '6px';
      valueDiv.style.backgroundColor = '#f8f9fa';
      valueDiv.style.borderRadius = '3px';
      valueDiv.style.wordBreak = 'break-all';
      
      if (valueType === 'uri') {
        valueDiv.innerHTML = `<a href="${binding.value.value}" target="_blank" style="color: #007cba;">${binding.value.value}</a>`;
    } else {
        valueDiv.textContent = binding.value.value;
      }
      
      propContainer.appendChild(valueDiv);
      content.appendChild(propContainer);
    });
    
    // Toggle functionality
    titleContainer.addEventListener('click', () => {
      const isVisible = content.style.display !== 'none';
      content.style.display = isVisible ? 'none' : 'block';
      title.textContent = `${isVisible ? '▶' : '▼'} Technical Properties (${bindings.length} properties)`;
    });
    
    section.appendChild(titleContainer);
    section.appendChild(content);
    container.appendChild(section);
  }
  
  /**
   * Ajoute un résumé des données récupérées
   */
  addDataSummary(container, allData) {
    const section = document.createElement('div');
    section.className = 'info-section';
    section.style.marginTop = '20px';
    section.style.padding = '10px';
    section.style.backgroundColor = '#e9ecef';
    section.style.borderRadius = '5px';
    
    const title = document.createElement('h4');
    title.textContent = 'Data Retrieval Summary';
    title.style.color = '#495057';
    title.style.marginBottom = '8px';
    section.appendChild(title);
    
    const summary = document.createElement('div');
    summary.style.fontSize = '12px';
    summary.style.color = '#6c757d';
    
    const descriptiveCount = allData.descriptive && allData.descriptive.results ? allData.descriptive.results.bindings.length : 0;
    const relationshipsCount = allData.relationships && allData.relationships.results ? allData.relationships.results.bindings.length : 0;
    const technicalCount = allData.technical && allData.technical.results ? allData.technical.results.bindings.length : 0;
    const totalCount = descriptiveCount + relationshipsCount + technicalCount;
    
    summary.innerHTML = `
      • <strong>${descriptiveCount}</strong> descriptive properties retrieved<br>
      • <strong>${relationshipsCount}</strong> relationships found<br>
      • <strong>${technicalCount}</strong> technical properties collected<br>
      • <strong>${totalCount}</strong> total properties from API<br>
      • Endpoint: <code>${this.currentEndpoint || 'default'}</code>
    `;
    
    section.appendChild(summary);
    container.appendChild(section);
  }
  
  /**
   * Ajoute une ligne d'information détaillée
   */
  addDetailedInfoRow(container, label, value, isLink = false) {
    if (!value || value === 'None' || value === '') return;
    
    const row = document.createElement('div');
    row.style.marginBottom = '10px';
    row.style.display = 'flex';
    row.style.flexDirection = 'column';
    
    const labelElement = document.createElement('strong');
    labelElement.textContent = label;
    labelElement.style.color = '#2c3e50';
    labelElement.style.fontSize = '13px';
    labelElement.style.marginBottom = '3px';
    row.appendChild(labelElement);
    
    const valueElement = document.createElement('div');
    valueElement.style.paddingLeft = '12px';
    valueElement.style.color = '#34495e';
    valueElement.style.fontSize = '12px';
    valueElement.style.lineHeight = '1.4';
    valueElement.style.wordBreak = 'break-all';
    
    if (isLink && typeof value === 'string' && value.startsWith('http')) {
      const link = document.createElement('a');
      link.href = value;
      link.target = '_blank';
      link.textContent = value;
      link.style.color = '#007cba';
      link.style.textDecoration = 'underline';
      valueElement.appendChild(link);
    } else {
      valueElement.textContent = value;
    }
    
    row.appendChild(valueElement);
    container.appendChild(row);
  }

  /**
   * Extrait l'identifiant d'accession depuis une URI
   */
  extractAccessionFromURI(uri) {
    if (!uri) return 'N/A';
    
    // Pour d'autres ontologies
    const oboMatch = uri.match(/([A-Z]+)_(\d+)/);
    if (oboMatch) {
      return `${oboMatch[1]}:${oboMatch[2]}`;
    }
    
    // Retourner la dernière partie de l'URI
    return uri.split(/[/#]/).pop();
  }

  /**
   * Obtient un nom lisible pour une propriété
   */
  getReadablePropertyName(propUri) {
    const mappings = {
      'subClassOf': 'Is a type of',
      'type': 'Type',
      'broader': 'Broader concept',
      'narrower': 'Narrower concept', 
      'related': 'Related to',
      'sameAs': 'Same as',
      'equivalentClass': 'Equivalent to',
      'BFO_0000050': 'Part of',
      'RO_0002211': 'Regulates',
      'RO_0002212': 'Negatively regulates',
      'RO_0002213': 'Positively regulates',
      'label': 'Label',
      'comment': 'Comment',
      'definition': 'Definition',
      'hasDefinition': 'Definition',
      'hasExactSynonym': 'Exact Synonym',
      'hasRelatedSynonym': 'Related Synonym',
      'hasBroadSynonym': 'Broad Synonym',
      'hasNarrowSynonym': 'Narrow Synonym',
      'prefLabel': 'Preferred Label',
      'altLabel': 'Alternative Label',
      'title': 'Title',
      'description': 'Description',
      'id': 'ID'
    };
    
    const shortName = propUri.split(/[/#]/).pop();
    return mappings[shortName] || shortName.replace(/_/g, ' ');
  }

  /**
   * Affiche les détails de base d'un nœud
   */
  displayBasicNodeDetails(node, container = null) {
    // Supprimer l'ancien panneau s'il existe
    const oldPanel = this.shadowRoot.querySelector('.node-details-panel');
    if (oldPanel) {
      oldPanel.remove();
    }
    
    // Créer un nouveau panneau
    const panel = document.createElement('div');
    panel.className = 'node-details-panel';
    
    // En-tête
    const header = document.createElement('div');
    header.className = 'panel-header';
    
    const title = document.createElement('h2');
    title.textContent = node.label || node.id;
    title.style.margin = '0';
    title.style.fontSize = '18px';
    title.style.fontWeight = 'bold';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.className = 'close-btn';
    closeBtn.addEventListener('click', () => panel.remove());
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);
    
    // Contenu principal
    const content = document.createElement('div');
    content.className = 'panel-content';
    
    const basicInfo = document.createElement('div');
    basicInfo.innerHTML = `
      <h4>Informations disponibles</h4>
      <p><strong>ID:</strong> ${node.id}</p>
      <p><strong>Label:</strong> ${node.label}</p>
      ${node.uri ? `<p><strong>URI:</strong> <a href="${node.uri}" target="_blank">${node.uri}</a></p>` : ''}
    `;
    
    // Connexions
    const connections = this.links.filter(l => 
      l.source.id === node.id || l.target.id === node.id
    ).length;
    
    const connectionsInfo = document.createElement('p');
    connectionsInfo.innerHTML = `<strong>Connexions:</strong> ${connections}`;
    basicInfo.appendChild(connectionsInfo);
    
    content.appendChild(basicInfo);
    panel.appendChild(content);
    
    this.shadowRoot.querySelector('.graph-container').appendChild(panel);
  }
  
  /**
   * Affiche une notification temporaire
   */
  showNotification(message, type = 'info') {
    const oldNotification = this.shadowRoot.querySelector('.notification');
    if (oldNotification) {
      oldNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    this.shadowRoot.querySelector('.graph-container').appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }

  /**
   * Affiche une infobulle avec les détails d'un nœud
   */
  showTooltip(node, x, y) {
    this.hideTooltip();
    
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }
    
    this.tooltipTimeout = setTimeout(() => {
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      
      const title = document.createElement('h3');
      title.textContent = node.label;
      tooltip.appendChild(title);
      
      if (node.uri) {
        const uri = document.createElement('p');
        uri.innerHTML = `<strong>URI:</strong> ${node.uri}`;
        tooltip.appendChild(uri);
      }
      

      
      const connections = this.links.filter(l => 
        l.source.id === node.id || l.target.id === node.id
      ).length;
      const connectionsText = document.createElement('p');
      connectionsText.innerHTML = `<strong>Connexions:</strong> ${connections}`;
      tooltip.appendChild(connectionsText);
      
      tooltip.style.left = `${x + 15}px`;
      tooltip.style.top = `${y - 15}px`;
      
      this.shadowRoot.querySelector('.graph-container').appendChild(tooltip);
    }, 200);
  }
  
  /**
   * Cache l'infobulle
   */
  hideTooltip() {
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }
    
    const tooltip = this.shadowRoot.querySelector('.tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }

  /**
   * Affiche une infobulle pour les liens
   */
  showLinkTooltip(text, x, y) {
    this.hideLinkTooltip();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'link-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '5px 10px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '12px';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.zIndex = '20';
    tooltip.style.left = `${x + 10}px`;
    tooltip.style.top = `${y - 10}px`;
    tooltip.style.whiteSpace = 'pre-line';
    
    tooltip.textContent = text;
    
    this.shadowRoot.querySelector('.graph-container').appendChild(tooltip);
  }
  
  /**
   * Cache l'infobulle des liens
   */
  hideLinkTooltip() {
    const tooltip = this.shadowRoot.querySelector('.link-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }
  
  /**
   * Affiche un menu contextuel pour un nœud
   */
  showContextMenu(node, x, y) {
    const oldMenu = this.shadowRoot.querySelector('.context-menu');
    if (oldMenu) {
      oldMenu.remove();
    }
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    const queryButton = document.createElement('button');
    queryButton.textContent = 'Récupérer les détails';
    queryButton.addEventListener('click', () => {
      this.executeNodeQuery(node);
      menu.remove();
    });
    menu.appendChild(queryButton);
    
    this.shadowRoot.querySelector('.graph-container').appendChild(menu);
    
    // Ajuster la position si nécessaire
    const container = this.shadowRoot.querySelector('.graph-container');
    const menuRect = menu.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    if (menuRect.right > containerRect.right) {
      menu.style.left = `${x - menuRect.width}px`;
    }
    
    if (menuRect.bottom > containerRect.bottom) {
      menu.style.top = `${y - menuRect.height}px`;
    }
  }

  /**
   * Rend le graphe avec D3.js
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: Arial, sans-serif;
        }
        .graph-container {
          width: ${this.width}px;
          height: ${this.height}px;
          background-color: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }
        svg {
          width: 100%;
          height: 100%;
        }
        .links line {
          stroke: #999;
          stroke-opacity: 0.6;
          transition: stroke 0.3s, stroke-width 0.3s;
        }
        .links .directional {
          marker-end: url(#arrowhead);
        }
        .links .semantic {
          stroke: #888;
          stroke-opacity: 0.7;
        }
        .nodes circle {
          stroke: #fff;
          stroke-width: 1.5px;
          transition: stroke 0.3s, stroke-width 0.3s;
        }
        .node-label {
          font-size: 12px;
          pointer-events: none;
          fill: #333;
          text-anchor: middle;
          dominant-baseline: middle;
        }
        .node-highlighted circle {
          stroke: #ff4444 !important;
          stroke-width: 3px !important;
        }
        .link-highlighted {
          stroke: #ff4444 !important;
          stroke-width: 2px !important;
          stroke-opacity: 1 !important;
        }
        .tooltip {
          position: absolute;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 10px;
          pointer-events: none;
          z-index: 10;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          max-width: 300px;
          font-size: 12px;
        }
        .tooltip h3 {
          margin: 0 0 5px 0;
          font-size: 14px;
        }
        .tooltip p {
          margin: 3px 0;
        }
        .node-details-panel {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 350px;
          max-height: calc(100% - 20px);
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: auto;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          z-index: 5;
          display: flex;
          flex-direction: column;
        }
        .proxy-error-panel {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 380px;
          max-height: calc(100% - 20px);
          background: linear-gradient(135deg, #fff3cd 0%, #fef5e7 100%);
          border: 2px solid #f0ad4e;
          border-radius: 8px;
          overflow: auto;
          box-shadow: 0 4px 12px rgba(240, 173, 78, 0.3);
          z-index: 15;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .error-header {
          padding: 15px;
          background: linear-gradient(135deg, #f0ad4e 0%, #ec971f 100%);
          color: white;
          border-radius: 6px 6px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .error-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: bold;
        }
        .error-content {
          padding: 20px;
        }
        .error-message {
          margin-bottom: 20px;
          color: #8a6d3b;
          line-height: 1.5;
        }
        .error-message p {
          margin: 10px 0;
        }
        .error-actions {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .doc-button, .console-button {
          padding: 10px 15px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
          flex: 1;
          min-width: 120px;
        }
        .doc-button {
          background: linear-gradient(135deg, #5bc0de 0%, #31b0d5 100%);
          color: white;
        }
        .doc-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(91, 192, 222, 0.3);
        }
        .console-button {
          background: linear-gradient(135deg, #5cb85c 0%, #449d44 100%);
          color: white;
        }
        .console-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(92, 184, 92, 0.3);
        }
        .quick-solution {
          background: rgba(23, 162, 184, 0.1);
          border: 1px solid rgba(23, 162, 184, 0.3);
          border-radius: 5px;
          padding: 15px;
          margin-top: 15px;
        }
        .quick-solution h4 {
          color: #117a8b;
          margin: 0 0 10px 0;
          font-size: 14px;
        }
        .quick-solution ol {
          margin: 0;
          padding-left: 20px;
          color: #495057;
        }
        .quick-solution li {
          margin: 5px 0;
          font-size: 13px;
        }
        .quick-solution code {
          background: rgba(0, 0, 0, 0.1);
          padding: 2px 5px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          color: #e83e8c;
        }
        .panel-header {
          padding: 10px;
          background: #f0f0f0;
          border-bottom: 1px solid #ddd;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .panel-header h3 {
          margin: 0;
          font-size: 16px;
        }
        .close-btn {
          border: none;
          background: transparent;
          font-size: 20px;
          cursor: pointer;
          padding: 0 5px;
          color: white;
        }
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .node-uri {
          padding: 10px;
          border-bottom: 1px solid #eee;
          font-size: 12px;
          word-break: break-all;
        }
        .panel-content {
          padding: 10px;
          overflow: auto;
        }
        .panel-content table {
          width: 100%;
          border-collapse: collapse;
        }
        .panel-content th,
        .panel-content td {
          text-align: left;
          padding: 5px;
          border-bottom: 1px solid #eee;
          font-size: 12px;
          word-break: break-all;
        }
        .context-menu {
          position: absolute;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          padding: 5px 0;
          z-index: 20;
        }
        .context-menu button {
          display: block;
          width: 100%;
          border: none;
          background: white;
          padding: 8px 15px;
          text-align: left;
          cursor: pointer;
        }
        .context-menu button:hover {
          background: #f0f0f0;
        }
        .notification {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: 4px;
          z-index: 30;
          transition: opacity 0.5s;
        }
        .notification.info {
          background: #e3f2fd;
          border: 1px solid #2196f3;
        }
        .notification.error {
          background: #ffebee;
          border: 1px solid #f44336;
        }
        .notification.fade-out {
          opacity: 0;
        }
        .proxy-error-panel .error-header { /* Style spécifique pour le header du panneau d'erreur proxy */
          padding: 15px;
          background: linear-gradient(135deg, #f0ad4e 0%, #ec971f 100%);
          color: white;
          border-radius: 6px 6px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .proxy-error-panel .error-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: bold;
        }
        .proxy-error-panel .error-content {
          padding: 20px;
        }
        .proxy-error-panel .error-message {
          margin-bottom: 20px;
          color: #8a6d3b;
          line-height: 1.5;
        }
        .proxy-error-panel .error-message p {
          margin: 10px 0;
        }
        .proxy-error-panel .error-actions {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .proxy-error-panel .doc-button, .proxy-error-panel .console-button {
          padding: 10px 15px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
          flex: 1;
          min-width: 120px;
        }
        .proxy-error-panel .doc-button {
          background: linear-gradient(135deg, #5bc0de 0%, #31b0d5 100%);
          color: white;
        }
        .proxy-error-panel .doc-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(91, 192, 222, 0.3);
        }
        .proxy-error-panel .console-button {
          background: linear-gradient(135deg, #5cb85c 0%, #449d44 100%);
          color: white;
        }
        .proxy-error-panel .console-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(92, 184, 92, 0.3);
        }
        .proxy-error-panel .quick-summary { /* Style pour le résumé rapide */
          background: rgba(23, 162, 184, 0.05);
          border: 1px solid rgba(23, 162, 184, 0.2);
          border-radius: 5px;
          padding: 15px;
          margin-top: 15px;
        }
        .proxy-error-panel .quick-summary h4 {
          color: #117a8b;
          margin: 0 0 10px 0;
          font-size: 14px;
        }
        .proxy-error-panel .quick-summary ol {
          margin: 0;
          padding-left: 20px;
          color: #495057;
        }
        .proxy-error-panel .quick-summary li {
          margin: 5px 0;
          font-size: 13px;
        }
        .proxy-error-panel .quick-summary code {
          background: rgba(0, 0, 0, 0.05);
          padding: 2px 5px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          color: #e83e8c;
        }
        .panel-header {
          padding: 10px;
          background: #f0f0f0;
          border-bottom: 1px solid #ddd;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .panel-header h3 {
          margin: 0;
          font-size: 16px;
        }
        .close-btn {
          border: none;
          background: transparent;
          font-size: 20px;
          cursor: pointer;
          padding: 0 5px;
          color: #6c757d; /* Couleur plus neutre pour le bouton de fermeture */
        }
        .close-btn:hover {
          background: rgba(0, 0, 0, 0.1); /* Ajuster pour un fond clair */
          border-radius: 3px;
        }
        .node-uri {
          padding: 10px;
          border-bottom: 1px solid #eee;
          font-size: 12px;
          word-break: break-all;
        }
        .panel-content {
          padding: 10px;
          overflow: auto;
        }
        .panel-content table {
          width: 100%;
          border-collapse: collapse;
        }
        .panel-content th,
        .panel-content td {
          text-align: left;
          padding: 5px;
          border-bottom: 1px solid #eee;
          font-size: 12px;
          word-break: break-all;
        }
        .context-menu {
          position: absolute;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          padding: 5px 0;
          z-index: 20;
        }
        .context-menu button {
          display: block;
          width: 100%;
          border: none;
          background: white;
          padding: 8px 15px;
          text-align: left;
          cursor: pointer;
        }
        .context-menu button:hover {
          background: #f0f0f0;
        }
        .notification {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: 4px;
          z-index: 30;
          transition: opacity 0.5s;
        }
        .notification.info {
          background: #e3f2fd;
          border: 1px solid #2196f3;
        }
        .notification.error {
          background: #ffebee;
          border: 1px solid #f44336;
        }
        .notification.fade-out {
          opacity: 0;
        }
      </style>
      <div class="graph-container">
        <svg></svg>
      </div>
    `;

    this.createForceGraph();
    this.initGlobalEventHandlers();
  }
  
  /**
   * Initialise les gestionnaires d'événements globaux
   */
  initGlobalEventHandlers() {
    const container = this.shadowRoot.querySelector('.graph-container');
    
    container.addEventListener('click', (event) => {
      const contextMenu = this.shadowRoot.querySelector('.context-menu');
      if (contextMenu) {
        contextMenu.remove();
      }
    });
    
    container.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });
    
    container.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });
  }

  /**
   * Crée une visualisation force-directed avec D3.js
   */
  createForceGraph() {
    const svg = d3.select(this.shadowRoot.querySelector('svg'));
    const width = this.width;
    const height = this.height;
    
    svg.selectAll("*").remove();
    
    // Ajouter les définitions pour les flèches
    const defs = svg.append("defs");
    defs.append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#999");
    
    // CORRECTION: Validation stricte des données avant le rendu
    if (!this.nodes || this.nodes.length === 0) {
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2 - 20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Aucune donnée à visualiser");
        
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2 + 20)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Veuillez saisir un endpoint SPARQL et une requête, puis cliquez sur \"Exécuter\".");
        
      return;
    }

    // CORRECTION: Vérification de l'intégrité des données
    const validNodes = this.nodes.filter(node => node && node.id !== undefined && node.id !== null);
    const validLinks = this.links.filter(link => 
      link && 
      link.source !== undefined && link.source !== null &&
      link.target !== undefined && link.target !== null
    );

    if (validNodes.length !== this.nodes.length) {
      console.warn(`[vis-graph] ⚠️ ${this.nodes.length - validNodes.length} nœuds invalides supprimés`);
      this.nodes = validNodes;
    }

    if (validLinks.length !== this.links.length) {
      console.warn(`[vis-graph] ⚠️ ${this.links.length - validLinks.length} liens invalides supprimés`);
      this.links = validLinks;
    }

    if (validNodes.length === 0) {
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Erreur: données corrompues détectées");
      return;
    }

    const mapping = this.visualEncoding;

    // --- ENCODING LOGIC ---
    // Create clear, explicit functions to get visual properties based on the encoding.
    
    // Node Color
    const nodeColorConfig = mapping.nodes.color || {};
    const nodeColorScale = nodeColorConfig.scale ? 
      this.createD3Scale(nodeColorConfig.scale, this.nodes, nodeColorConfig.field) : null;
    const getNodeColor = d => {
      try {
        if (nodeColorScale && nodeColorConfig.field && d[nodeColorConfig.field] !== undefined) {
          // CORRECTION: On vérifie que la valeur du noeud est bien dans le domaine de l'échelle
          if (nodeColorScale.domain().includes(d[nodeColorConfig.field])) {
            const color = nodeColorScale(d[nodeColorConfig.field]);
            return color || '#cccccc'; // Protection contre les couleurs invalides
          }
          // Si la valeur n'est pas dans le domaine, on ignore l'échelle et on passe aux fallbacks.
        }
        // Fallback 1: Utiliser une valeur directe si elle est définie
        // Fallback 2: Utiliser un gris neutre pour les cas non définis
        return nodeColorConfig.value || '#cccccc';
      } catch (error) {
        console.warn('[vis-graph] ⚠️ Erreur dans getNodeColor:', error.message);
        return '#cccccc'; // Couleur de sécurité
      }
    };

    // Node Size (Radius)
    const nodeSizeConfig = mapping.nodes.size || {};
    const nodeSizeScale = nodeSizeConfig.scale ? 
      this.createD3Scale(nodeSizeConfig.scale, this.nodes, nodeSizeConfig.field) : null;
    const getNodeRadius = d => {
      try {
        if (nodeSizeScale && nodeSizeConfig.field && d[nodeSizeConfig.field] !== undefined) {
          const radius = nodeSizeScale(d[nodeSizeConfig.field]);
          // Vérifier que le rayon est un nombre valide et positif
          if (typeof radius === 'number' && !isNaN(radius) && radius > 0) {
            return radius;
          }
        }
        const fallbackRadius = nodeSizeConfig.value || 10;
        return typeof fallbackRadius === 'number' && !isNaN(fallbackRadius) && fallbackRadius > 0 ? fallbackRadius : 10;
      } catch (error) {
        console.warn('[vis-graph] ⚠️ Erreur dans getNodeRadius:', error.message);
        return 10; // Rayon de sécurité
      }
    };

    // Link Color
    const linkColorConfig = mapping.links.color || {};
    const linkColorScale = linkColorConfig.scale ? 
      this.createD3Scale(linkColorConfig.scale, this.links, linkColorConfig.field) : null;
    const getLinkColor = d => {
      if (linkColorScale && linkColorConfig.field && d[linkColorConfig.field] !== undefined) {
        // CORRECTION: On vérifie aussi pour les liens
        if (linkColorScale.domain().includes(d[linkColorConfig.field])) {
          return linkColorScale(d[linkColorConfig.field]);
        }
      }
      return linkColorConfig.value || '#999'; // Final fallback
    };

    // Link Width
    // Handle both "Width" (from user example) and "width"
    const linkWidthConfig = mapping.links.width || mapping.links.Width || {};
    const getLinkWidth = () => {
        return linkWidthConfig.value || 1.5; // Only direct value supported for now
    };
    
    // Link Distance
    const linkDistance = mapping.links.distance || 100;

    const simulation = d3.forceSimulation(this.nodes)
      .force('link', d3.forceLink(this.links).id(d => d.id).distance(linkDistance))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => getNodeRadius(d) + 5)) // Padding
      .force('x', d3.forceX(width / 2).strength(0.1))
      .force('y', d3.forceY(height / 2).strength(0.1));

    const constrainNode = (d) => {
      const radius = getNodeRadius(d);
      d.x = Math.max(radius, Math.min(width - radius, d.x));
      d.y = Math.max(radius, Math.min(height - radius, d.y));
    };
        
    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(this.links)
      .enter()
      .append('line')
      .attr('class', d => d.type || 'directional')
      .attr('stroke', getLinkColor)
      .attr('stroke-width', getLinkWidth())
      .on('mouseover', (event, d) => {
        // Tooltip pour les liens
        let tooltipText = '';
        if (d.type === 'semantic') {
          const sourceNode = this.nodes.find(n => n.id === d.source.id);
          const targetNode = this.nodes.find(n => n.id === d.target.id);
          tooltipText = `${sourceNode ? sourceNode.label : d.source.id} ↔ ${targetNode ? targetNode.label : d.target.id}`;
          tooltipText += `\nRelation: ${d.semanticLabel || d.tooltip || 'relation'}`;
        } else {
          // Liens directionnels
          const sourceNode = this.nodes.find(n => n.id === d.source.id);
          const targetNode = this.nodes.find(n => n.id === d.target.id);
          tooltipText = `${sourceNode ? sourceNode.label : d.source.id} → ${targetNode ? targetNode.label : d.target.id}`;
        }
        this.showLinkTooltip(tooltipText, event.offsetX, event.offsetY);
      })
      .on('mouseout', () => {
        this.hideLinkTooltip();
      });
      
    const nodeGroup = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(this.nodes)
      .enter()
      .append('g')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))
      .on('mouseover', (event, d) => {
        const connectedLinks = this.links.filter(l => 
          l.source.id === d.id || l.target.id === d.id
        );
        
        const connectedNodeIds = new Set(connectedLinks.flatMap(l => 
          [l.source.id, l.target.id]
        ));
        
        link.classed('link-highlighted', l => 
          l.source.id === d.id || l.target.id === d.id
        );
        
        nodeGroup.classed('node-highlighted', n => 
          connectedNodeIds.has(n.id)
        );
        
        this.showTooltip(d, event.offsetX, event.offsetY);
      })
      .on('mouseout', () => {
        link.classed('link-highlighted', false);
        nodeGroup.classed('node-highlighted', false);
        this.hideTooltip();
      })
      .on('contextmenu', (event, d) => {
        event.preventDefault();
        this.showContextMenu(d, event.offsetX, event.offsetY);
      });
      
    nodeGroup.append('circle')
      .attr('r', getNodeRadius)
      .attr('fill', getNodeColor);
    
    nodeGroup.append('text')
      .attr('class', 'node-label')
      .text(d => d.label || d.id);
        
    simulation.on('tick', () => {
      nodeGroup.each(constrainNode);
      
      link
        .attr('x1', d => isNaN(d.source.x) ? 0 : d.source.x)
        .attr('y1', d => isNaN(d.source.y) ? 0 : d.source.y)
        .attr('x2', d => isNaN(d.target.x) ? 0 : d.target.x)
        .attr('y2', d => isNaN(d.target.y) ? 0 : d.target.y);
      
      nodeGroup.attr('transform', d => {
        const x = isNaN(d.x) ? width / 2 : d.x;
        const y = isNaN(d.y) ? height / 2 : d.y;
        return `translate(${x},${y})`;
      });
    });
    
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      const radius = getNodeRadius(d);
      d.fx = Math.max(radius, Math.min(width - radius, event.x));
      d.fy = Math.max(radius, Math.min(height - radius, event.y));
    }
    
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }

  /**
   * Crée une échelle D3 à partir d'une configuration de type VEGA avec calcul automatique du domaine.
   * @param {object} scaleConfig - La configuration de l'échelle (`domain`, `range`, `type`).
   * @param {Array} data - Les données à utiliser pour calculer le domaine (optionnel).
   * @param {string} field - Le champ à analyser pour calculer le domaine (optionnel).
   * @param {d3.Scale} defaultScale - L'échelle D3 à utiliser si la configuration est invalide.
   * @returns {d3.Scale} L'échelle D3 configurée avec domaine calculé.
   */
  createD3Scale(scaleConfig, data = null, field = null, defaultScale = null) {
    console.log(`[vis-graph] 🎨 Création d'échelle D3 pour le champ "${field}"`);
    
    if (!scaleConfig || !scaleConfig.range) {
      console.warn(`[vis-graph] ⚠️ Configuration d'échelle invalide ou range manquant`);
      return defaultScale;
    }

    const type = scaleConfig.type || 'ordinal';
    
    // Support for D3 color schemes e.g., "Reds", "Blues"
    const range = (typeof scaleConfig.range === 'string') ? d3[`scheme${scaleConfig.range}`] : scaleConfig.range;
    if (!range) {
        console.warn(`[vis-graph] ⚠️ Schéma de couleurs ou range invalide: ${scaleConfig.range}`);
        return defaultScale;
    }

    // --- CALCUL AUTOMATIQUE DU DOMAINE ---
    let finalDomain;
    
    if (data && field && this.domainCalculator) {
      // Utiliser le DomainCalculator pour calculer le domaine approprié
      const userDomain = scaleConfig.domain; // Peut être undefined/null
      try {
        finalDomain = this.domainCalculator.getDomain(data, field, userDomain, type);
      } catch (error) {
        console.warn(`[vis-graph] ⚠️ Erreur lors du calcul du domaine pour "${field}":`, error.message);
        return defaultScale;
      }
      
      console.log(`[vis-graph] 🎯 Domaine calculé automatiquement:`, finalDomain);
      
      if (!finalDomain || finalDomain.length === 0) {
        console.warn(`[vis-graph] ⚠️ Aucune valeur trouvée pour le champ "${field}"`);
        return defaultScale;
      }
    } else if (scaleConfig.domain && Array.isArray(scaleConfig.domain) && scaleConfig.domain.length > 0) {
      // Utiliser le domaine fourni tel quel (avec validation)
      finalDomain = scaleConfig.domain;
      console.log(`[vis-graph] 📝 Utilisation du domaine fourni:`, finalDomain);
    } else {
      console.warn(`[vis-graph] ⚠️ Aucun domaine valide disponible pour créer l'échelle`);
      return defaultScale;
    }
    
    // --- CRÉATION DE L'ÉCHELLE D3 ---
    let scale;
    switch (type) {
      case 'linear':
        scale = d3.scaleLinear();
        break;
      case 'sqrt':
        scale = d3.scaleSqrt();
        break;
      case 'log':
        scale = d3.scaleLog();
        break;
      case 'ordinal':
      default:
        scale = d3.scaleOrdinal();
        break;
    }
    
    const finalScale = scale.domain(finalDomain).range(range);
    
    console.log(`[vis-graph] ✅ Échelle ${type} créée avec succès pour "${field}"`);
    console.log(`[vis-graph] -> Domaine final:`, finalScale.domain());
    console.log(`[vis-graph] -> Range:`, finalScale.range());
    
    return finalScale;
  }

  /**
   * Détecte automatiquement les champs de classification de niveau supérieur
   * dans les données pour l'encodage des couleurs.
   * @param {Array} data - Les données (nodes ou links)
   * @param {Array} sparqlVars - Les variables SPARQL disponibles
   * @returns {Object} Information sur le meilleur champ de classification trouvé
   */
  detectClassificationField(data, sparqlVars) {
    if (!data || data.length === 0 || !sparqlVars) {
      return { field: 'type', reason: 'Aucune donnée disponible, utilisation du fallback' };
    }

    // Mots-clés qui indiquent des champs de classification (par ordre de priorité)
    const classificationKeywords = [
      { keywords: ['class', 'category', 'groupe', 'group'], priority: 5, description: 'Classification principale' },
      { keywords: ['type', 'kind', 'sort'], priority: 4, description: 'Type/sorte' },
      { keywords: ['level', 'niveau', 'rank', 'rang'], priority: 3, description: 'Niveau hiérarchique' },
      { keywords: ['domain', 'domaine', 'realm'], priority: 3, description: 'Domaine' },
      { keywords: ['namespace', 'ns', 'prefix'], priority: 2, description: 'Espace de noms' },
      { keywords: ['source', 'origin', 'provenance'], priority: 2, description: 'Source/origine' },
      { keywords: ['label', 'name', 'title'], priority: 1, description: 'Label (plus granulaire)' }
    ];

    const candidateFields = [];

    // Analyser chaque variable SPARQL pour trouver des champs de classification
    console.log(`[vis-graph] 🔍 Analyse des variables SPARQL pour détection de classification:`, sparqlVars);
    
    sparqlVars.forEach(varName => {
      const lowerVarName = varName.toLowerCase();
      
      // Chercher des correspondances avec les mots-clés de classification
      classificationKeywords.forEach(({ keywords, priority, description }) => {
        keywords.forEach(keyword => {
          if (lowerVarName.includes(keyword)) {
            console.log(`[vis-graph] 🎯 Variable "${varName}" correspond au mot-clé "${keyword}"`);
            
            // Analyser les valeurs de ce champ dans les données
            const fieldStats = this.analyzeFieldForClassification(data, varName);
            
            console.log(`[vis-graph] 📊 Stats pour "${varName}":`, {
              uniqueCount: fieldStats.uniqueCount,
              coverage: Math.round(fieldStats.coverage * 100) + '%',
              isGood: fieldStats.isGoodForClassification,
              samples: fieldStats.sampleValues
            });
            
            if (fieldStats.isGoodForClassification) {
              candidateFields.push({
                field: varName,
                priority: priority,
                description: description,
                uniqueCount: fieldStats.uniqueCount,
                coverage: fieldStats.coverage,
                sampleValues: fieldStats.sampleValues,
                reason: `Détecté via mot-clé "${keyword}" - ${description}`
              });
            }
          }
        });
      });
    });

    // Si aucun champ candidat trouvé, analyser tous les champs pour trouver de bonnes classifications
    if (candidateFields.length === 0) {
      console.log('[vis-graph] 🔍 Aucun champ de classification évident, analyse de tous les champs...');
      
      sparqlVars.forEach(varName => {
        const fieldStats = this.analyzeFieldForClassification(data, varName);
        
        if (fieldStats.isGoodForClassification) {
          candidateFields.push({
            field: varName,
            priority: 1, // Priorité plus basse car pas de mot-clé évident
            description: 'Classification détectée par analyse',
            uniqueCount: fieldStats.uniqueCount,
            coverage: fieldStats.coverage,
            sampleValues: fieldStats.sampleValues,
            reason: `Analyse automatique - ${fieldStats.uniqueCount} valeurs uniques`
          });
        }
      });
    }

    // Afficher tous les candidats trouvés
    if (candidateFields.length > 0) {
      console.log(`[vis-graph] 📋 ${candidateFields.length} champ(s) candidat(s) trouvé(s):`);
      candidateFields.forEach((candidate, index) => {
        console.log(`[vis-graph]   ${index + 1}. "${candidate.field}" (priorité: ${candidate.priority}, ${candidate.uniqueCount} valeurs, ${Math.round(candidate.coverage * 100)}%)`);
      });
    }

    // Trier les candidats par priorité et qualité
    candidateFields.sort((a, b) => {
      // D'abord par priorité (plus élevée = mieux)
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // Ensuite par nombre optimal de valeurs uniques (entre 2 et 12 idéalement)
      const optimalA = Math.abs(a.uniqueCount - 6); // 6 est le nombre "idéal"
      const optimalB = Math.abs(b.uniqueCount - 6);
      if (optimalA !== optimalB) {
        return optimalA - optimalB;
      }
      // Enfin par couverture (plus élevée = mieux)
      return b.coverage - a.coverage;
    });

    if (candidateFields.length > 0) {
      const bestField = candidateFields[0];
      console.log(`[vis-graph] 🎯 Meilleur champ de classification détecté: "${bestField.field}"`);
      console.log(`[vis-graph] -> Raison: ${bestField.reason}`);
      console.log(`[vis-graph] -> Valeurs uniques: ${bestField.uniqueCount}, Couverture: ${Math.round(bestField.coverage * 100)}%`);
      console.log(`[vis-graph] -> Échantillon de valeurs:`, bestField.sampleValues);
      
      return bestField;
    }

    // Fallback vers le champ "type" calculé
    console.log('[vis-graph] ⚠️ Aucun champ de classification adapté trouvé, utilisation du fallback "type"');
    return { 
      field: 'type', 
      reason: 'Fallback - aucun champ de classification adapté détecté',
      uniqueCount: 2,
      coverage: 1.0,
      sampleValues: ['uri', 'literal']
    };
  }

  /**
   * Analyse un champ spécifique pour déterminer s'il convient à la classification.
   * @param {Array} data - Les données à analyser
   * @param {string} fieldName - Le nom du champ à analyser
   * @returns {Object} Statistiques d'analyse du champ
   */
  analyzeFieldForClassification(data, fieldName) {
    const values = this.domainCalculator.getVal(data, fieldName);
    const uniqueCount = values.length;
    const totalCount = data.length;
    const coverage = totalCount > 0 ? uniqueCount / totalCount : 0;
    
    // Critères pour qu'un champ soit bon pour la classification :
    // 1. Au moins 2 valeurs uniques (sinon pas de distinction)
    // 2. Pas plus de 20 valeurs uniques (sinon trop granulaire pour les couleurs)
    // 3. Couverture raisonnable (pas trop de valeurs manquantes)
    // 4. Les valeurs ne sont pas toutes des URIs longues (pas lisible)
    
    const isGoodForClassification = 
      uniqueCount >= 2 && 
      uniqueCount <= 20 && 
      coverage >= 0.1 && // Au moins 10% des éléments ont cette propriété
      this.areValuesReadableForClassification(values);
    
    return {
      isGoodForClassification,
      uniqueCount,
      coverage,
      sampleValues: values.slice(0, 3), // Échantillon des 3 premières valeurs
      avgValueLength: values.reduce((sum, val) => sum + String(val).length, 0) / values.length
    };
  }

  /**
   * Vérifie si les valeurs d'un champ sont lisibles pour la classification.
   * @param {Array} values - Les valeurs à analyser
   * @returns {boolean} True si les valeurs sont lisibles
   */
  areValuesReadableForClassification(values) {
    if (values.length === 0) return false;
    
    // Calculer la longueur moyenne des valeurs
    const avgLength = values.reduce((sum, val) => sum + String(val).length, 0) / values.length;
    
    // Compter combien de valeurs semblent être des URIs complètes
    const longUriCount = values.filter(val => {
      const str = String(val);
      return str.length > 50 && (str.startsWith('http://') || str.startsWith('https://'));
    }).length;
    
    const longUriRatio = longUriCount / values.length;
    
    // Le champ est considéré comme lisible si :
    // - Longueur moyenne raisonnable (< 30 caractères)
    // - Moins de 50% d'URIs longues
    return avgLength < 30 && longUriRatio < 0.5;
  }

  /**
   * Génère automatiquement une palette de couleurs adaptée au nombre de valeurs.
   * @param {number} valueCount - Nombre de valeurs uniques
   * @returns {Array} Palette de couleurs
   */
  generateColorPalette(valueCount) {
    // Palettes prédéfinies optimisées pour la distinction visuelle
    const palettes = {
      2: ['#1f77b4', '#ff7f0e'], // Bleu, Orange
      3: ['#1f77b4', '#ff7f0e', '#2ca02c'], // + Vert
      4: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'], // + Rouge
      5: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'], // + Violet
      6: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'], // + Marron
      7: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2'], // + Rose
      8: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f'], // + Gris
      9: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22'], // + Olive
      10: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'] // + Cyan
    };
    
    if (valueCount <= 10 && palettes[valueCount]) {
      return palettes[valueCount];
    }
    
    // Pour plus de 10 valeurs, utiliser des schémas D3 étendus ou fallback
    if (valueCount <= 12 && typeof d3.schemeSet3 !== 'undefined') {
      return d3.schemeSet3.slice(0, valueCount); // 12 couleurs distinctes
    } else if (valueCount <= 20 && typeof d3.schemeCategory20 !== 'undefined') {
      return d3.schemeCategory20.slice(0, valueCount); // 20 couleurs (si disponible)
    } else {
      // Pour un grand nombre ou si les schémas D3 ne sont pas disponibles, générer une palette HSL
      console.log(`[vis-graph] 🎨 Génération d'une palette HSL pour ${valueCount} valeurs`);
      const colors = [];
      for (let i = 0; i < valueCount; i++) {
        const hue = (i * 360 / valueCount) % 360;
        const saturation = 65 + (i % 4) * 5; // Variation entre 65-80%
        const lightness = 45 + (i % 3) * 8;  // Variation entre 45-61%
        colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
      }
      return colors;
    }
  }
}

// Enregistrer le composant
customElements.define('vis-graph', VisGraph); 