// Import de D3 depuis CDN
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/**
 * Calculateur de palettes de couleurs pour l'encoding visuel des graphes de connaissances.
 * Parse les ranges de type string (ex: "Blues", "Blues[5]") vers les schémas D3 appropriés.
 * Compatible avec les types ordinal et quantitative.
 */
export class ColorScaleCalculator {
  constructor() {
    // Cache pour les échelles générées
    this.scaleCache = new Map();
    
    // Cache pour éviter les warnings répétés
    this.warningCache = new Set();
    
    // Logging configuration - set to false to show only warnings and errors
    this.enableDebugLogs = false;
  }

  /**
   * Centralized logging methods for consistent output
   */
  _logDebug(message, ...args) {
    if (this.enableDebugLogs) {
      console.log(`%c[ColorScaleCalculator] ${message}`, 'color: #9C27B0', ...args);
    }
  }

  _logInfo(message, ...args) {
    if (this.enableDebugLogs) {
      console.info(`%c[ColorScaleCalculator] ${message}`, 'color: #2196F3', ...args);
    }
  }

  _logWarn(message, ...args) {
    // Éviter les warnings répétés
    const warningKey = message + JSON.stringify(args);
    if (!this.warningCache.has(warningKey)) {
      console.warn(`%c[ColorScaleCalculator] WARNING: ${message}`, 'color: #FF9800; font-weight: bold', ...args);
      this.warningCache.add(warningKey);
    }
  }

  _logError(message, ...args) {
    console.error(`%c[ColorScaleCalculator] ERROR: ${message}`, 'color: #F44336; font-weight: bold', ...args);
  }

