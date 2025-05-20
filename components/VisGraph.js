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
    
    // Jeu de données d'exemple simplifié
    this.sampleData = {
      nodes: [
        { id: "glucose", label: "Glucose", group: 1, count: 3 },
        { id: "lactate", label: "Lactate", group: 1, count: 2 },
        { id: "pyruvate", label: "Pyruvate", group: 1, count: 2 },
        { id: "glutamine", label: "Glutamine", group: 1, count: 4 }
      ],
      links: [
        { source: "glucose", target: "pyruvate", value: 0.8, sign: 1 },
        { source: "pyruvate", target: "lactate", value: 0.5, sign: 1 },
        { source: "glutamine", target: "glucose", value: 0.7, sign: 1 }
      ]
    };
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
    this.nodes = this.sampleData.nodes;
    this.links = this.sampleData.links;
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
   * @param {string} endpoint - URL de l'endpoint SPARQL
   * @param {string} query - Requête SPARQL à exécuter
   * @returns {Promise} - Promise résolue lorsque les données sont chargées
   */
  async loadFromSparqlEndpoint(endpoint, query) {
    try {
      // Préparer les paramètres pour la requête
      const params = new URLSearchParams();
      params.append('query', query.trim());
      params.append('format', 'json');
      
      // Effectuer la requête HTTP
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
      
      // Analyser la réponse
      const rawData = await response.json();
      
      // Transformer les résultats en format compatible avec le graphe
      const transformedData = this.transformSparqlResults(rawData);
      
      // Mettre à jour les données et redessiner le graphe
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
   * Version simplifiée qui extrait les nœuds et liens de manière générique
   */
  transformSparqlResults(results) {
    // Vérifier si les données sont valides
    if (!results.results || !results.results.bindings || results.results.bindings.length === 0) {
      console.warn("Résultats SPARQL vides ou invalides");
      return { nodes: [], links: [] };
    }
    
    // Maps pour stocker les nœuds et liens uniques
    const nodesMap = new Map();
    const linksMap = new Map();
    
    // Récupérer les variables disponibles
    const vars = results.head.vars;
    console.log("Variables SPARQL disponibles:", vars);
    
    // Déterminer les variables à utiliser
    // On prend par défaut les deux premières variables comme source et cible
    const sourceVar = vars[0];
    const targetVar = vars.length > 1 ? vars[1] : null;
    
    // Rechercher une variable qui pourrait contenir une valeur numérique
    const valueVar = vars.find(v => v.includes('score') || v.includes('value') || v.includes('weight'));
    
    // Rechercher une variable qui pourrait contenir un nom/libellé
    const labelVar = vars.find(v => v.includes('name') || v.includes('label') || v.includes('title'));
    
    // Traiter chaque binding
    results.results.bindings.forEach(binding => {
      if (binding[sourceVar]) {
        // Extraire l'ID et le label du nœud source
        const sourceId = this.extractIdFromBinding(binding[sourceVar]);
        const sourceLabel = labelVar && binding[labelVar] ? binding[labelVar].value : sourceId;
        
        // Ajouter le nœud source s'il n'existe pas
        if (!nodesMap.has(sourceId)) {
          nodesMap.set(sourceId, {
            id: sourceId,
            label: sourceLabel,
            group: 1,
            count: 3
          });
        }
        
        // Si on a une variable cible, créer un lien
        if (targetVar && binding[targetVar]) {
          const targetId = this.extractIdFromBinding(binding[targetVar]);
          
          // Ajouter le nœud cible s'il n'existe pas
          if (!nodesMap.has(targetId)) {
            nodesMap.set(targetId, {
              id: targetId,
              label: targetId,
              group: 2,
              count: 2
            });
          }
          
          // Extraire la valeur pour le lien (si disponible)
          let linkValue = 0.5;
          let linkSign = 1;
          
          if (valueVar && binding[valueVar]) {
            try {
              const val = parseFloat(binding[valueVar].value);
              linkValue = Math.abs(val) / 100; // Normaliser
              linkValue = Math.max(0.2, Math.min(1, linkValue)); // Borner entre 0.2 et 1
              linkSign = val >= 0 ? 1 : -1;
            } catch (e) { /* Utiliser les valeurs par défaut */ }
          }
          
          // Créer un lien unique
          const linkKey = `${sourceId}-${targetId}`;
          if (!linksMap.has(linkKey)) {
            linksMap.set(linkKey, {
              source: sourceId,
              target: targetId,
              value: linkValue,
              sign: linkSign
            });
          }
        }
      }
    });
    
    // Convertir les Maps en tableaux
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
      // Extraire le dernier segment de l'URI
      const parts = binding.value.split(/[/#]/);
      return parts[parts.length - 1];
    } else {
      return binding.value;
    }
  }

  /**
   * Rend le graphe avec D3.js
   */
  render() {
    // Définir le contenu HTML et CSS
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
        }
        svg {
          width: 100%;
          height: 100%;
        }
        .links line {
          stroke-opacity: 0.6;
        }
        .nodes circle {
          stroke: #fff;
          stroke-width: 1.5px;
          cursor: pointer;
        }
        .labels {
          font-size: 10px;
          pointer-events: none;
        }
        .tooltip {
          position: absolute;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 5px;
          border-radius: 5px;
          pointer-events: none;
          z-index: 10;
        }
      </style>
      <div class="graph-container">
        <svg></svg>
      </div>
    `;

    // Créer le graphe
    this.createForceGraph();
  }

  /**
   * Crée une visualisation force-directed avec D3.js
   */
  createForceGraph() {
    if (!this.nodes || this.nodes.length === 0) return;
    
    // Référence au conteneur
    const svg = d3.select(this.shadowRoot.querySelector('svg'));
    const container = this.shadowRoot.querySelector('.graph-container');
    
    // Dimensions
    const width = this.width;
    const height = this.height;
    
    // Créer la simulation de force
    const simulation = d3.forceSimulation(this.nodes)
      .force('link', d3.forceLink(this.links).id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(15));
      
    // Dessiner les liens
    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(this.links)
      .enter()
      .append('line')
      .attr('stroke', d => d.sign > 0 ? '#1a9850' : '#d73027') // Vert pour positif, rouge pour négatif
      .attr('stroke-width', d => Math.max(1, d.value * 5));
      
    // Dessiner les nœuds
    const node = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(this.nodes)
      .enter()
      .append('circle')
      .attr('r', d => 5 + d.count)
      .attr('fill', d => d3.schemeCategory10[d.group % 10])
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));
    
    // Ajouter des tooltips
    node.on('mouseover', function(event, d) {
      const tooltip = d3.select(container)
        .append('div')
        .attr('class', 'tooltip')
        .style('left', `${event.offsetX + 10}px`)
        .style('top', `${event.offsetY - 10}px`);
      
      tooltip.html(`<strong>${d.label || d.id}</strong>`);
      d3.select(this).attr('stroke', '#333').attr('stroke-width', 2);
    })
    .on('mouseout', function() {
      d3.select(container).select('.tooltip').remove();
      d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1.5);
    });
    
    // Ajouter les labels
    const label = svg.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(this.nodes)
      .enter()
      .append('text')
      .attr('dx', 10)
      .attr('dy', '.35em')
      .text(d => d.label || d.id)
      .style('font-size', '10px')
      .style('pointer-events', 'none');
        
    // Mise à jour des positions
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      
      node
        .attr('cx', d => d.x = Math.max(10, Math.min(width - 10, d.x)))
        .attr('cy', d => d.y = Math.max(10, Math.min(height - 10, d.y)));
      
      label
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });
    
    // Fonctions pour le drag
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
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