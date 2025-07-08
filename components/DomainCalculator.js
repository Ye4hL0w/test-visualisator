/**
 * Calculateur de domaines pour l'encoding visuel des graphes de connaissances.
 * Cette classe analyse les données pour générer automatiquement les domaines
 * appropriés selon les besoins de l'utilisateur et la nature des données.
 */
export class DomainCalculator {
  constructor() {
    // Cache pour les domaines calculés par champ
    this.domainCache = new Map();
    // Cache pour les statistiques des champs
    this.fieldStatsCache = new Map();
  }

  /**
   * Méthode principale pour obtenir le domaine d'un champ.
   * Gère automatiquement les 3 cas : aucune donnée, données erronées, données incomplètes.
   * 
   * @param {Array} data - Les données du graphe (nodes ou links)
   * @param {string} field - Le nom du champ à analyser
   * @param {Array|null} userDomain - Le domaine fourni par l'utilisateur (peut être null/undefined)
   * @param {string} scaleType - Le type d'échelle ('ordinal', 'linear', 'sqrt', 'log')
   * @returns {Array} Le domaine calculé pour ce champ
   */
  getDomain(data, field, userDomain = null, scaleType = 'ordinal') {
    if (!data || data.length === 0) {
      return [];
    }

    // Extraire les valeurs existantes du champ dans les données
    const extractedValues = this.getVal(data, field);
    
    if (extractedValues.length === 0) {
      return [];
    }

    // Cas 1: Pas de domaine utilisateur -> utiliser les valeurs extraites
    if (!userDomain || userDomain.length === 0) {
      console.log(`[DomainCalculator] 📊 Cas 1: Génération automatique du domaine`);
      return this.sortDomainValues(extractedValues, scaleType);
    }

    // Cas 2: Domaine utilisateur erroné -> le corriger
    if (this.isDomainInvalid(userDomain, extractedValues)) {
      console.log(`[DomainCalculator] 🔧 Cas 2: Correction du domaine erroné`);
      return this.fixDomain(userDomain, extractedValues, scaleType);
    }

    // Cas 3: Domaine utilisateur incomplet -> le compléter
    if (this.isDomainIncomplete(userDomain, extractedValues)) {
      console.log(`[DomainCalculator] ➕ Cas 3: Complétion du domaine incomplet`);
      return this.completeDomain(userDomain, extractedValues, scaleType);
    }

    // Cas 4: Domaine utilisateur valide -> le conserver tel quel
    console.log(`[DomainCalculator] ✅ Domaine utilisateur valide, conservation`);
    return [...userDomain]; // Copie pour éviter les modifications externes
  }

  /**
   * Extrait toutes les valeurs uniques d'un champ depuis les données.
   * Gère les champs spéciaux comme 'connections' et 'type'.
   * 
   * @param {Array} data - Les données à analyser
   * @param {string} field - Le nom du champ
   * @returns {Array} Les valeurs uniques trouvées
   */
  getVal(data, field) {
    const values = new Set();
    
    data.forEach((item, index) => {
      let value = null;
      
      // Gestion des champs spéciaux calculés
      if (field === 'connections' && typeof item.connections !== 'undefined') {
        value = item.connections;
      } else if (field === 'type' && typeof item.type !== 'undefined') {
        value = item.type;
      } else if (item[field] !== undefined && item[field] !== null) {
        value = item[field];
      }
      
      if (value !== null && value !== undefined && value !== '') {
        values.add(value);
      }
    });
    
    const result = Array.from(values);
    
    // Mettre en cache les statistiques
    this.cacheFieldStats(field, result, data.length);
    
    return result;
  }

