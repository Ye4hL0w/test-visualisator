/**
 * Composant de visualisation de tableau avec affichage JSON
 */
export class VisTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.data = null;
    this.width = 800;
    this.height = 600;
    
    // Jeu de données d'exemple
    this.sampleData = [
      { id: "Metabolite A", group: "metabolite", enzyme: "Enzyme 1", value: 42 },
      { id: "Metabolite B", group: "metabolite", enzyme: "Enzyme 2", value: 28 },
      { id: "Metabolite C", group: "metabolite", enzyme: "Enzyme 3", value: 35 },
      { id: "Enzyme 1", group: "enzyme", pathway: "Glycolysis", value: 12 },
      { id: "Enzyme 2", group: "enzyme", pathway: "Krebs Cycle", value: 18 },
      { id: "Enzyme 3", group: "enzyme", pathway: "Pentose Phosphate", value: 24 }
    ];
  }

  /**
   * Liste des attributs à observer
   */
  static get observedAttributes() {
    return ['width', 'height', 'show-json'];
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
    } else if (name === 'show-json') {
      this.showJson = newValue === 'true' || newValue === '';
      this.render();
    }
  }

  /**
   * Initialisation quand le composant est ajouté au DOM
   */
  connectedCallback() {
    this.data = this.sampleData;
    this.showJson = this.getAttribute('show-json') === 'true' || this.getAttribute('show-json') === '';
    this.render();
  }

  /**
   * Définit manuellement les données
   * @param {Array} data - Données à afficher
   */
  setData(data) {
    this.data = data;
    this.render();
  }

  /**
   * Rend le tableau avec les données
   */
  render() {
    if (!this.data || this.data.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Extraire les entêtes du tableau à partir des clés du premier élément
    const headers = Object.keys(this.data[0]);

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: Arial, sans-serif;
        }
        .container {
          width: ${this.width}px;
          height: ${this.height}px;
          overflow: auto;
          display: flex;
          flex-direction: column;
        }
        .table-container {
          overflow: auto;
          margin-bottom: 15px;
          flex: 1;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          background-color: #fff;
        }
        th {
          background-color: #4CAF50;
          color: white;
          padding: 8px;
          text-align: left;
          position: sticky;
          top: 0;
        }
        td {
          padding: 8px;
          border-bottom: 1px solid #ddd;
        }
        tr:hover {
          background-color: #f5f5f5;
        }
        .stats {
          background-color: #f5f5f5;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 10px;
        }
        .json-view {
          max-height: 200px;
          overflow: auto;
          background-color: #272822;
          color: #f8f8f2;
          padding: 10px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          white-space: pre-wrap;
          display: ${this.showJson ? 'block' : 'none'};
          margin-top: 10px;
        }
        .toggle-json {
          background-color: #4CAF50;
          color: white;
          border: none;
          padding: 5px 10px;
          text-align: center;
          text-decoration: none;
          display: inline-block;
          font-size: 12px;
          margin: 4px 2px;
          cursor: pointer;
          border-radius: 4px;
        }
      </style>
      <div class="container">
        <div class="stats">
          <strong>Nombre de résultats:</strong> ${this.data.length}
          <button class="toggle-json" id="toggle-json">
            ${this.showJson ? 'Masquer JSON' : 'Afficher JSON'}
          </button>
        </div>
        <div class="json-view" id="json-view">
          ${JSON.stringify(this.data, null, 2)}
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                ${headers.map(header => `<th>${header}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${this.data.map(row => `
                <tr>
                  ${headers.map(header => `<td>${row[header] !== undefined && row[header] !== null ? row[header] : ''}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Ajouter l'événement pour basculer l'affichage JSON
    this.shadowRoot.getElementById('toggle-json').addEventListener('click', () => {
      this.showJson = !this.showJson;
      const jsonView = this.shadowRoot.getElementById('json-view');
      jsonView.style.display = this.showJson ? 'block' : 'none';
      this.shadowRoot.getElementById('toggle-json').textContent = 
        this.showJson ? 'Masquer JSON' : 'Afficher JSON';
    });
  }

  /**
   * Affiche un état vide quand aucune donnée n'est disponible
   */
  renderEmptyState() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: Arial, sans-serif;
        }
        .empty-state {
          width: ${this.width}px;
          height: ${this.height}px;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 4px;
          color: #666;
        }
      </style>
      <div class="empty-state">
        <p>Aucune donnée à afficher.</p>
      </div>
    `;
  }
}

// Enregistrer le composant
customElements.define('vis-table', VisTable); 