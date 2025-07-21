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
    console.warn(`%c[ColorScaleCalculator] WARNING: ${message}`, 'color: #FF9800; font-weight: bold', ...args);
  }

  _logError(message, ...args) {
    console.error(`%c[ColorScaleCalculator] ERROR: ${message}`, 'color: #F44336; font-weight: bold', ...args);
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

    this._logWarn(`D3 schema not found: ${input} for type ${scaleType}`);
    this._logWarn(`Available D3 schemas:`, Object.keys(d3).filter(k => k.startsWith('scheme') || k.startsWith('interpolate')));
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
        // Pour beaucoup de catégories, générer depuis un interpolateur
        return d3.quantize(d3.interpolateSet1, domainSize);
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
      }
    } else if (Array.isArray(range) && range.length === 1 && typeof range[0] === 'string') {
      // Cas spécial : tableau avec un seul élément qui est un nom de schéma D3
      const schemeName = range[0];
      const parsed = this.parseD3ColorScheme(schemeName, scaleType);
      if (parsed?.type === "interpolate") {
        finalRange = d3.quantize(parsed.value, finalDomain.length);
      } else if (parsed?.type === "scheme") {
        finalRange = parsed.value;
      }
      // Si ce n'est pas un schéma D3 reconnu, garder le tableau original
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
          // Fallback vers ordinal si pas d'interpolateur
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
      return d3.quantize(smartFallback, size);
    } else if (Array.isArray(smartFallback)) {
      return smartFallback.slice(0, size);
    }
    
    // Dernier recours
    return d3.quantize(d3.interpolateViridis, size);
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
   * Vide le cache des échelles
   */
  clearCache() {
    this.scaleCache.clear();
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
