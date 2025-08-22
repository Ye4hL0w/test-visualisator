# DomainCalculator - Visual Domain Calculator

## Objective

Automates domain calculation for visual encoding by handling three cases with **raw SPARQL data**:

1. **No domain** → `getVal(data[field])` (alphanumeric order)
2. **Invalid domain** → `fixDomain(domain)` 
3. **Incomplete domain** → `completeDomain(domain, data[field])` (preserves user order)

## Main API

### `getDomain(data, field, userDomain, scaleType)`
Central method that automatically handles the 3 cases.

**Parameters:**
- `data` : Raw graph data (nodes or links from SPARQL results)
- `field` : Field name to analyze
- `userDomain` : User domain (optional)
- `scaleType` : Scale type ('ordinal', 'linear', 'sqrt', 'log')

### Utility methods

- `getVal(data, field)` : Extracts unique values from a field in raw data
- `fixDomain(invalidDomain, extractedValues, scaleType)` : Fixes invalid domain
- `completeDomain(incompleteDomain, extractedValues, scaleType)` : Completes partial domain
- `analyzeFieldType(data, field)` : Analyzes field type and suggests scale
- `generateNumericDomain(data, field, steps)` : Generates equidistant numeric domain

## Integration with vis-graph

- **Auto-initialization** : Instantiated automatically in constructor
- **createD3Scale()** : Automatically uses calculator for domains
- **getEncoding()** : Returns encoding with real-time calculated domains
- **Cache** : Automatically cleared on data changes

## Examples

```javascript
const data = [
  { goCategory: 'molecular_function', connections: 5 },
  { goCategory: 'biological_process', connections: 2 },
  { goCategory: 'cellular_component', connections: 3 }
];

// Case 1: No domain → auto generation
calculator.getDomain(data, 'goCategory');
// → ['biological_process', 'cellular_component', 'molecular_function']

// Case 2: Invalid domain → correction
calculator.getDomain(data, 'goCategory', ['nonexistent']);
// → ['biological_process', 'cellular_component', 'molecular_function']

// Case 3: Incomplete domain → completion
calculator.getDomain(data, 'goCategory', ['molecular_function']);
// → ['molecular_function', 'biological_process', 'cellular_component']
```

### With vis-graph

```javascript
// Encoding is automatically completed
const encoding = { nodes: { color: { field: 'goCategory', scale: { domain: ['molecular_function'] } } } };
visGraphElement.setEncoding(encoding);

// getEncoding() returns complete domain
visGraphElement.getEncoding().nodes.color.scale.domain;
// → ['molecular_function', 'biological_process', 'cellular_component']
```

## Advantages

- 🚀 **Automation** : No need to know values in advance
- 🧠 **Intelligence** : Automatic field detection, data type analysis and adaptive sorting
- 💾 **Performance** : Intelligent cache and optimized processing
- 🔧 **Flexibility** : Support for all D3 scale types
- 🛡️ **Robustness** : Error handling and rigorous validation
- 🗂️ **Raw data compatible** : Works directly with SPARQL results

## Use Cases

1. **Data exploration** : Automatically generated domains
2. **Dynamic dashboards** : Adaptation to changing data
3. **Partial configuration** : Intelligent completion of user domains
4. **Data migration** : Automatic adaptation to new formats

## Performance

- **Complexity** : O(n log n) for sorting, O(n) for extraction
- **Cache** : Significant reduction in recalculations
- **Compatibility** : JavaScript ES6+, recent D3.js 