  /**
   * Valide si une couleur est reconnue (hex, rgb, rgba, hsl, hsla, noms CSS standard)
   * @param {string} color - Couleur à valider
   * @returns {boolean} True si la couleur est valide
   */
  isValidColor(color) {
    if (typeof color !== 'string') return false;
    
    // Nettoyer la couleur (supprimer espaces)
    color = color.trim();
    
    // Valider couleurs hex (#rgb, #rrggbb)
    const hexPattern = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/;
    if (hexPattern.test(color)) return true;
    
    // Valider couleurs RGB/RGBA
    const rgbPattern = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([01]|0?\.\d+))?\s*\)$/;
    const rgbMatch = color.match(rgbPattern);
    if (rgbMatch) {
      const [, r, g, b, a] = rgbMatch;
      // Vérifier que les valeurs RGB sont dans la plage 0-255
      if (parseInt(r) <= 255 && parseInt(g) <= 255 && parseInt(b) <= 255) {
        // Si alpha est présent, vérifier qu'il est entre 0 et 1
        if (a === undefined || (parseFloat(a) >= 0 && parseFloat(a) <= 1)) {
          return true;
        }
      }
    }
    
    // Valider couleurs HSL/HSLA
    const hslPattern = /^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*(?:,\s*([01]|0?\.\d+))?\s*\)$/;
    const hslMatch = color.match(hslPattern);
    if (hslMatch) {
      const [, h, s, l, a] = hslMatch;
      // Vérifier les plages HSL
      if (parseInt(h) <= 360 && parseInt(s) <= 100 && parseInt(l) <= 100) {
        // Si alpha est présent, vérifier qu'il est entre 0 et 1
        if (a === undefined || (parseFloat(a) >= 0 && parseFloat(a) <= 1)) {
          return true;
        }
      }
    }
    
    // Valider couleurs CSS nommées courantes
    const cssColors = [
      'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown',
      'black', 'white', 'gray', 'grey', 'cyan', 'magenta', 'lime', 'navy',
      'maroon', 'olive', 'teal', 'silver', 'aqua', 'fuchsia', 'indigo',
      'violet', 'gold', 'coral', 'salmon', 'khaki', 'crimson', 'chocolate',
      'darkred', 'darkgreen', 'darkblue', 'darkorange', 'darkgray', 'darkgrey',
      'lightred', 'lightgreen', 'lightblue', 'lightyellow', 'lightgray', 'lightgrey',
      'steelblue', 'royalblue', 'forestgreen', 'orangered', 'tomato', 'dodgerblue'
    ];
    
    return cssColors.includes(color.toLowerCase());
  }

  /**
   * Convertit un composant RGB en hexadécimal
   * @param {number} c - Composant RGB (0-255)
   * @returns {string} Hexadécimal à 2 caractères
   */
  componentToHex(c) {
    const hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }

  /**
   * Convertit RGB en couleur hexadécimale
   * @param {number} r - Rouge (0-255)
   * @param {number} g - Vert (0-255)
   * @param {number} b - Bleu (0-255)
   * @returns {string} Couleur hexadécimale
   */
  rgbToHex(r, g, b) {
    return "#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
  }

  /**
   * Convertit une couleur hexadécimale en RGB
   * @param {string} hex - Couleur hexadécimale
   * @returns {string} Format rgb(r, g, b)
   */
  hexToRgb(hex) {
    // Supprimer le "#" si présent
    hex = hex.replace(/^#/, '');

    // Convertir de la forme courte (3 caractères) à la forme complète (6 caractères)
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }

    // Convertir en valeurs RGB
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Parse un nom de schéma D3 avec support des indices (ex: "Blues[5]")
   * @param {string} input - Nom du schéma (ex: "Blues", "Blues[5]", "Category10")
   * @param {string} scaleType - Type d'échelle ('ordinal' ou 'quantitative')
   * @returns {object|null} {type: "interpolate"|"scheme", value: function|array, raw: string}
   */
  parseD3ColorScheme(input, scaleType = 'ordinal') {
    const regex = /^([a-zA-Z0-9]+)(?:\[(\d+)\])?$/;
    const match = input.match(regex);

    if (!match) return null;

    const rawName = match[1];
    const index = match[2] ? parseInt(match[2], 10) : null;

    // Essayer plusieurs variations de normalisation
    const variations = [
      // Première lettre majuscule + reste minuscule (ex: viridis → Viridis)
      rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase(),
      // Tout en majuscule (ex: viridis → VIRIDIS)  
      rawName.toUpperCase(),
      // Exactement comme fourni (ex: Viridis → Viridis)
      rawName,
      // Tout en minuscule (ex: VIRIDIS → viridis)
      rawName.toLowerCase()
    ];

    this._logDebug(`Attempting to parse: "${input}" (type: ${scaleType})`);
    this._logDebug(`Tested variations: ${variations.join(', ')}`);

    for (const normalizedName of variations) {
      if (scaleType === 'quantitative' || scaleType === 'sequential') {
        // Pour quantitative : utiliser interpolate
        const fullInterpolate = `interpolate${normalizedName}`;
        this._logDebug(`Testing interpolate: ${fullInterpolate}`);
        
        if (fullInterpolate in d3 && typeof d3[fullInterpolate] === "function") {
          this._logDebug(`Found: ${fullInterpolate}`);
          return {
            type: "interpolate",
            value: d3[fullInterpolate],
            raw: rawName,
          };
        }
      } else {
        // Pour ordinal : utiliser scheme
        const fullScheme = `scheme${normalizedName}`;
        this._logDebug(`Testing scheme: ${fullScheme}`);
        
        if (fullScheme in d3) {
          const scheme = d3[fullScheme];
          this._logDebug(`Found: ${fullScheme}`);
          
          // Si un index est spécifié (ex: Blues[5])
          if (index !== null && Array.isArray(scheme) && scheme[index]) {
            return {
              type: "scheme",
              value: scheme[index],
              raw: rawName,
            };
          }
          
          // Sinon, utiliser le schéma par défaut
          if (Array.isArray(scheme)) {
            // Prendre le plus grand tableau disponible
            const maxIndex = scheme.length - 1;
            return {
              type: "scheme",
              value: scheme[maxIndex],
              raw: rawName,
            };
          }
        }
      }
    }

    this._logWarn(`D3 color scheme "${input}" not found for type "${scaleType}". See available schemes at: https://d3js.org/d3-scale-chromatic`);
    return null;
  }

  /**
   * Obtient le meilleur fallback selon le type d'échelle et la taille du domaine
   * @param {string} scaleType - Type d'échelle ('ordinal' ou 'quantitative')
   * @param {number} domainSize - Taille du domaine
   * @returns {*} Meilleur fallback (scheme array ou interpolator function)
   */
  getBestFallback(scaleType, domainSize) {
    if (scaleType === 'quantitative' || scaleType === 'sequential') {
      // Pour quantitative : utiliser des interpolateurs perceptuels
      return d3.interpolateViridis; // Meilleur que Turbo pour la perception
    } else {
      // Pour ordinal : utiliser des palettes catégorielles optimisées
      if (domainSize <= 10) {
        return d3.schemeCategory10; // Palette optimale jusqu'à 10 catégories
      } else if (domainSize <= 12) {
        return d3.schemeSet3; // Palette plus claire pour plus de catégories
      } else {
        // Pour beaucoup de catégories, générer depuis un interpolateur valide
        return d3.quantize(d3.interpolateViridis, domainSize);
      }
    }
  }

  /**
   * Méthode principale pour créer une échelle de couleurs
   * @param {object} config - Configuration {domain, range, dataKeys, scaleType, fallbackInterpolator, label}
   * @returns {object} {scale, domain, range}
   */
  createColorScale({ 
    domain, 
    range, 
    dataKeys = [], 
    scaleType = 'ordinal',
    fallbackInterpolator = null, // Sera calculé automatiquement si null
    label = "Color" 
  }) {
    const isDomainArray = Array.isArray(domain) && domain.length > 0;

    // Validation du domaine
    if (isDomainArray) {
      const duplicates = domain.filter((item, index) => domain.indexOf(item) !== index);
      if (duplicates.length > 0) {
        this._logWarn(`Duplicate domain values (${label}): ${[...new Set(duplicates)].join(', ')}`);
      }
    }

    // Finalisation du domaine
    let finalDomain;
    if (isDomainArray) {
      const validDomain = domain.filter(d => dataKeys.includes(d));
      const extraDomain = domain.filter(d => !dataKeys.includes(d));
      const missingDomain = dataKeys.filter(d => !validDomain.includes(d));
      
      if (extraDomain.length > 0) {
        this._logWarn(`Extra domain values not in data (${label}): ${extraDomain.join(', ')}`);
      }
      if (missingDomain.length > 0) {
        this._logWarn(`Missing domain values from data (${label}): ${missingDomain.join(', ')}`);
      }
      
      missingDomain.sort((a, b) => a.localeCompare(b));
      finalDomain = [...validDomain, ...missingDomain];
    } else {
      this._logWarn(`Invalid or empty domain (${label}). Using dataset values.`);
      finalDomain = [...dataKeys].sort((a, b) => a.localeCompare(b));
    }

    // Obtenir le meilleur fallback si pas spécifié
    const smartFallback = fallbackInterpolator || this.getBestFallback(scaleType, finalDomain.length);
    this._logDebug(`Smart fallback chosen (${label}):`, typeof smartFallback === 'function' ? smartFallback.name : smartFallback);
    
    // Validation de sécurité pour les interpolateurs
    if (typeof smartFallback === 'function') {
      try {
        // Test rapide pour vérifier que l'interpolateur fonctionne
        smartFallback(0.5);
      } catch (error) {
        this._logWarn(`Invalid interpolator detected, using Category10 instead: ${error.message}`);
        const safeFallback = d3.schemeCategory10;
        return this.createColorScale({
          domain: finalDomain,
          range: safeFallback,
          dataKeys,
          scaleType,
          fallbackInterpolator: safeFallback,
          label
        });
      }
    }

    // Traitement du range avec la nouvelle logique de parsing
    let finalRange = range;
    if (range === null || range === undefined) {
      // Pas de range spécifié → utiliser le fallback intelligent
      if (typeof smartFallback === 'function') {
        finalRange = d3.quantize(smartFallback, finalDomain.length);
      } else if (Array.isArray(smartFallback)) {
        finalRange = smartFallback;
      }
      this._logDebug(`Auto-generated range (${label} - smart fallback):`, finalRange);
    } else if (typeof range === 'string') {
      const parsed = this.parseD3ColorScheme(range, scaleType);
      if (parsed?.type === "interpolate") {
        finalRange = d3.quantize(parsed.value, finalDomain.length);
      } else if (parsed?.type === "scheme") {
        finalRange = parsed.value;
      } else {
        // Palette non trouvée - utiliser fallback (warning déjà affiché par parseD3ColorScheme)
        if (typeof smartFallback === 'function') {
          finalRange = d3.quantize(smartFallback, finalDomain.length);
        } else if (Array.isArray(smartFallback)) {
          finalRange = smartFallback;
        }
      }
    } else if (Array.isArray(range) && range.length === 1 && typeof range[0] === 'string') {
      // Vérifier si c'est un nom de palette D3 dans un array (erreur)
      const potentialSchemeName = range[0];
      const parsed = this.parseD3ColorScheme(potentialSchemeName, scaleType);
      
      if (parsed !== null) {
        // C'est un nom de palette valide dans un array - lever une erreur explicite
        const errorMessage = `Unsupported range format: ["${potentialSchemeName}"]. ` +
          `To use a pre-existing palette, use the string directly: "${potentialSchemeName}". ` +
          `Arrays are reserved for explicit hexadecimal colors like ["#1f77b4", "#ff7f0e"].`;
        this._logWarn(errorMessage);
        
        // Utiliser automatiquement la version string correcte au lieu de throw
        if (parsed?.type === "interpolate") {
          finalRange = d3.quantize(parsed.value, finalDomain.length);
        } else if (parsed?.type === "scheme") {
          finalRange = parsed.value;
        } else {
          // Si même la version string ne fonctionne pas, utiliser le fallback
          if (typeof smartFallback === 'function') {
            finalRange = d3.quantize(smartFallback, finalDomain.length);
          } else if (Array.isArray(smartFallback)) {
            finalRange = smartFallback;
          }
        }
      }
      // Si ce n'est pas un nom de palette reconnu, continuer le traitement normal
    }

    // Validation des couleurs dans les arrays
    if (Array.isArray(finalRange) && finalRange.length > 0) {
      const validColors = [];
      const invalidColors = [];
      
      finalRange.forEach(color => {
        if (this.isValidColor(color)) {
          validColors.push(color);
        } else {
          invalidColors.push(color);
        }
      });
      
      if (invalidColors.length > 0) {
        this._logWarn(`Invalid colors detected and removed: [${invalidColors.join(', ')}]. Valid colors kept: [${validColors.join(', ')}]`);
        if (validColors.length > 0) {
          finalRange = validColors;
        } else {
          this._logWarn(`No valid colors found in range. Using default palette.`);
          finalRange = null; // Sera traité par la validation finale
        }
      }
    }

    // Validation du range final
    if (!Array.isArray(finalRange) || finalRange.length === 0) {
      this._logWarn(`Invalid color range (${label}). Using smart fallback.`);
      if (typeof smartFallback === 'function') {
        // Si c'est un interpolateur, quantize
        finalRange = d3.quantize(smartFallback, finalDomain.length);
      } else if (Array.isArray(smartFallback)) {
        // Si c'est déjà un scheme array, utiliser directement
        finalRange = smartFallback;
      } else {
        // Fallback de dernier recours
        finalRange = d3.quantize(d3.interpolateViridis, finalDomain.length);
      }
    }

    if (finalRange.length < finalDomain.length) {
      this._logWarn(`Color range shorter than domain (${label}): ${finalRange.length} < ${finalDomain.length}. Colors will repeat.`);
    } else if (finalRange.length > finalDomain.length) {
      this._logWarn(`Color range longer than domain (${label}): ${finalRange.length} > ${finalDomain.length}. Extra colors ignored.`);
    }

    // Mapping final des couleurs
    const finalColors = finalDomain.map((_, i) => finalRange[i % finalRange.length]);

    // Création de l'échelle selon le type
    let scale;
    if (scaleType === 'quantitative' || scaleType === 'sequential') {
      // Pour quantitative, préférer scaleSequential si on a un interpolateur
      if (typeof range === 'string') {
        const parsed = this.parseD3ColorScheme(range, scaleType);
        if (parsed?.type === "interpolate") {
          // Créer un domaine numérique pour scaleSequential
          const numericDomain = finalDomain.map((_, i) => i);
          scale = d3.scaleSequential(parsed.value)
            .domain([0, finalDomain.length - 1]);
          
          // Wrapper pour retourner la couleur par index du domaine
          const originalScale = scale;
          scale = (value) => {
            const index = finalDomain.indexOf(value);
            return index !== -1 ? originalScale(index) : originalScale(0);
          };
          scale.domain = () => finalDomain;
          scale.range = () => finalColors;
        } else {
          // Fallback vers ordinal si pas d'interpolateur (warning déjà affiché)
          scale = d3.scaleOrdinal().domain(finalDomain).range(finalColors);
        }
      } else {
        scale = d3.scaleOrdinal().domain(finalDomain).range(finalColors);
      }
    } else {
      // Pour ordinal (défaut)
      scale = d3.scaleOrdinal().domain(finalDomain).range(finalColors);
    }

    return {
      scale: scale,
      domain: finalDomain,
      range: finalRange
    };
  }

  /**
   * Obtient la méthode D3 appropriée selon le type d'échelle
   * @param {string} type - Type d'échelle ('ordinal', 'quantitative', 'sequential')
   * @returns {function} Constructeur d'échelle D3
   */
  getD3Method(type) {
    switch (type) {
      case 'quantitative':
      case 'sequential':
        return d3.scaleSequential;
      case 'ordinal':
      default:
        return d3.scaleOrdinal;
    }
  }

  /**
   * Obtient une palette de couleurs simple par nom
   * @param {string} name - Nom du schéma (ex: "Blues", "Blues[5]", "Category10")
   * @param {number} size - Taille souhaitée de la palette
   * @param {string} scaleType - Type d'échelle ('ordinal' ou 'quantitative')
   * @returns {Array} Palette de couleurs
   */
  getColorPalette(name, size = 8, scaleType = 'ordinal') {
    const parsed = this.parseD3ColorScheme(name, scaleType);
    
    if (parsed?.type === "interpolate") {
      return d3.quantize(parsed.value, size);
    } else if (parsed?.type === "scheme") {
      const scheme = parsed.value;
      if (Array.isArray(scheme)) {
        return scheme.slice(0, size);
      }
    }
    
    // Fallback intelligent basé sur le type et la taille
    const smartFallback = this.getBestFallback(scaleType, size);
    if (typeof smartFallback === 'function') {
      try {
        return d3.quantize(smartFallback, size);
      } catch (error) {
        this._logWarn(`Error with interpolator in getColorPalette: ${error.message}. Using Category10.`);
        return d3.schemeCategory10.slice(0, Math.min(size, 10));
      }
    } else if (Array.isArray(smartFallback)) {
      return smartFallback.slice(0, size);
    }
    
    // Dernier recours
    try {
      return d3.quantize(d3.interpolateViridis, size);
    } catch (error) {
      this._logWarn(`Error with Viridis interpolator: ${error.message}. Using Category10.`);
      return d3.schemeCategory10.slice(0, Math.min(size, 10));
    }
  }

  /**
   * Trouve tous les indices d'une valeur dans un array
   * @param {Array} array - Array à chercher
   * @param {*} value - Valeur à trouver
   * @returns {Array} Indices trouvés
   */
  getAllIndexes(array, value) {
    const indexes = [];
    let i = -1;
    while ((i = array.indexOf(value, i + 1)) !== -1) {
      indexes.push(i);
    }
    return indexes;
  }

  /**
   * Vide le cache des échelles et des warnings
   */
  clearCache() {
    this.scaleCache.clear();
    this.warningCache.clear();
    this._logDebug('Cache cleared');
  }
}

// Fonction utilitaire pour parser les schémas D3 (compatible avec le code existant)
export function parseD3ColorScheme(schemeName, scaleType = 'ordinal') {
  const calculator = new ColorScaleCalculator();
  return calculator.parseD3ColorScheme(schemeName, scaleType);
}

// Fonction utilitaire pour créer une échelle de couleurs (compatible avec le code existant)
export function createColorScale({ domain, range, dataKeys, fallbackInterpolator = null, label = "Color" }) {
  const calculator = new ColorScaleCalculator();
  return calculator.createColorScale({ domain, range, dataKeys, scaleType: 'ordinal', fallbackInterpolator, label });
}
