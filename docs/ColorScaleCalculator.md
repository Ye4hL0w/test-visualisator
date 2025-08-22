# ColorScaleCalculator - Color Palette and Scale Manager

## Objective

Provides intelligent color palette management for visual encoding in knowledge graphs. Handles two main input formats with automatic validation and fallback mechanisms:

1. **String format** → `"palette-name"` (pre-existing D3 color schemes)
2. **Array format** → `["#color1", "#color2"]` (explicit color lists)

The calculator automatically detects invalid palettes, validates color formats, and provides smart fallbacks to ensure consistent visual rendering.

## Main API

### `createColorScale({ domain, range, scaleType, fallbackInterpolator, label })`
Central method that creates D3 color scales. Works with pre-calculated domains (from DomainCalculator).

**Parameters:**
- `domain` : Array of domain values to map to colors (pre-calculated)
- `range` : String (palette name) or Array (color list)
- `scaleType` : Scale type ('ordinal', 'quantitative', 'sequential')
- `fallbackInterpolator` : Custom fallback interpolator (optional)
- `label` : Scale label for logging (optional)

**Returns:** D3 scale function (e.g., `d3.scaleOrdinal().domain(...).range(...)`)

### Color Validation Methods

| Method                    | Description                                                          |
|---------------------------|----------------------------------------------------------------------|
| `isValidColor(color)`     | Validates if a color is recognized (hex, CSS names)                 |
| `parseD3ColorScheme(name, type)` | Parses D3 color scheme names with index support                |
| `getBestFallback(type, size)` | Returns optimal fallback palette for given scale type and size |

### Utility Methods

| Method                    | Description                                                          |
|---------------------------|----------------------------------------------------------------------|
| `getColorPalette(name, size, type)` | Simple palette extraction by name                         |
| `rgbToHex(r, g, b)`       | Converts RGB values to hexadecimal                                  |
| `hexToRgb(hex)`           | Converts hexadecimal to RGB format                                  |

## Color Input Formats

### String Format (D3 Palettes)
```javascript
// Direct palette name
"range": "Set1"
"range": "Blues"
"range": "Viridis"

// With specific size
"range": "Blues[5]"
"range": "Set1[8]"
```

### Array Format (Explicit Colors)
```javascript
// Hexadecimal colors
"range": ["#1f77b4", "#ff7f0e", "#2ca02c"]

// CSS color names
"range": ["red", "blue", "green"]

// Mixed formats
"range": ["#ff0000", "blue", "rgb(0,255,0)"]
```

### Invalid Format Warning
```javascript
// Throws explicit error
"range": ["Set1"]  
// → "Unsupported range format: ["Set1"]. To use a pre-existing palette, use the string directly: "Set1". Arrays are reserved for explicit hexadecimal colors like ["#1f77b4", "#ff7f0e"]."
```

## Integration with vis-graph

The ColorScaleCalculator is automatically used by `vis-graph` through the `createD3Scale()` method:

```javascript
// In vis-graph encoding
"nodes": {
  "color": {
    "field": "type",
    "scale": {
      "type": "ordinal",
      "domain": ["uri", "literal"],
      "range": "Blues"  // ← Processed by ColorScaleCalculator
    }
  }
}
```

## Usage Examples

### Basic Palette Usage
```javascript
import { ColorScaleCalculator } from './components/ColorScaleCalculator.js';

const calculator = new ColorScaleCalculator();

// Create scale with D3 palette
const scale = calculator.createColorScale({
  domain: ['A', 'B', 'C'],
  range: 'Set1',
  scaleType: 'ordinal'
});

console.log(scale('A')); // → Color for value 'A'
```

### Custom Color Lists
```javascript
// Explicit colors with validation
const scale = calculator.createColorScale({
  domain: ['Type1', 'Type2', 'Type3'],
  range: ['#e41a1c', '#377eb8', '#4daf4a'],
  scaleType: 'ordinal'
});

// Mixed valid/invalid colors (auto-filtered)
const filtered = calculator.createColorScale({
  domain: ['A', 'B'],
  range: ['#ff0000', 'invalidcolor', 'blue'],  // → keeps ['#ff0000', 'blue']
  scaleType: 'ordinal'
});
```

### Advanced Palette Selection
```javascript
// Quantitative scale with interpolator
const sequential = calculator.createColorScale({
  domain: [0, 50, 100],
  range: 'viridis',
  scaleType: 'quantitative'
});

// Fallback behavior
const withFallback = calculator.createColorScale({
  domain: ['X', 'Y', 'Z'],
  range: 'NonExistentPalette',  // → Uses intelligent fallback
  scaleType: 'ordinal'
});
```

## Smart Fallback System

The calculator provides intelligent fallbacks based on context:

### Ordinal Scales
- **≤ 10 categories:** `d3.schemeCategory10` (optimal distinction)
- **≤ 12 categories:** `d3.schemeSet3` (softer colors for more categories)  
- **> 12 categories:** `d3.quantize(d3.interpolateViridis, n)` (generated from interpolator)

### Quantitative/Sequential Scales
- **Default:** `d3.interpolateViridis` (perceptually uniform)
- **Alternative:** Other D3 interpolators available

## Performance & Caching

- **Automatic caching** in vis-graph prevents redundant scale calculations
- **Smart invalidation** based on encoding and data changes  
- **Optimized color validation** with comprehensive format support
- **Single responsibility:** Focus only on color range calculation

## Error Handling

The calculator gracefully handles:
- Invalid palette names → fallback palettes
- Malformed color values → filtered out automatically
- Empty ranges → smart defaults based on domain size
- Mixed valid/invalid colors → keeps valid ones only

## Compatibility

- **D3.js:** v7+ (uses latest color schemes and interpolators)
- **Browsers:** Modern ES6+ support required
- **Integration:** Works seamlessly with DomainCalculator and vis-graph