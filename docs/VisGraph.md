# vis-graph Component

The `vis-graph.js` file defines a web component (`<vis-graph>`) capable of displaying interactive knowledge graphs from data sourced from SPARQL endpoints. It uses D3.js for visualization and the `SparqlDataFetcher` to retrieve data.

## Public API

The component follows a simple **"configure properties → launch"** pattern. Set the properties you need, then call `launch()` to execute.

### Main Properties

| Property         | Type     | Description                                                    |
|------------------|----------|----------------------------------------------------------------|
| `sparqlEndpoint` | string   | URL of the SPARQL endpoint                                     |
| `sparqlQuery`    | string   | SPARQL query string                                            |
| `sparqlResult`   | object   | Pre-formatted SPARQL JSON result (alternative to endpoint)    |
| `proxy`          | string   | Optional proxy URL for CORS issues                             |
| `encoding`       | object   | Custom visual encoding configuration                           |
| `nodes`          | array    | Manual node data (alternative to SPARQL)                      |
| `links`          | array    | Manual link data (alternative to SPARQL)                      |

### Main Method

| Method                    | Description                                                          |
|---------------------------|----------------------------------------------------------------------|
| `launch()`                | **Main entry point**: Executes data loading and rendering based on configured properties |

### Helper Methods

| Method                    | Description                                                          |
|---------------------------|----------------------------------------------------------------------|
| `getEncoding()`           | Returns the currently active visual encoding configuration object   |
| `getDefaultEncoding()`    | Returns the component's default encoding configuration object       |

## 🚀 Quick Usage

The `<vis-graph>` component follows a simple **"configure → launch"** pattern. Set the properties you need, then call `launch()` once.

### Basic SPARQL Query

```html
<!-- Add the component to your page -->
<vis-graph id="myGraph" width="800" height="600"></vis-graph>

<script>
  const graph = document.getElementById('myGraph');

  // 1. Configure the component properties
  graph.sparqlEndpoint = 'https://query.wikidata.org/sparql';
  graph.sparqlQuery = `
    SELECT ?item ?itemLabel WHERE {
      ?item wdt:P31 wd:Q5 .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    } LIMIT 10`;
  
  // Optional: configure a proxy if your endpoint has CORS issues
  graph.proxy = 'http://localhost:3001/sparql-proxy';

  // 2. Launch the visualization
  graph.launch().then(result => {
    if (result.status === 'success') {
      console.log('Graph loaded with', result.data.nodes.length, 'nodes');
    } else {
      console.error('Failed to load graph:', result.message);
    }
  });
</script>
```

### Custom Visual Encoding

For advanced visual customization, configure the encoding before launch:

```javascript
// Configure custom visual encoding
graph.encoding = {
  nodes: {
    field: ["gene", "protein"],
    color: { 
      field: "geneCategory",
      scale: { type: "ordinal", range: "Set1" }
    }
  },
  links: {
    field: {source: "gene", target: "protein"}
  }
};
graph.launch();
```

> **📖 For complete encoding documentation**, see [Visual Encoding System](./Encoding.md)

### Alternative Data Sources

You can also use pre-formatted SPARQL JSON data or manual node/link arrays:

```javascript
// Option 1: Use pre-formatted SPARQL JSON
graph.sparqlResult = mySparqlJsonData;
graph.launch();

// Option 2: Use manual data
graph.nodes = [
  { id: 'node1', label: 'First Node' },
  { id: 'node2', label: 'Second Node' }
];
graph.links = [
  { source: 'node1', target: 'node2' }
];
graph.launch();
```

### Data Source Priority

The component follows this priority order:
1. **Manual data**: `nodes` and `links` arrays
2. **SPARQL JSON**: `sparqlResult` object  
3. **SPARQL Query**: `sparqlEndpoint` + `sparqlQuery`

## Visual Encoding System

The component uses a sophisticated visual encoding system inspired by VEGA to transform SPARQL data into interactive knowledge graphs. The encoding defines:

1. **Field Mapping**: Which SPARQL variables to use for nodes and links
2. **Visual Properties**: How to color, size, and style elements

