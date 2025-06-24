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

## 🎨 Visual Mapping System

The component's appearance is controlled by a JSON configuration object, inspired by VEGA. This system allows you to define how data is transformed and how it is rendered.

### How it Works (Two-Level Mapping)

The mapping works in two main stages:

1.  **Field Mapping (`field`)**: This happens during data transformation (`transformSparqlResults`). It tells the component **which variables** from the SPARQL results to use for creating the graph structure.
    *   `links.field`: Defines the source and target variables for links, formatted as `"sourceVar-targetVar"`. For example, `"gene-protein"`.

2.  **Encoding (`color`, `size`, `width`, `distance`)**: This happens during D3 rendering (`createForceGraph`). It defines the **visual properties** of the SVG elements. For each property, the system follows a priority order:
    1.  **Dynamic Scale**: If a `field` and a `scale` are provided, the component uses a D3 scale to map data values (e.g., node type) to visual values (e.g., color). If a value is not in the scale's domain, the fallback is used.
    2.  **Fixed Value**: If a `value` is provided, it's applied to all elements.
    3.  **Component Default**: If no configuration is provided, a hardcoded fallback value is used to ensure the graph renders.

### Default Mapping Structure

Here is the default configuration, which you can retrieve via `getDefaultEncoding()`. Use this as a template for your own encodings.

```json
{
  "description": "Default visual mapping configuration",
  "width": 800,
  "height": 600,
  "autosize": "none",
  "nodes": {
    "field": "source",
    "color": {
      "field": "type",
      "scale": {
        "type": "ordinal",
        "domain": ["uri", "literal"],
        "range": ["#69b3a2", "#ff7f0e"]
      }
    },
    "size": {
      "field": "connections",
      "scale": {
        "type": "linear",
        "domain": [0, 10],
        "range": [8, 25]
      }
    }
  },
  "links": {
    "field": "source-target",
    "distance": 100,
    "width": {
      "value": 1.5
    },
    "color": {
      "value": "#999"
    }
  }
}
```

### Applying a Custom Mapping

To apply your custom configuration, set the `encoding` property before calling `launch()`.

```javascript
const graph = document.getElementById('myGraph');

// Configure the visual encoding
graph.encoding = {
  nodes: {
    color: {
      field: "type",
      scale: {
        type: "ordinal",
        domain: ["uri", "literal"],
        range: ["#d62728", "#2ca02c"] // Use red and green instead
      }
    },
    size: {
      value: 15 // Set a fixed size for all nodes
    }
  },
  links: {
    distance: 200, // Increase distance between nodes
    color: {
      value: "black"
    }
  }
};

// Configure your data source
graph.sparqlEndpoint = 'https://example.com/sparql';
graph.sparqlQuery = 'SELECT ?item ?type WHERE { ... }';

// Launch with custom encoding applied
graph.launch();
```

### Complete Configuration Example

```javascript
const graph = document.getElementById('myGraph');

// Configure all properties at once
graph.sparqlEndpoint = 'https://query.wikidata.org/sparql';
graph.sparqlQuery = 'SELECT ?person ?personLabel ?birthPlace WHERE { ... }';
graph.proxy = 'http://localhost:3001/sparql-proxy';
graph.encoding = {
  nodes: {
    color: { field: "type", scale: { type: "ordinal", domain: ["person", "place"], range: ["blue", "green"] }},
    size: { field: "connections", scale: { type: "linear", domain: [1, 10], range: [10, 30] }}
  },
  links: {
    distance: 150,
    color: { value: "#333" }
  }
};

// Launch everything at once
graph.launch().then(result => {
  console.log('Visualization ready:', result.status);
});
```

## General Operation

1.  **Configuration**: The user configures the component by setting the `sparqlEndpoint`, `sparqlQuery`, and optional `sparqlProxy` properties.

2.  **Data Loading**: The user calls `executeSparqlQuery()`. This method internally calls `loadFromSparqlEndpoint(endpoint, query, jsonData, proxyUrl)` which:
    *   Uses the `SparqlDataFetcher` with automatic CORS error and proxy management
    *   Stores raw data in `this.sparqlData` (component property)
    *   Transforms SPARQL results into nodes and links via `transformSparqlResults`
    *   Displays notifications and error panels if necessary

3.  **Data Transformation (`transformSparqlResults`)**:
    *   **Field Mapping**: Uses the `links.field` from the visual encoding to determine the source and target variables. Defaults to the first and second variables if not specified.
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