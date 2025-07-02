/**
 * Classe pour calculer les domaines des encodings visuels
 * Gère les cas de données manquantes, erronées ou incomplètes
 */
export class DomainCalculator {
  constructor() {
    // Cache pour éviter de recalculer les domaines identiques
    this.domainCache = new Map();
  }

  /**
   * Méthode principale pour obtenir un domaine approprié
   * @param {Array} data - Les données (nodes ou links)
   * @param {string} field - Le champ à analyser
   * @param {Array} userDomain - Le domaine fourni par l'utilisateur (peut être null/undefined)
   * @param {string} scaleType - Le type d'échelle ('ordinal', 'linear', etc.)
   * @returns {Array} Le domaine calculé
   */
  getDomain(data, field, userDomain, scaleType = 'ordinal') {
    const cacheKey = `${field}-${JSON.stringify(userDomain)}-${scaleType}-${data.length}`;
    
    if (this.domainCache.has(cacheKey)) {
      return this.domainCache.get(cacheKey);
    }

    let calculatedDomain;

    if (!userDomain || userDomain.length === 0) {
      // Cas 1: Pas de domaine fourni -> calculer à partir des données
      calculatedDomain = this.getVal(data, field, scaleType);
      console.log(`[DomainCalculator] 📊 Domaine auto-généré pour "${field}":`, calculatedDomain);
    } else {
      // Cas 2: Domaine fourni -> vérifier et corriger si nécessaire
      const dataValues = this.getVal(data, field, scaleType);
      
      if (this.isDomainErroneous(userDomain, dataValues)) {
        calculatedDomain = this.fixDomain(userDomain, dataValues);
        console.log(`[DomainCalculator] 🔧 Domaine corrigé pour "${field}":`, calculatedDomain);
      } else if (this.isDomainIncomplete(userDomain, dataValues)) {
        calculatedDomain = this.comp(userDomain, dataValues);
        console.log(`[DomainCalculator] ➕ Domaine complété pour "${field}":`, calculatedDomain);
      } else {
        calculatedDomain = userDomain;
        console.log(`[DomainCalculator] ✅ Domaine utilisateur valide pour "${field}":`, calculatedDomain);
      }
    }

    this.domainCache.set(cacheKey, calculatedDomain);
    return calculatedDomain;
  }

  /**
   * Extrait les valeurs uniques du champ dans les données et les trie
   * @param {Array} data - Les données à analyser
   * @param {string} field - Le champ à extraire
   * @param {string} scaleType - Le type d'échelle
   * @returns {Array} Les valeurs uniques triées
   */
  getVal(data, field, scaleType = 'ordinal') {
    if (!data || data.length === 0) {
      console.warn(`[DomainCalculator] ⚠️ Aucune donnée fournie pour le champ "${field}"`);
      return [];
    }

    const values = new Set();
    
    data.forEach(item => {
      if (item && item[field] !== undefined && item[field] !== null) {
        values.add(item[field]);
      }
    });

    const uniqueValues = Array.from(values);
    
    if (scaleType === 'ordinal') {
      // Tri alphabétique pour les échelles ordinales
      return uniqueValues.sort((a, b) => {
        return String(a).localeCompare(String(b));
      });
    } else {
      // Tri numérique pour les échelles continues
      return uniqueValues.sort((a, b) => {
        const numA = Number(a);
        const numB = Number(b);
        if (isNaN(numA) || isNaN(numB)) {
          return String(a).localeCompare(String(b));
        }
        return numA - numB;
      });
    }
  }

  /**
   * Vérifie si le domaine utilisateur est erroné
   * @param {Array} userDomain - Le domaine fourni par l'utilisateur
   * @param {Array} dataValues - Les valeurs présentes dans les données
   * @returns {boolean} True si le domaine est erroné
   */
  isDomainErroneous(userDomain, dataValues) {
    if (!userDomain || userDomain.length === 0) return false;
    
    // Un domaine est considéré comme erroné si :
    // 1. Il contient des valeurs qui n'existent pas dans les données
    // 2. Il ne contient aucune valeur présente dans les données
    
    const dataSet = new Set(dataValues);
    const userSet = new Set(userDomain);
    
    // Vérifier s'il y a une intersection
    const intersection = [...userSet].filter(val => dataSet.has(val));
    
    // Si aucune intersection, le domaine est complètement erroné
    if (intersection.length === 0 && dataValues.length > 0) {
      return true;
    }
    
    // Si plus de 50% des valeurs du domaine utilisateur n'existent pas dans les données
    const invalidValues = [...userSet].filter(val => !dataSet.has(val));
    return invalidValues.length > userDomain.length * 0.5;
  }

  /**
   * Vérifie si le domaine utilisateur est incomplet
   * @param {Array} userDomain - Le domaine fourni par l'utilisateur
   * @param {Array} dataValues - Les valeurs présentes dans les données
   * @returns {boolean} True si le domaine est incomplet
   */
  isDomainIncomplete(userDomain, dataValues) {
    if (!userDomain || userDomain.length === 0) return false;
    
    const dataSet = new Set(dataValues);
    const userSet = new Set(userDomain);
    
    // Le domaine est incomplet s'il manque des valeurs présentes dans les données
    const missingValues = [...dataSet].filter(val => !userSet.has(val));
    return missingValues.length > 0;
  }

  /**
   * Corrige un domaine erroné en remplaçant les valeurs invalides
   * @param {Array} userDomain - Le domaine fourni par l'utilisateur
   * @param {Array} dataValues - Les valeurs présentes dans les données
   * @returns {Array} Le domaine corrigé
   */
  fixDomain(userDomain, dataValues) {
    const dataSet = new Set(dataValues);
    const validUserValues = userDomain.filter(val => dataSet.has(val));
    
    // Conserver l'ordre de l'utilisateur pour les valeurs valides
    const result = [...validUserValues];
    
    // Ajouter les valeurs manquantes des données à la fin
    const missingDataValues = dataValues.filter(val => !result.includes(val));
    result.push(...missingDataValues);
    
    return result;
  }

  /**
   * Complète un domaine incomplet en ajoutant les valeurs manquantes
   * @param {Array} userDomain - Le domaine fourni par l'utilisateur
   * @param {Array} dataValues - Les valeurs présentes dans les données
   * @returns {Array} Le domaine complété
   */
  comp(userDomain, dataValues) {
    const userSet = new Set(userDomain);
    const result = [...userDomain]; // Préserver l'ordre utilisateur
    
    // Ajouter les valeurs des données qui ne sont pas dans le domaine utilisateur
    const missingValues = dataValues.filter(val => !userSet.has(val));
    
    // Trier les valeurs manquantes pour un ordre prévisible
    missingValues.sort((a, b) => String(a).localeCompare(String(b)));
    
    result.push(...missingValues);
    
    return result;
  }

  /**
   * Nettoie le cache des domaines
   */
  clearCache() {
    this.domainCache.clear();
    console.log('[DomainCalculator] 🗑️ Cache des domaines nettoyé');
  }

  /**
   * Obtient des statistiques sur les domaines calculés
   * @param {Array} data - Les données
   * @param {string} field - Le champ
   * @returns {Object} Statistiques du domaine
   */
  getDomainStats(data, field) {
    const values = this.getVal(data, field);
    
    return {
      field: field,
      uniqueValues: values.length,
      values: values,
      dataPoints: data.length,
      coverage: data.filter(item => item && item[field] !== undefined && item[field] !== null).length,
      nullValues: data.length - data.filter(item => item && item[field] !== undefined && item[field] !== null).length
    };
  }
} 