### Basic Encoding Structure

```javascript
graph.encoding = {
  nodes: {
    field: ["gene", "protein"],          // Required: Array of SPARQL variables
    color: { field: "type", scale: {...} },  // Optional: Color mapping
    size: { field: "connections" }           // Optional: Size mapping
  },
  links: {
    field: {source: "gene", target: "protein"},  // Directional links
    // OR
    field: "relationshipType"                     // Semantic links
  }
};
```

### Key Features

- **Automatic domain calculation** from your data via [DomainCalculator](./DomainCalculator.md)
- **Intelligent color palette management** via [ColorScaleCalculator](./ColorScaleCalculator.md)
- **Strict validation** prevents rendering errors
- **Flexible link types**: directional or semantic relationships

> **📖 Complete Documentation**: For detailed encoding specifications, validation rules, examples, and best practices, see [Visual Encoding System](./Encoding.md)

## General Operation

1.  **Configuration**: The user configures the component by setting the `sparqlEndpoint`, `sparqlQuery`, and optional `sparqlProxy` properties.

2.  **Data Loading**: The user calls `executeSparqlQuery()`. This method internally calls `loadFromSparqlEndpoint(endpoint, query, jsonData, proxyUrl)` which:
    *   Uses the `SparqlDataFetcher` with automatic CORS error and proxy management
    *   Stores raw data in `this.sparqlData` (component property)
    *   Transforms SPARQL results into nodes and links via `transformSparqlResults`
    *   Displays notifications and error panels if necessary

3.  **Data Transformation (`transformSparqlResults`)**:
    *   **Field Mapping**: Uses the new field formats from the visual encoding:
        - `nodes.field` (array): Determines which SPARQL variables to use for creating nodes
        - `links.field` (object/string): For directional links `{source: "var1", target: "var2"}` or semantic links `"semanticVar"`
    *   **Link Type Detection**: Automatically determines if links are directional (with arrows) or semantic (relationships)
    *   **Interactive Links**: Hover tooltips show different information based on link type:
        - Directional: "Source → Target"  
        - Semantic: "Source ↔ Target" + relationship label
    *   **Smart Labels**: The `_determineNodeLabelFromBinding()` method finds the best label by analyzing:
        1.  Direct literal values
        2.  Conventional label variables (e.g., `geneLabel` for `gene`)
        3.  Other descriptive variables with scoring system
        4.  ID extracted as last resort
    *   **Original Data**: Each node preserves its complete SPARQL `binding` in `originalData` and attaches all values as direct properties.
    *   **Deduplication**: Nodes and links are automatically deduplicated.

4.  **Interactive Rendering (`createForceGraph`)**:
    *   **Encoding**: Reads the `color`, `size`, `distance`, etc. from the visual encoding to style SVG elements.
    *   **Rendering**: Creates a force-directed graph with D3.js.
    *   **Interactivity**: Handles hover, drag & drop, and context menu events.

5.  **Enriched Node Details**:
    *   **Automatic Queries**: Right-click → detail retrieval via generic SPARQL queries
    *   **Relation Deduplication**: Identical semantic relations are merged
    *   **Structured Display**: Panel with sections (basic information, graph context, relations, technical properties)

## Data Storage

- **`this.sparqlData`**: Raw SPARQL data preserved by the component
- **`this.nodes` and `this.links`**: Transformed data for D3.js
- **`node.originalData`**: Complete SPARQL binding for each node
- **`SparqlDataFetcher`**: Stateless utility for data retrieval

## Key Points

*   **Flexibility**: Adapts to different SPARQL schemas through intelligent label detection and configurable `field` mapping.
*   **Customization**: Fully customizable appearance via the `encoding` properties of the visual encoding.
*   **Robustness**: Automatic CORS management, proxy, deduplication, and fallback rendering logic.
*   **Performance**: Relation deduplication and optimized data storage.
*   **Extensibility**: Original data preserved for future enhancements.

The component automatically generates relevant visualizations from varied SPARQL results, with informative labels and robust error handling. 