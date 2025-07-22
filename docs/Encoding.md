# Visual Encoding System

## Overview

The vis-graph component uses a sophisticated visual encoding system inspired by VEGA to transform SPARQL data into interactive knowledge graphs. This system provides fine-grained control over how data fields are mapped to visual properties like colors, sizes, and relationships.

## Two-Level Mapping Architecture

The encoding system operates in two distinct stages:

### 1. Field Mapping (Data Transformation)
Occurs during `transformSparqlResults()` and defines **which SPARQL variables** to use for graph structure:

- **`nodes.field`**: Array format (required) - SPARQL variables for creating nodes
- **`links.field`**: Object or string format - Defines relationship structure

### 2. Visual Encoding (Rendering)
Occurs during `createForceGraph()` and defines **visual properties** of SVG elements:

- **`color`**: Node/link coloring based on data values or fixed colors
- **`size`**: Node sizing based on data values or fixed dimensions  
- **`width`**: Link width (fixed values only)
- **`distance`**: Force simulation link distance

## Field Mapping Specification

### Node Fields

**Format:** Array with minimum 1 element
```javascript
"nodes": {
  "field": ["gene"]                    // Single variable
  "field": ["gene", "protein"]         // Multiple variables
}
```

### Link Fields

#### Directional Links (Object Format)
Creates directed links with arrows between specific source and target nodes:

```javascript
"links": {
  "field": {
    "source": "gene",      // Source SPARQL variable
    "target": "protein"    // Target SPARQL variable
  }
}
```

#### Semantic Links (String Format)
Creates relationships based on shared semantic properties. Requires ≥2 variables in `nodes.field`:

```javascript
"nodes": { "field": ["gene", "protein"] },
"links": { "field": "goLabel" }         // Semantic relationship variable
```

## Visual Property Encoding

Each visual property follows a consistent priority system:

1. **Dynamic Scale**: `field` + `scale` → Data-driven mapping
2. **Fixed Value**: `value` → Applied to all elements  
3. **Component Default**: Hardcoded fallback

### Color Encoding

#### Scale-Based Colors
```javascript
"color": {
  "field": "geneCategory",
  "scale": {
    "type": "ordinal",
    "domain": ["oncogene", "tumor_suppressor"],     // Auto-calculated from data
    "range": "Set1"                                 // D3 palette or color array
  }
}
```

#### Fixed Colors
```javascript
"color": {
  "value": "#1f77b4"    // All elements use this color
}
```

### Size Encoding

#### Scale-Based Sizing
```javascript
"size": {
  "field": "connections",
  "scale": {
    "type": "linear",
    "domain": [1, 10],      // Auto-calculated from data
    "range": [8, 25]        // Min/max pixel radius
  }
}
```

#### Fixed Sizing
```javascript
"size": {
  "value": 15             // All nodes use 15px radius
}
```

## Scale Types and Ranges

### Ordinal Scales
For categorical data (types, classifications):

```javascript
"scale": {
  "type": "ordinal",
  "domain": ["type1", "type2", "type3"],
  "range": "Set1"                          // D3 palette
  // OR
  "range": ["#e41a1c", "#377eb8", "#4daf4a"]  // Custom colors
}
```

### Linear Scales  
For continuous numerical data:

```javascript
"scale": {
  "type": "linear", 
  "domain": [0, 100],
  "range": [5, 30]                         // For size: min/max radius
}
```

### Color Range Formats

Managed by [ColorScaleCalculator](./ColorScaleCalculator.md):

#### ✅ Supported Formats
- **Palette names**: `"Set1"`, `"spectral"`, `"Blues"`
- **Color arrays**: `["#1f77b4", "#ff7f0e", "#2ca02c"]`
- **CSS colors**: `["red", "green", "blue"]`

#### ❌ Unsupported Formats  
- **Array with palette**: `["Set1"]` → Error: Use `"Set1"` directly

## Complete Encoding Schema

### Default Encoding Structure
```javascript
{
  "description": "Default visual encoding configuration",
  "width": 800,
  "height": 600,
  "autosize": "none",
  
  "nodes": {
    "field": ["source"],                    // Required: Array format
    
    "color": {
      "field": "type",                      // Data field for coloring
      "scale": {
        "type": "ordinal",
        "domain": ["uri", "literal"],       // Auto-calculated
        "range": "Set1"                     // D3 palette
      }
    },
    
    "size": {
      "field": "connections",               // Data field for sizing
      "scale": {
        "type": "linear", 
        "domain": [0, 10],                  // Auto-calculated
        "range": [8, 25]                    // Min/max radius
      }
    }
  },
  
  "links": {
    "field": {
      "source": "source",                   // Directional links
      "target": "target"
    },
    
    "distance": 100,                        // Force simulation distance
    
    "width": {
      "value": 1.5                          // Fixed width (px)
    },
    
    "color": {
      "value": "#999"                       // Fixed color
    }
  }
}
```

