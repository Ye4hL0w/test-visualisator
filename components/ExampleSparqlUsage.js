/**
 * Exemple d'utilisation de SparqlDataFetcher dans un autre composant
 */
import { SparqlDataFetcher } from './SparqlDataFetcher.js';

export class ExampleSparqlUsage extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Instance réutilisable du fetcher SPARQL
    this.sparqlFetcher = new SparqlDataFetcher();
  }

  connectedCallback() {
    this.render();
  }

  async loadSparqlData(endpoint, query) {
    try {
      // Utilisation simple du fetcher
      const result = await this.sparqlFetcher.loadFromSparqlEndpoint(
        endpoint,
        query,
        null, // pas de JSON direct
        () => this.showErrorMessage("Problème avec le proxy CORS"), // callback erreur proxy
        (message, type) => this.showNotification(message, type) // callback notifications
      );

      if (result.status === 'success') {
        console.log('Données récupérées:', result.data);
        this.displayData(result.data);
      } else {
        console.error('Erreur:', result.message);
        this.showErrorMessage(result.message);
      }

    } catch (error) {
      console.error('Erreur fatale:', error);
      this.showErrorMessage(`Erreur fatale: ${error.message}`);
    }
  }

  displayData(data) {
    // Afficher les données dans votre composant
    const container = this.shadowRoot.querySelector('.data-container');
    container.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  }

  showErrorMessage(message) {
    const container = this.shadowRoot.querySelector('.data-container');
    container.innerHTML = `<div style="color: red;">Erreur: ${message}</div>`;
  }

  showNotification(message, type) {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .container {
          padding: 20px;
          border: 1px solid #ccc;
          border-radius: 5px;
        }
        .data-container {
          margin-top: 10px;
          padding: 10px;
          background: #f5f5f5;
          border-radius: 3px;
        }
        button {
          padding: 8px 16px;
          margin: 5px;
          cursor: pointer;
        }
      </style>
      <div class="container">
        <h3>Exemple d'utilisation de SparqlDataFetcher</h3>
        <button onclick="this.getRootNode().host.loadSparqlData('https://dbpedia.org/sparql', 'SELECT * WHERE { ?s ?p ?o } LIMIT 5')">
          Test DBpedia
        </button>
        <div class="data-container">
          Cliquez sur un bouton pour tester...
        </div>
      </div>
    `;
  }
}

// Enregistrer le composant exemple
customElements.define('example-sparql-usage', ExampleSparqlUsage); 