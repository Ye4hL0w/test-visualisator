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

// Or if you need to access the class directly (less common for just using it)
// import { VisGraph } from '@jmoncada/vis-graph'; 
```

**Option B: UMD (for direct use in browser via `<script>`)**

Include the script in your HTML.

```html
<script src="https://unpkg.com/@jmoncada/vis-graph@latest/dist/vis-graph.umd.js"></script>
```

### 2. HTML Usage

```html
<vis-graph id="myGraph" width="800" height="600"></vis-graph>

<script>
  const graph = document.getElementById('myGraph');

  // Simple example with Wikidata
  graph.loadFromSparqlEndpoint(
    'https://query.wikidata.org/sparql',
    `SELECT ?item ?itemLabel WHERE {
      ?item wdt:P31 wd:Q5 .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    } LIMIT 10`
  ).then(result => {
    if (result.status === 'success') {
      console.log('Graph loaded with', result.data.nodes.length, 'nodes');
    }
  });
</script>
```

## Documentation

📚 **Detailed guides available:**

- **[vis-graph Component Guide](https://github.com/Ye4hL0w/test-visualisator/blob/main/docs/VisGraph.md)** - Internal operation and component architecture
- **[SparqlDataFetcher Guide](https://github.com/Ye4hL0w/test-visualisator/blob/main/docs/dataFetcher-setup.md)** - Simple usage of the data retrieval module
- **[SPARQL Proxy Configuration](https://github.com/Ye4hL0w/test-visualisator/blob/main/docs/proxy-setup.md)** - Resolving CORS issues

## License

This project is licensed under [MIT](./LICENSE). 