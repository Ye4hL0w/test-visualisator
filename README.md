# @jmoncada/vis-graph

A web component for visualizing SPARQL knowledge graphs with D3.js and configurable visual mapping.

![npm version](https://img.shields.io/npm/v/@jmoncada/vis-graph)
![license](https://img.shields.io/npm/l/@jmoncada/vis-graph)

## ✨ Features

- 🚀 **Simple API**: Configure properties → call `launch()` → done!
- 🔄 **Multiple data sources**: SPARQL endpoints, JSON data, or manual nodes/links
- 🌐 **Smart CORS handling**: Automatic proxy fallback for cross-origin requests
- 🎨 **Visual mapping system**: JSON-based styling inspired by Vega-Lite
- 📊 **Interactive visualization**: Drag, zoom, hover, and contextual details
- 🔍 **Intelligent data transformation**: Automatic node labeling and deduplication
- 🛠️ **Zero dependencies**: Self-contained web component (D3.js included)

## 🚀 Quick Start

### Installation

```bash
npm install @jmoncada/vis-graph
```

## 📖 Quick Usage

### 1. Import

**Option A: ES Module (recommended with a bundler)**

```javascript
import '@jmoncada/vis-graph';
```

**Option B: UMD (for direct use in browser via `<script>`)**

Include the script in your HTML.

```html
<script src="https://unpkg.com/@jmoncada/vis-graph@latest/dist/vis-graph.umd.js"></script>
```

### 2. Usage

To get started with the `vis-graph` component and explore its capabilities, check out the **[vis-graph Component Guide](./docs/VisGraph.md)**.  
This guide covers everything from basic usage to advanced configuration, including internal operation and component architecture, so you can make the most of your knowledge graph visualizations.


### What the component does for you:

The `vis-graph` component handles the complexity behind the scenes. When you call `launch()`:

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

## 📄 License

This project is licensed under [MIT](./LICENSE). 