  /**
   * Trie les valeurs du domaine selon le type d'échelle.
   * 
   * @param {Array} values - Les valeurs à trier
   * @param {string} scaleType - Le type d'échelle
   * @returns {Array} Les valeurs triées
   */
  sortDomainValues(values, scaleType) {
    if (scaleType === 'ordinal') {
      // Pour les échelles ordinales, tri alphanumérique
      return [...values].sort((a, b) => {
        if (typeof a === 'string' && typeof b === 'string') {
          return a.localeCompare(b, 'fr', { numeric: true });
        }
        return String(a).localeCompare(String(b), 'fr', { numeric: true });
      });
    } else {
      // Pour les échelles numériques, tri numérique
      return [...values].sort((a, b) => {
        const numA = this.convertToNumber(a);
        const numB = this.convertToNumber(b);
        return numA - numB;
      });
    }
  }

  /**
   * Vérifie si le domaine utilisateur est invalide par rapport aux données.
   * 
   * @param {Array} userDomain - Le domaine fourni par l'utilisateur
   * @param {Array} extractedValues - Les valeurs extraites des données
   * @returns {boolean} True si le domaine est invalide
   */
  isDomainInvalid(userDomain, extractedValues) {
    if (!Array.isArray(userDomain)) return true;
    
    // Vérifier si au moins une valeur du domaine utilisateur existe dans les données
    const hasValidValues = userDomain.some(domainValue => 
      extractedValues.some(dataValue => this.valuesAreEqual(domainValue, dataValue))
    );
    
    return !hasValidValues;
  }

  /**
   * Vérifie si le domaine utilisateur est incomplet.
   * 
   * @param {Array} userDomain - Le domaine fourni par l'utilisateur
   * @param {Array} extractedValues - Les valeurs extraites des données
   * @returns {boolean} True si le domaine est incomplet
   */
  isDomainIncomplete(userDomain, extractedValues) {
    if (!Array.isArray(userDomain)) return false;
    
    // Le domaine est incomplet s'il manque des valeurs présentes dans les données
    const missingValues = extractedValues.filter(dataValue => 
      !userDomain.some(domainValue => this.valuesAreEqual(domainValue, dataValue))
    );
    
    return missingValues.length > 0;
  }

  /**
   * Corrige un domaine invalide en utilisant les valeurs des données.
   * 
   * @param {Array} invalidDomain - Le domaine invalide
   * @param {Array} extractedValues - Les valeurs extraites des données
   * @param {string} scaleType - Le type d'échelle
   * @returns {Array} Le domaine corrigé
   */
  fixDomain(invalidDomain, extractedValues, scaleType) {
    // Pour un domaine complètement invalide, utiliser toutes les valeurs des données
    return this.sortDomainValues(extractedValues, scaleType);
  }

  /**
   * Complète un domaine incomplet en préservant l'ordre de l'utilisateur.
   * 
   * @param {Array} incompleteDomain - Le domaine incomplet
   * @param {Array} extractedValues - Les valeurs extraites des données
   * @param {string} scaleType - Le type d'échelle
   * @returns {Array} Le domaine complété
   */
  completeDomain(incompleteDomain, extractedValues, scaleType) {
    // Garder l'ordre de l'utilisateur pour les valeurs qu'il a spécifiées
    const completedDomain = [...incompleteDomain];
    
    // Ajouter les valeurs manquantes
    const missingValues = extractedValues.filter(dataValue => 
      !incompleteDomain.some(domainValue => this.valuesAreEqual(domainValue, dataValue))
    );
    
    // Trier les valeurs manquantes selon le type d'échelle
    const sortedMissingValues = this.sortDomainValues(missingValues, scaleType);
    
    // Les ajouter à la fin du domaine utilisateur
    completedDomain.push(...sortedMissingValues);
    
    return completedDomain;
  }

  /**
   * Compare deux valeurs pour déterminer si elles sont équivalentes.
   * Gère les comparaisons de types différents (string/number).
   * 
   * @param {*} value1 - Première valeur
   * @param {*} value2 - Deuxième valeur
   * @returns {boolean} True si les valeurs sont équivalentes
   */
  valuesAreEqual(value1, value2) {
    // Comparaison directe
    if (value1 === value2) return true;
    
    // Comparaison après conversion en string (pour gérer "1" vs 1)
    if (String(value1) === String(value2)) return true;
    
    // Comparaison numérique si les deux valeurs peuvent être converties
    const num1 = this.convertToNumber(value1);
    const num2 = this.convertToNumber(value2);
    if (!isNaN(num1) && !isNaN(num2) && num1 === num2) return true;
    
    return false;
  }

