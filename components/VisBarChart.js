/**
 * Composant de visualisation de diagramme à barres
 */
import { BaseVisualization } from './BaseVisualization.js';

export class VisBarChart extends BaseVisualization {
  constructor() {
    super();
    this.xField = '';
    this.yField = '';
    this.chartData = [];
  }

  /**
   * Liste des attributs à observer
   */
  static get observedAttributes() {
    return [...BaseVisualization.observedAttributes, 'x-field', 'y-field'];
  }

  /**
   * Gestion des changements d'attributs
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === 'x-field') {
      this.xField = newValue;
      if (this.data) {
        this.processData();
        this.render();
      }
    } else if (name === 'y-field') {
      this.yField = newValue;
      if (this.data) {
        this.processData();
        this.render();
      }
    } else {
      // Appel à la méthode de la classe parente pour les autres attributs
      super.attributeChangedCallback(name, oldValue, newValue);
    }
  }

  /**
   * Traite les données SPARQL pour les adapter au format du diagramme à barres
   */
  processData() {
    if (!this.data || !this.data.results || !this.data.results.bindings) {
      console.warn("Pas de données SPARQL valides pour le diagramme à barres");
      return;
    }

    const bindings = this.data.results.bindings;
    const vars = this.data.head.vars;
    
    // Détermine quels champs utiliser pour x et y
    const xVar = this.xField && vars.includes(this.xField) ? this.xField : vars[0];
    const yVar = this.yField && vars.includes(this.yField) ? this.yField : vars.length > 1 ? vars[1] : vars[0];
    
    console.log(`Utilisation des champs: x=${xVar}, y=${yVar}`);
    
    // Extraire les données pour le diagramme
    this.chartData = bindings.map(binding => {
      let x = binding[xVar]?.value || '';
      let y = binding[yVar]?.value || 0;
      
      // Extraire les noms des URIs si nécessaire
      if (binding[xVar]?.type === 'uri') {
        x = this.extractNameFromURI(x);
      }
      
      // Convertir la valeur y en nombre si possible
      if (!isNaN(y)) {
        y = parseFloat(y);
      } else if (binding[yVar]?.type === 'uri') {
        y = 1; // Valeur par défaut pour les URIs
      }
      
      return { x, y };
    });
    
    // Trier les données pour une meilleure visualisation (optionnel)
    this.chartData.sort((a, b) => b.y - a.y);
    
    console.log(`Diagramme à barres créé avec ${this.chartData.length} entrées`);
  }

  /**
   * Rend le diagramme à barres avec D3.js
   */
  render() {
    if (!this.data) {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            font-family: Arial, sans-serif;
          }
          .no-data {
            width: ${this.width}px;
            height: ${this.height}px;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
        </style>
        <div class="no-data">
          <p>Aucune donnée à visualiser. Utilisez setQuery() ou l'attribut sparql-results.</p>
        </div>
      `;
      return;
    }

    // Si pas de données après traitement, afficher un message
    if (!this.chartData || this.chartData.length === 0) {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            font-family: Arial, sans-serif;
          }
          .no-data {
            width: ${this.width}px;
            height: ${this.height}px;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
        </style>
        <div class="no-data">
          <p>Aucune donnée à visualiser. Vérifiez les champs X et Y.</p>
        </div>
      `;
      return;
    }

    // Définir le contenu HTML et CSS
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: Arial, sans-serif;
        }
        .chart-container {
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
        .bar {
          fill: steelblue;
          transition: fill 0.3s;
        }
        .bar:hover {
          fill: #45a049;
        }
        .axis {
          font-size: 12px;
        }
        .axis-title {
          font-size: 14px;
          font-weight: bold;
        }
        .tooltip {
          position: absolute;
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 12px;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s;
        }
      </style>
      <div class="chart-container">
        <svg></svg>
      </div>
      <div class="tooltip"></div>
    `;

    // Utiliser D3 pour créer le diagramme à barres
    this.createBarChart();
  }

  /**
   * Crée un diagramme à barres avec D3.js
   */
  createBarChart() {
    // Sélectionner SVG et tooltip
    const svg = d3.select(this.shadowRoot.querySelector('svg'));
    const tooltip = d3.select(this.shadowRoot.querySelector('.tooltip'));
    
    // Définir les dimensions
    const width = this.width;
    const height = this.height;
    const margin = this.margin;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Créer le groupe principal
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Créer les échelles
    const xScale = d3.scaleBand()
      .domain(this.chartData.map(d => d.x))
      .range([0, innerWidth])
      .padding(0.1);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(this.chartData, d => d.y) * 1.1])
      .range([innerHeight, 0]);
    
    // Créer les axes
    const xAxis = g.append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em');
    
    const yAxis = g.append('g')
      .attr('class', 'axis y-axis')
      .call(d3.axisLeft(yScale));
    
    // Ajouter des titres d'axe
    g.append('text')
      .attr('class', 'axis-title')
      .attr('text-anchor', 'middle')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + margin.bottom - 5)
      .text(this.xField || 'Catégorie');
    
    g.append('text')
      .attr('class', 'axis-title')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -margin.left + 15)
      .text(this.yField || 'Valeur');
    
    // Créer les barres
    g.selectAll('.bar')
      .data(this.chartData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.x))
      .attr('y', d => yScale(d.y))
      .attr('width', xScale.bandwidth())
      .attr('height', d => innerHeight - yScale(d.y))
      .on('mouseover', (event, d) => {
        tooltip
          .style('opacity', 1)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
          .html(`<strong>${d.x}</strong>: ${d.y}`);
      })
      .on('mouseout', () => {
        tooltip.style('opacity', 0);
      });
  }
}

// Enregistrer le composant
customElements.define('vis-barchart', VisBarChart); 