## Validation Rules

### Strict Field Validation
The system enforces strict validation - invalid configurations prevent rendering:

| Rule | Valid | Invalid |
|------|-------|---------|
| **Nodes field** | `["gene"]` | `"gene"` (not array) |
| **Semantic links** | `nodes: ["a","b"], links: "rel"` | `nodes: ["a"], links: "rel"` |
| **Directional links** | `{source:"a", target:"b"}` | `{source:"a"}` (missing target) |
| **Variable existence** | Uses actual SPARQL variables | References non-existent variables |

### Error Handling
Invalid configurations result in:
- Detailed console error messages
- UI error notifications  
- **Complete rendering prevention** (no fallback graph)

## Usage Examples

### Example 1: Gene-Protein Network (Directional)
```javascript
const encoding = {
  nodes: {
    field: ["gene", "protein"],
    color: {
      field: "moleculeType",
      scale: {
        type: "ordinal",
        domain: ["gene", "protein", "complex"],
        range: "Category10"
      }
    },
    size: {
      field: "interactions",
      scale: {
        type: "linear",
        domain: [1, 50],
        range: [10, 30]
      }
    }
  },
  links: {
    field: {source: "gene", target: "protein"},
    distance: 150,
    color: {value: "#666"},
    width: {value: 2}
  }
};
```

### Example 2: Ontology Browser (Semantic)
```javascript
const encoding = {
  nodes: {
    field: ["anatomicalEntity", "goClass"],
    color: {
      field: "namespace",
      scale: {
        type: "ordinal", 
        range: "Set2"                    // Auto-domain calculation
      }
    },
    size: {value: 12}                    // Fixed size
  },
  links: {
    field: "relationshipType",           // Semantic links
    distance: 120,
    color: {
      field: "relationshipType",
      scale: {
        type: "ordinal",
        range: ["#1f77b4", "#ff7f0e", "#2ca02c"]
      }
    }
  }
};
```

### Example 3: Simple Publication Network
```javascript
const encoding = {
  nodes: {
    field: ["author", "paper"],
    color: {
      field: "nodeType", 
      scale: {
        type: "ordinal",
        domain: ["author", "paper"],
        range: ["#e41a1c", "#377eb8"]
      }
    }
  },
  links: {
    field: {source: "author", target: "paper"},
    distance: 100
  }
};
```

## Domain Auto-Calculation

The system automatically calculates domains from your data using [DomainCalculator](./DomainCalculator.md):

### Ordinal Domains
Extracted unique values, sorted alphanumerically:
```javascript
// Data: [{type: "gene"}, {type: "protein"}, {type: "gene"}]
// Auto-domain: ["gene", "protein"]
```

### Linear Domains  
Calculated min/max from numerical data:
```javascript
// Data: [{score: 15}, {score: 3}, {score: 42}]
// Auto-domain: [3, 42]
```

### User Domain Override
Provide explicit domains to override auto-calculation:
```javascript
"scale": {
  "type": "ordinal",
  "domain": ["type1", "type2", "type3"],    // User-specified
  "range": "Set1"
}
```

## Integration Points

### with vis-graph Component
```javascript
// Set encoding before launch
graph.encoding = myEncodingConfig;
graph.launch();

// Or get current encoding
const currentEncoding = graph.getEncoding();
```

### with ColorScaleCalculator
Color ranges are automatically processed through ColorScaleCalculator for:
- D3 palette resolution (`"Set1"` → actual colors)
- Color validation (hex, CSS names)
- Smart fallbacks for invalid palettes
- Error handling for unsupported formats

### with DomainCalculator
Domains are automatically calculated through DomainCalculator for:
- Field value extraction from data
- Ordinal vs. numerical domain detection
- User domain validation and completion
- Scale type recommendations

## Best Practices

### Field Selection
- **Use meaningful variable names** from your SPARQL queries
- **Prefer semantic links** for ontological relationships
- **Use directional links** for clear source→target flows

### Color Encoding
- **Limit ordinal categories** to ≤12 for visual clarity
- **Use perceptually uniform palettes** (`"viridis"`, `"plasma"`) for quantitative data
- **Test color accessibility** for your target audience

### Performance Optimization
- **Cache encoding objects** for repeated use
- **Prefer fixed values** over scales when appropriate
- **Limit domain sizes** for large datasets

### Error Prevention
- **Always use array format** for `nodes.field`
- **Validate SPARQL variable names** against your queries
- **Test with sample data** before production deployment 