  /**
   * Convertit une valeur en nombre si possible.
   * 
   * @param {*} value - La valeur à convertir
   * @returns {number} Le nombre ou NaN si impossible
   */
  convertToNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? NaN : num;
    }
    return NaN;
  }

  /**
   * Met en cache les statistiques d'un champ pour optimiser les calculs futurs.
   * 
   * @param {string} field - Le nom du champ
   * @param {Array} uniqueValues - Les valeurs uniques trouvées
   * @param {number} totalCount - Le nombre total d'éléments dans les données
   */
  cacheFieldStats(field, uniqueValues, totalCount) {
    const stats = {
      uniqueValues: [...uniqueValues],
      uniqueCount: uniqueValues.length,
      totalCount: totalCount,
      coverage: uniqueValues.length / totalCount,
      lastUpdated: Date.now()
    };
    
    this.fieldStatsCache.set(field, stats);
  }

  /**
   * Récupère les statistiques d'un champ depuis le cache.
   * 
   * @param {string} field - Le nom du champ
   * @returns {Object|null} Les statistiques ou null si non trouvées
   */
  getFieldStats(field) {
    return this.fieldStatsCache.get(field) || null;
  }

  /**
   * Vide le cache pour forcer le recalcul lors de la prochaine utilisation.
   */
  clearCache() {
    this.domainCache.clear();
    this.fieldStatsCache.clear();
  }

  /**
   * Génère un domaine suggéré pour un champ numérique basé sur les statistiques.
   * Utile pour les échelles linéaires, sqrt, log.
   * 
   * @param {Array} data - Les données à analyser
   * @param {string} field - Le nom du champ numérique
   * @param {number} steps - Le nombre de pas suggérés (défaut: 5)
   * @returns {Array} Le domaine numérique suggéré
   */
  generateNumericDomain(data, field, steps = 5) {
    const values = this.getVal(data, field)
      .map(v => this.convertToNumber(v))
      .filter(v => !isNaN(v));
    
    if (values.length === 0) return [];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const step = (max - min) / (steps - 1);
    
    const domain = [];
    for (let i = 0; i < steps; i++) {
      domain.push(min + (step * i));
    }
    
    return domain;
  }

  /**
   * Analyse la nature d'un champ pour suggérer le type d'échelle approprié.
   * 
   * @param {Array} data - Les données à analyser
   * @param {string} field - Le nom du champ
   * @returns {Object} Analyse avec type suggéré et statistiques
   */
  analyzeFieldType(data, field) {
    const values = this.getVal(data, field);
    if (values.length === 0) {
      return {
        suggestedScale: 'ordinal',
        isNumeric: false,
        uniqueCount: 0,
        samples: []
      };
    }
    
    // Tester si toutes les valeurs sont numériques
    const numericValues = values.map(v => this.convertToNumber(v)).filter(v => !isNaN(v));
    const isNumeric = numericValues.length === values.length;
    
    // Calculer des statistiques
    const uniqueCount = values.length;
    const samples = values.slice(0, 5); // Échantillon pour aperçu
    
    // Suggérer le type d'échelle
    let suggestedScale = 'ordinal';
    if (isNumeric) {
      if (uniqueCount <= 10) {
        suggestedScale = 'ordinal'; // Peu de valeurs numériques -> ordinal
      } else {
        suggestedScale = 'linear'; // Beaucoup de valeurs numériques -> linéaire
      }
    }
    
    return {
      suggestedScale,
      isNumeric,
      uniqueCount,
      samples,
      coverage: uniqueCount / data.length
    };
  }
} 