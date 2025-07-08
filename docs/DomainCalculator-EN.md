# DomainCalculator - Visual Domain Calculator

## Objective

Automates domain calculation for visual encoding by handling three cases:

1. **No domain** → `getVal(data[field])` (alphanumeric order)
2. **Invalid domain** → `fixDomain(domain)` 
3. **Incomplete domain** → `completeDomain(domain, data[field])` (preserves user order)

## Main API

### `getDomain(data, field, userDomain, scaleType)`
Central method that automatically handles the 3 cases.

**Parameters:**
- `data` : Graph data (nodes or links)
- `field` : Field name to analyze
- `userDomain` : User domain (optional)
- `scaleType` : Scale type ('ordinal', 'linear', 'sqrt', 'log')

### Utility methods

- `getVal(data, field)` : Extracts unique values from a field
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
  { type: 'uri', connections: 5 },
  { type: 'literal', connections: 2 }
];

// Case 1: No domain → auto generation
calculator.getDomain(data, 'type');
// → ['literal', 'uri']

// Case 2: Invalid domain → correction
calculator.getDomain(data, 'type', ['nonexistent']);
// → ['literal', 'uri']

// Case 3: Incomplete domain → completion
calculator.getDomain(data, 'type', ['uri']);
// → ['uri', 'literal']
```

### With vis-graph

```javascript
// Encoding is automatically completed
const encoding = { nodes: { color: { field: 'type', scale: { domain: ['uri'] } } } };
visGraphElement.setEncoding(encoding);

// getEncoding() returns complete domain
visGraphElement.getEncoding().nodes.color.scale.domain;
// → ['uri', 'literal']
```

## Advantages

- 🚀 **Automation** : No need to know values in advance
- 🧠 **Intelligence** : Automatic data type detection and adaptive sorting
- 💾 **Performance** : Intelligent cache and optimized processing
- 🔧 **Flexibility** : Support for all D3 scale types
- 🛡️ **Robustness** : Error handling and rigorous validation

## Use Cases

1. **Data exploration** : Automatically generated domains
2. **Dynamic dashboards** : Adaptation to changing data
3. **Partial configuration** : Intelligent completion of user domains
4. **Data migration** : Automatic adaptation to new formats

## Performance

- **Complexity** : O(n log n) for sorting, O(n) for extraction
- **Cache** : Significant reduction in recalculations
- **Compatibility** : JavaScript ES6+, recent D3.js 