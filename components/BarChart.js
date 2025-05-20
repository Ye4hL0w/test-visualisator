/**
 * @fileOverview Composant Web BarChart pour visualiser des données SPARQL
 * @author Moncada Jérémy
 * @version 1.0.0
 */

class BarChart extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.data = [];
    this.width = 600;
    this.height = 400;
    this.margin = { top: 20, right: 30, bottom: 40, left: 50 };
  }

  static get observedAttributes() {
    return ['sparql-endpoint', 'sparql-query', 'sparql-results', 'width', 'height'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'sparql-endpoint':
        this.endpoint = newValue;
        if (this.hasAttribute('sparql-query')) {
          this.fetchSparqlData();
        }
        break;
      case 'sparql-query':
        this.query = newValue;
        if (this.hasAttribute('sparql-endpoint')) {
          this.fetchSparqlData();
        }
        break;
      case 'sparql-results':
        try {
          this.data = JSON.parse(newValue);
          this.render();
        } catch (e) {
          console.error('Invalid SPARQL results format:', e);
        }
        break;
      case 'width':
        this.width = parseInt(newValue) || 600;
        this.render();
        break;
      case 'height':
        this.height = parseInt(newValue) || 400;
        this.render();
        break;
    }
  }

  connectedCallback() {
    // Initial render with sample data if no data is provided
    if (!this.data || !this.data.results) {
      this.data = this.getSampleData();
    }
    
    // Apply sample data to the demo component
    if (this.id === 'demo-bar-chart') {
      this.data = window.SAMPLE_SPARQL_DATA || this.getSampleData();
    }
    
    this.render();
  }

  async fetchSparqlData() {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sparql-query',
          'Accept': 'application/json'
        },
        body: this.query
      });
      
      if (!response.ok) {
        throw new Error(`SPARQL query failed: ${response.statusText}`);
      }
      
      this.data = await response.json();
      this.render();
    } catch (error) {
      console.error('Error fetching SPARQL data:', error);
      this.renderError(error.message);
    }
  }

  getSampleData() {
    return {
      head: {
        vars: ["subject", "count"]
      },
      results: {
        bindings: [
          { subject: { value: "Metabolite A" }, count: { value: "45", datatype: "http://www.w3.org/2001/XMLSchema#integer" } },
          { subject: { value: "Metabolite B" }, count: { value: "32", datatype: "http://www.w3.org/2001/XMLSchema#integer" } },
          { subject: { value: "Metabolite C" }, count: { value: "28", datatype: "http://www.w3.org/2001/XMLSchema#integer" } },
          { subject: { value: "Metabolite D" }, count: { value: "16", datatype: "http://www.w3.org/2001/XMLSchema#integer" } },
          { subject: { value: "Metabolite E" }, count: { value: "22", datatype: "http://www.w3.org/2001/XMLSchema#integer" } }
        ]
      }
    };
  }

  renderError(message) {
    this.shadowRoot.innerHTML = `
      <style>
        .error {
          color: red;
          padding: 20px;
          border: 1px solid red;
          border-radius: 4px;
          background-color: #ffeeee;
        }
      </style>
      <div class="error">
        <h3>Error</h3>
        <p>${message}</p>
      </div>
    `;
  }

  render() {
    if (!this.data || !this.data.results || !this.data.results.bindings || this.data.results.bindings.length === 0) {
      this.shadowRoot.innerHTML = `<p>No data available</p>`;
      return;
    }

    const bindings = this.data.results.bindings;
    const vars = this.data.head.vars;
    
    // Determine which variables to use for x and y
    const xVar = vars[0] || 'subject';
    const yVar = vars[1] || 'count';

    // Extract data in a format suitable for d3
    const chartData = bindings.map(binding => ({
      x: binding[xVar]?.value || '',
      y: parseFloat(binding[yVar]?.value) || 0
    }));

    // Sort data for better visualization
    chartData.sort((a, b) => b.y - a.y);

    const width = this.width;
    const height = this.height;
    const margin = this.margin;
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Generate SVG
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: Arial, sans-serif;
        }
        .bar {
          fill: steelblue;
          transition: fill 0.3s;
        }
        .bar:hover {
          fill: #45a049;
        }
        .axis text {
          font-size: 12px;
        }
        .axis-label {
          font-size: 14px;
          font-weight: bold;
        }
        .tooltip {
          position: absolute;
          background-color: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s;
        }
      </style>
      <div id="chart-container">
        <svg width="${width}" height="${height}"></svg>
        <div class="tooltip"></div>
      </div>
    `;

    // Use setTimeout to ensure the DOM is ready
    setTimeout(() => {
      this.drawChart(chartData, xVar, yVar);
    }, 0);
  }

  drawChart(data, xLabel, yLabel) {
    const svg = d3.select(this.shadowRoot.querySelector('svg'));
    const tooltip = d3.select(this.shadowRoot.querySelector('.tooltip'));
    const width = this.width;
    const height = this.height;
    const margin = this.margin;
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Create chart group
    const chart = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Create scales
    const xScale = d3.scaleBand()
      .domain(data.map(d => d.x))
      .range([0, chartWidth])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.y) * 1.1])
      .range([chartHeight, 0]);

    // Create axes
    const xAxis = chart.append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em');

    const yAxis = chart.append('g')
      .attr('class', 'axis y-axis')
      .call(d3.axisLeft(yScale));

    // Add axis labels
    chart.append('text')
      .attr('class', 'axis-label')
      .attr('text-anchor', 'middle')
      .attr('x', chartWidth / 2)
      .attr('y', chartHeight + margin.bottom - 5)
      .text(xLabel);

    chart.append('text')
      .attr('class', 'axis-label')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight / 2)
      .attr('y', -margin.left + 15)
      .text(yLabel);

    // Create bars
    chart.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.x))
      .attr('y', d => yScale(d.y))
      .attr('width', xScale.bandwidth())
      .attr('height', d => chartHeight - yScale(d.y))
      .on('mouseover', (event, d) => {
        tooltip
          .style('opacity', 1)
          .style('left', `${event.pageX}px`)
          .style('top', `${event.pageY}px`)
          .html(`${d.x}: ${d.y}`);
      })
      .on('mouseout', () => {
        tooltip.style('opacity', 0);
      });
  }
}

// Register the custom element
customElements.define('bar-chart', BarChart);

// Export component (optional, for module usage)
export default BarChart; 