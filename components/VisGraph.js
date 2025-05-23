/**
 * Composant simplifié de visualisation de graphe D3.js
 */
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
   * Définit manuellement les données
   */
  setData(nodes, links) {
    this.nodes = nodes;
    this.links = links;
    this.render();
  }

  /**
   * Charge les données depuis un endpoint SPARQL
   */
  async loadFromSparqlEndpoint(endpoint, query) {
    try {
      // Stocker l'endpoint pour les requêtes futures
      this.currentEndpoint = endpoint;
      
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
      
      const rawData = await response.json();
      const transformedData = this.transformSparqlResults(rawData);
      
      this.nodes = transformedData.nodes;
      this.links = transformedData.links;
      this.render();
      
      return {
        status: 'success',
        message: `Données chargées: ${this.nodes.length} nœuds, ${this.links.length} liens`,
        data: transformedData,
        rawData: rawData
      };
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      return {
        status: 'error',
        message: `Erreur: ${error.message}`,
        data: null,
        rawData: null
      };
    }
  }
  
  /**
   * Transforme les résultats SPARQL en format compatible avec le graphe
   */
  transformSparqlResults(results) {
    if (!results.results || !results.results.bindings || results.results.bindings.length === 0) {
      console.warn("Résultats SPARQL vides ou invalides");
      return { nodes: [], links: [] };
    }
    
    const nodesMap = new Map();
    const linksMap = new Map();
    
    const vars = results.head.vars;
    console.log("Variables SPARQL disponibles:", vars);
    
    const sourceVar = vars[0];
    const targetVar = vars.length > 1 ? vars[1] : null;
    const labelVar = vars.find(v => v.includes('name') || v.includes('label') || v.includes('title'));
    
    results.results.bindings.forEach(binding => {
      if (binding[sourceVar]) {
        const sourceId = this.extractIdFromBinding(binding[sourceVar]);
        const sourceLabel = labelVar && binding[labelVar] ? binding[labelVar].value : sourceId;
        const sourceUri = binding[sourceVar].type === 'uri' ? binding[sourceVar].value : null;
        
        if (!nodesMap.has(sourceId)) {
          nodesMap.set(sourceId, {
            id: sourceId,
            label: sourceLabel,
            uri: sourceUri,
            originalData: { ...binding }
          });
        }
        
        if (targetVar && binding[targetVar]) {
          const targetId = this.extractIdFromBinding(binding[targetVar]);
          const targetUri = binding[targetVar].type === 'uri' ? binding[targetVar].value : null;
          
          if (!nodesMap.has(targetId)) {
            nodesMap.set(targetId, {
              id: targetId,
              label: targetId,
              uri: targetUri,
              originalData: { ...binding }
            });
          }
          
          const linkKey = `${sourceId}-${targetId}`;
          if (!linksMap.has(linkKey)) {
            linksMap.set(linkKey, {
              source: sourceId,
              target: targetId
            });
          }
        }
      }
    });
    
    return {
      nodes: Array.from(nodesMap.values()),
      links: Array.from(linksMap.values())
    };
  }
  
  /**
   * Extrait un identifiant d'un binding SPARQL
   */
  extractIdFromBinding(binding) {
    if (!binding) return "unknown";
    
    if (binding.type === 'uri') {
      const parts = binding.value.split(/[/#]/);
      return parts[parts.length - 1];
    } else {
      return binding.value;
    }
  }

  /**
   * Exécute une requête SPARQL détaillée pour un nœud spécifique
   */
  async executeNodeQuery(node) {
    if (!node || !node.uri) {
      console.error("Aucun URI disponible pour ce nœud");
      this.showNotification("Ce nœud n'a pas d'URI associé", 'error');
      return;
    }
    
    try {
      this.showNotification(`Récupération des détails pour ${node.label}...`);
      
      // Utiliser l'endpoint actif si disponible, sinon DBpedia par défaut
      const endpoint = this.currentEndpoint || this.getAttribute('endpoint') || 'https://dbpedia.org/sparql';
      
      // Faire plusieurs requêtes pour obtenir des informations riches
      const queries = this.buildInformativeQueries(node.uri);
      
      let allData = {
        descriptive: null,
        technical: null,
        relationships: null
      };
      
      // Exécuter les requêtes une par une
      for (const [queryType, query] of Object.entries(queries)) {
        try {
          console.log(`Exécution de la requête ${queryType}...`);
          const data = await this.executeSparqlQuery(endpoint, query);
          allData[queryType] = data;
        } catch (error) {
          console.warn(`Erreur pour la requête ${queryType}:`, error);
        }
      }
      
      this.displayRichNodeDetails(node, allData);
      
      return { status: 'success', data: allData };
    } catch (error) {
      console.error('Erreur lors de la récupération des détails:', error);
      this.showNotification(`Erreur: ${error.message}`, 'error');
      
      // Fallback : afficher les données disponibles du nœud
      this.displayBasicNodeDetails(node);
      
      return { status: 'error', message: error.message };
    }
  }
  
  /**
   * Construit des requêtes SPARQL informatives selon le type d'URI
   */
  buildInformativeQueries(uri) {
    const queries = {};
    
    // Requête pour informations descriptives (labels, définitions, commentaires, synonymes)
    queries.descriptive = `
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      PREFIX dc: <http://purl.org/dc/elements/1.1/>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX oboInOwl: <http://www.geneontology.org/formats/oboInOwl#>
      PREFIX obo: <http://purl.obolibrary.org/obo/>
      
      SELECT DISTINCT ?property ?value ?lang
      WHERE {
        <${uri}> ?property ?value .
        
        # Filtrer pour les propriétés informatives
        FILTER (
          ?property = rdfs:label ||
          ?property = rdfs:comment ||
          ?property = dc:description ||
          ?property = dcterms:description ||
          ?property = skos:definition ||
          ?property = oboInOwl:hasDefinition ||
          ?property = oboInOwl:hasExactSynonym ||
          ?property = oboInOwl:hasRelatedSynonym ||
          ?property = oboInOwl:hasBroadSynonym ||
          ?property = oboInOwl:hasNarrowSynonym ||
          ?property = skos:prefLabel ||
          ?property = skos:altLabel ||
          ?property = dc:title ||
          ?property = dcterms:title ||
          ?property = oboInOwl:id
        )
        
        # Capturer la langue si c'est un literal
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
      PREFIX obo: <http://purl.obolibrary.org/obo/>
      
      SELECT DISTINCT ?property ?value ?valueLabel
      WHERE {
        <${uri}> ?property ?value .
        
        # Filtrer pour les relations importantes
        FILTER (
          ?property = rdfs:subClassOf ||
          ?property = rdf:type ||
          ?property = skos:broader ||
          ?property = skos:narrower ||
          ?property = skos:related ||
          ?property = owl:sameAs ||
          ?property = owl:equivalentClass ||
          ?property = obo:BFO_0000050 ||  # part_of
          ?property = obo:RO_0002211 ||   # regulates
          ?property = obo:RO_0002212 ||   # negatively_regulates
          ?property = obo:RO_0002213      # positively_regulates
        )
        
        # Essayer de récupérer le label de la valeur si c'est une URI
        OPTIONAL {
          ?value rdfs:label ?valueLabel .
          FILTER(LANG(?valueLabel) = "" || LANGMATCHES(LANG(?valueLabel), "en") || LANGMATCHES(LANG(?valueLabel), "fr"))
        }
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
      
      SELECT DISTINCT ?property ?value ?valueType
      WHERE {
        <${uri}> ?property ?value .
        
        # Exclure les propriétés déjà couvertes dans les autres requêtes
        FILTER (
          ?property != rdfs:label &&
          ?property != rdfs:comment &&
          ?property != dc:description &&
          ?property != dcterms:description &&
          ?property != rdfs:subClassOf &&
          ?property != rdf:type
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
   * Exécute une requête SPARQL
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
    
    // Section contexte biologique (à partir des données originales du graphe)
    this.addBiologicalContextSection(content, node);
    
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
   * Ajoute une section de contexte biologique basée sur les données originales
   */
  addBiologicalContextSection(container, node) {
    // Chercher dans les données originales du nœud s'il y a des informations contextuelles
    if (!node.originalData && !this.lastSparqlData) return;
    
    const section = document.createElement('div');
    section.className = 'info-section';
    section.style.marginBottom = '20px';
    
    const title = document.createElement('h3');
    title.textContent = 'Biological Context (from original data)';
    title.style.borderBottom = '2px solid #17a2b8';
    title.style.paddingBottom = '5px';
    title.style.marginBottom = '15px';
    section.appendChild(title);
    
    // Analyser les données pour trouver des associations biologiques
    const biologicalInfo = this.extractBiologicalContext(node);
    
    if (biologicalInfo.length > 0) {
      biologicalInfo.forEach(info => {
        this.addDetailedInfoRow(section, info.type, info.value);
      });
    } else {
      const noInfo = document.createElement('div');
      noInfo.style.fontStyle = 'italic';
      noInfo.style.color = '#6c757d';
      noInfo.style.fontSize = '12px';
      noInfo.textContent = 'No specific biological context found in graph data';
      section.appendChild(noInfo);
    }
    
    container.appendChild(section);
  }
  
  /**
   * Extrait le contexte biologique d'un nœud
   */
  extractBiologicalContext(node) {
    const context = [];
    
    // Si on a des données originales dans le nœud
    if (node.originalData) {
      for (const [key, value] of Object.entries(node.originalData)) {
        if (key.includes('anatomical') || key.includes('Anatomical')) {
          context.push({
            type: 'Associated Anatomical Entity',
            value: value.value || value
          });
        }
        if (key.includes('goLabel') || key.includes('GoLabel')) {
          context.push({
            type: 'GO Function Description',
            value: value.value || value
          });
        }
        if (key.includes('tissue') || key.includes('cell') || key.includes('organ')) {
          context.push({
            type: 'Biological Structure',
            value: value.value || value
          });
        }
      }
    }
    
    // Analyser les connexions dans le graphe pour le contexte
    const connectedNodes = this.getConnectedNodes(node);
    if (connectedNodes.length > 0) {
      const nodeNames = connectedNodes.map(n => n.label || n.id).join(', ');
      context.push({
        type: 'Connected Nodes in Graph',
        value: `Related to: ${nodeNames}`
      });
    }
    
    // Extraire des informations depuis l'URI
    if (node.uri && node.uri.includes('GO_')) {
      const goId = node.uri.match(/GO_(\d+)/);
      if (goId) {
        context.push({
          type: 'Gene Ontology ID',
          value: `GO:${goId[1]} (Gene Ontology term)`
        });
      }
    }
    
    return context;
  }
  
  /**
   * Obtient les nœuds connectés à un nœud donné
   */
  getConnectedNodes(node) {
    const connected = [];
    this.links.forEach(link => {
      if (link.source.id === node.id && !connected.find(n => n.id === link.target.id)) {
        connected.push(link.target);
      } else if (link.target.id === node.id && !connected.find(n => n.id === link.source.id)) {
        connected.push(link.source);
      }
    });
    return connected.slice(0, 5); // Limiter à 5 pour ne pas surcharger
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
    const section = document.createElement('div');
    section.className = 'info-section';
    section.style.marginBottom = '20px';
    
    const title = document.createElement('h3');
    title.textContent = `Relationships & Classifications (${bindings.length} relations)`;
    title.style.borderBottom = '2px solid #ffc107';
    title.style.paddingBottom = '5px';
    title.style.marginBottom = '15px';
    section.appendChild(title);
    
    bindings.forEach((binding, index) => {
      const relationContainer = document.createElement('div');
      relationContainer.style.marginBottom = '15px';
      relationContainer.style.padding = '12px';
      relationContainer.style.border = '1px solid #ffc107';
      relationContainer.style.borderRadius = '5px';
      relationContainer.style.backgroundColor = index % 2 === 0 ? '#fff8e1' : '#ffffff';
      
      // Type de relation
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
      relationBadge.textContent = '[RELATION]';
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
      
      // Entité liée avec son label ET son URI
      const targetContainer = document.createElement('div');
      targetContainer.style.padding = '8px';
      targetContainer.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
      targetContainer.style.borderRadius = '3px';
      
      // Label de l'entité liée (si disponible)
      if (binding.valueLabel && binding.valueLabel.value) {
        const targetLabel = document.createElement('div');
        targetLabel.style.fontWeight = 'bold';
        targetLabel.style.color = '#212529';
        targetLabel.style.fontSize = '13px';
        targetLabel.style.marginBottom = '4px';
        targetLabel.textContent = `➤ ${binding.valueLabel.value}`;
        targetContainer.appendChild(targetLabel);
      }
      
      // URI de l'entité liée
      const targetUri = document.createElement('div');
      targetUri.style.fontSize = '12px';
      targetUri.style.color = '#495057';
      targetUri.style.wordBreak = 'break-all';
      targetUri.innerHTML = `Target URI: <a href="${binding.value.value}" target="_blank" style="color: #007cba;">${binding.value.value}</a>`;
      targetContainer.appendChild(targetUri);
      
      relationContainer.appendChild(targetContainer);
      section.appendChild(relationContainer);
    });
    
    container.appendChild(section);
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
    
    // Pour Gene Ontology
    const goMatch = uri.match(/GO_(\d+)/);
    if (goMatch) {
      return `GO:${goMatch[1]}`;
    }
    
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

    const nodeConnections = new Map();
    this.nodes.forEach(node => nodeConnections.set(node.id, 0));
    
    this.links.forEach(link => {
      nodeConnections.set(link.source, (nodeConnections.get(link.source) || 0) + 1);
      nodeConnections.set(link.target, (nodeConnections.get(link.target) || 0) + 1);
    });
    
    const getNodeRadius = nodeId => {
      const connections = nodeConnections.get(nodeId);
      return Math.max(8, Math.min(25, 8 + connections * 2));
    };
    
    const simulation = d3.forceSimulation(this.nodes)
      .force('link', d3.forceLink(this.links).id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => getNodeRadius(d.id) + 20))
      .force('x', d3.forceX(width / 2).strength(0.1))
      .force('y', d3.forceY(height / 2).strength(0.1));

    const constrainNode = (d) => {
      const radius = getNodeRadius(d.id);
      d.x = Math.max(radius, Math.min(width - radius, d.x));
      d.y = Math.max(radius, Math.min(height - radius, d.y));
    };
        
    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(this.links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-width', 1);
      
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
      .attr('r', d => getNodeRadius(d.id))
      .attr('fill', '#69b3a2');
    
    nodeGroup.append('text')
      .attr('class', 'node-label')
      .text(d => d.label || d.id);
        
    simulation.on('tick', () => {
      nodeGroup.each(constrainNode);
      
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      
      nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      const radius = getNodeRadius(d.id);
      d.fx = Math.max(radius, Math.min(width - radius, event.x));
      d.fy = Math.max(radius, Math.min(height - radius, event.y));
    }
    
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }
}

// Enregistrer le composant
customElements.define('vis-graph', VisGraph); 