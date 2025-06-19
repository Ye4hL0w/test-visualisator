# vis-graph Component

The `vis-graph.js` file defines a web component (`<vis-graph>`) capable of displaying interactive knowledge graphs from data sourced from SPARQL endpoints. It uses D3.js for visualization and the `SparqlDataFetcher` to retrieve data.

## Public API

The component is configured through properties and controlled by methods.

| Type      | Name              | Description                                        |
|-----------|-------------------|----------------------------------------------------|
| Property  | `sparqlEndpoint`  | **(setter)** Sets the URL of the SPARQL endpoint.    |
| Property  | `sparqlQuery`     | **(setter)** Sets the SPARQL query string.           |
| Property  | `sparqlProxy`     | **(setter)** Sets the optional proxy URL for CORS.   |
| Method    | `setSparqlQuery()`| Asynchronously executes the query and loads the data. |
| Method    | `setData()`       | Manually sets graph data (`nodes`, `links`).         |
| Method    | `setSparqlResult()`| Loads data directly from a SPARQL JSON result.      |

## General Operation

1.  **Configuration**: The user configures the component by setting the `sparqlEndpoint`, `sparqlQuery`, and optional `sparqlProxy` properties.

2.  **Data Loading**: The user calls `setSparqlQuery()`. This method internally calls `loadFromSparqlEndpoint(endpoint, query, jsonData, proxyUrl)` which:
    *   Uses the `SparqlDataFetcher` with automatic CORS error and proxy management
    *   Stores raw data in `this.sparqlData` (component property)
    *   Transforms SPARQL results into nodes and links via `transformSparqlResults`
    *   Displays notifications and error panels if necessary

3.  **Data Transformation (`transformSparqlResults`)**:
    *   **SPARQL Variables**: First variable = source, second variable = target
    *   **Smart Labels**: The `_determineNodeLabelFromBinding()` method finds the best label by analyzing:
        1.  Direct literal values
        2.  Conventional label variables (e.g., `geneLabel` for `gene`)
        3.  Other descriptive variables with scoring system
        4.  ID extracted as last resort
    *   **Original Data**: Each node preserves its complete SPARQL `binding` in `originalData`
    *   **Deduplication**: Nodes and links are automatically deduplicated

4.  **Interactive Rendering**: Force-directed graph with D3.js, interactions (hover, drag&drop, context menu)

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

*   **Flexibility**: Adapts to different SPARQL schemas through intelligent label detection
*   **Robustness**: Automatic CORS management, proxy, deduplication, error recovery
*   **Performance**: Relation deduplication and optimized data storage
*   **Extensibility**: Original data preserved for future enhancements

The component automatically generates relevant visualizations from varied SPARQL results, with informative labels and robust error handling. 