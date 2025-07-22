# ColorScaleCalculator - Color Palette and Scale Manager

## Objective

Provides intelligent color palette management for visual encoding in knowledge graphs. Handles two main input formats with automatic validation and fallback mechanisms:

1. **String format** → `"palette-name"` (pre-existing D3 color schemes)
2. **Array format** → `["#color1", "#color2"]` (explicit color lists)

The calculator automatically detects invalid palettes, validates color formats, and provides smart fallbacks to ensure consistent visual rendering.

## Main API

### `createColorScale({ domain, range, dataKeys, scaleType, fallbackInterpolator, label })`
Central method that creates D3 color scales with automatic validation and domain calculation.

**Parameters:**
- `domain` : Array of domain values to map to colors
- `range` : String (palette name) or Array (color list)
- `dataKeys` : Available data values for domain validation (optional)
- `scaleType` : Scale type ('ordinal', 'quantitative', 'sequential')
- `fallbackInterpolator` : Custom fallback interpolator (optional)
- `label` : Scale label for logging (optional)

**Returns:** `{ scale, domain, range }` object with D3 scale and final values

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
| `clearCache()`            | Clears internal scale cache                                          |

## Range Format Rules

### ✅ Supported Formats

**Pre-existing Palettes (String):**
```javascript
// D3 color schemes
"range": "Set1"           // → D3 categorical palette
"range": "spectral"       // → D3 spectral interpolator  
"range": "Blues"          // → D3 sequential blues
"range": "Category10"     // → D3 10-color category palette
```

**Explicit Colors (Array):**
```javascript
// Hexadecimal colors
"range": ["#1f77b4", "#ff7f0e", "#2ca02c"]

// CSS named colors
"range": ["red", "green", "blue", "orange"]

// Mixed valid formats
"range": ["#ff0000", "green", "#0000ff"]
```

### ❌ Unsupported Formats

**Array with Palette Names:**
```javascript
"range": ["Set1"]         // ❌ ERROR: Use "Set1" directly
"range": ["spectral"]     // ❌ ERROR: Use "spectral" directly
```

## Validation and Error Handling

### Palette Validation
When using string format, the calculator:
1. **Validates palette existence** in D3 color schemes
2. **Shows warning** if palette not found: `"Palette 'UnknownPalette' not found. Using default palette instead."`
3. **Uses smart fallback** based on scale type and domain size

### Color Validation  
When using array format, the calculator:
1. **Validates each color** (hex patterns, CSS named colors)
2. **Filters invalid colors** with warning: `"Invalid colors detected and removed: [badcolor]. Valid colors kept: [#ff0000, green]"`
3. **Uses fallback palette** if no valid colors remain

### Error Cases
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
const result = calculator.createColorScale({
  domain: ['A', 'B', 'C'],
  range: 'Set1',
  scaleType: 'ordinal'
});

console.log(result.range); // → D3 Set1 colors
```

### Custom Color Lists
```javascript
// Explicit colors with validation
const result = calculator.createColorScale({
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
- **≤ 12 categories:** `d3.schemeSet3` (lighter palette)  
- **> 12 categories:** Generated from `d3.interpolateSet1`

### Quantitative Scales
- **Default:** `d3.interpolateViridis` (perceptually uniform)
- **Alternative:** `d3.interpolateTurbo` for high-contrast needs

## Performance Features

- **Caching:** Scales are cached to avoid regeneration
- **Validation:** Color validation prevents runtime errors
- **Fallbacks:** Always provides working color schemes
- **Logging:** Comprehensive debug and warning system

## Logging Configuration

```javascript
const calculator = new ColorScaleCalculator();

// Enable detailed debug logs
calculator.enableDebugLogs = true;

// Log levels:
// - Debug: Palette parsing, fallback selection
// - Warning: Invalid palettes, filtered colors
// - Error: Format violations, critical issues
``` 