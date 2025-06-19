# @jmoncada/vis-graph

A web component for visualizing SPARQL knowledge graphs with D3.js.

![npm version](https://img.shields.io/npm/v/@jmoncada/vis-graph)
![license](https://img.shields.io/npm/l/@jmoncada/vis-graph)

## ✨ Features

- 🔄 **Automatic loading** from SPARQL endpoints
- 🌐 **Automatic CORS/Proxy handling** 
- 🎨 **Interactive visualization** with D3.js
- 📊 **Enriched details** for each node
- 🔍 **Smart transformation** of SPARQL data

## 🚀 Installation

```bash
npm install @jmoncada/vis-graph
```

## 📖 Quick Usage

### 1. Import

**Option A: ES Module (recommended with a bundler)**

```javascript
import '@jmoncada/vis-graph'; // Import and register the Web Component <vis-graph>
```

**Option B: UMD (for direct use in browser via `<script>`)**

Include the script in your HTML.

```html
<script src="https://unpkg.com/@jmoncada/vis-graph@latest/dist/vis-graph.umd.js"></script>
```

### 2. Usage

The `<vis-graph>` component is designed to be simple. You configure it with properties, and then you call a method to execute the query.

```html
<!-- Add the component to your page -->
<vis-graph id="myGraph" width="800" height="600"></vis-graph>

<script>
  const graph = document.getElementById('myGraph');

  // 1. Configure the component with your SPARQL endpoint and query
  graph.sparqlEndpoint = 'https://query.wikidata.org/sparql';
  graph.sparqlQuery = `
    SELECT ?item ?itemLabel WHERE {
      ?item wdt:P31 wd:Q5 .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    } LIMIT 10`;
  
  // Optional: configure a proxy if your endpoint has CORS issues
  graph.sparqlProxy = 'http://localhost:3001/sparql-proxy';

  // 2. Execute the query and load the graph
  graph.setSparqlQuery().then(result => {
    if (result.status === 'success') {
      console.log('Graph loaded with', result.data.nodes.length, 'nodes');
    } else {
      console.error('Failed to load graph:', result.message);
    }
  });
</script>
```

### What the component does for you:

The `vis-graph` component handles the complexity behind the scenes. When you call `setSparqlQuery()`:

-   It uses its internal `SparqlDataFetcher`.
-   It automatically tries to connect to the endpoint.
-   If it fails due to CORS, it automatically uses the configured proxy.
-   It transforms the raw SPARQL results into a graph structure (nodes and links).
-   It renders the interactive graph using D3.js.

You don't need to worry about the details, just provide the configuration and the component does the rest.

## Documentation

📚 **Detailed guides available:**

- **[vis-graph Component Guide](./docs/VisGraph.md)** - Internal operation and component architecture
- **[SparqlDataFetcher Guide](./docs/dataFetcher-setup.md)** - Simple usage of the data retrieval module
- **[SPARQL Proxy Configuration](./docs/proxy-setup.md)** - Resolving CORS issues

## License

This project is licensed under [MIT](./LICENSE). 