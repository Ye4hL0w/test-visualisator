/**
 * Utilitaires globaux pour le visualisateur
 */

/**
 * Vérifie si des données sont stockées dans localStorage
 * @returns {boolean} True si des données sont présentes
 */
function hasStoredData() {
    return localStorage.getItem('metabolomicsData') !== null;
}

/**
 * Récupère les données métabolomiques stockées
 * @returns {Object|null} Les données métabolomiques ou null si non trouvées
 */
function getStoredData() {
    try {
        const data = localStorage.getItem('metabolomicsData');
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        return null;
    }
}

/**
 * Stocke les données métabolomiques
 * @param {Object} data - Les données à stocker
 */
function storeData(data) {
    try {
        localStorage.setItem('metabolomicsData', JSON.stringify(data));
    } catch (error) {
        console.error('Erreur lors du stockage des données:', error);
    }
}

/**
 * Supprime les données métabolomiques stockées
 */
function clearStoredData() {
    localStorage.removeItem('metabolomicsData');
}

/**
 * Récupère la valeur d'un cookie spécifique
 * @param {string} name - Le nom du cookie à récupérer
 * @returns {string|null} La valeur du cookie ou null si non trouvé
 */
function getCookie(name) {
    try {
        const cookieMatch = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        if (cookieMatch) {
            return cookieMatch[2];
        }
        return null;
    } catch (error) {
        console.error(`Erreur lors de la récupération du cookie '${name}':`, error);
        return null;
    }
}

/**
 * Vérifie si une colonne contient des données numériques
 * @param {Array} data - Les données à vérifier
 * @param {string} columnName - Le nom de la colonne à vérifier
 * @returns {boolean} True si la colonne est numérique, sinon False
 */
function isNumericColumn(data, columnName) {
    if (!data || !data.values || data.values.length === 0) return false;
    
    // Examiner quelques valeurs pour déterminer si la colonne est numérique
    for (let i = 0; i < Math.min(5, data.values.length); i++) {
        const value = data.values[i][columnName];
        if (value !== undefined && isNaN(parseFloat(value))) {
            return false;
        }
    }
    
    return true;
}

/**
 * Charge les données d'exemple
 * @returns {Object} Les données d'exemple
 */
function loadSampleData() {
    const data = window.SAMPLE_DATA;
    storeData(data);
    return data;
}

/**
 * Transforme une URI en un nom plus lisible
 * @param {string} uri - L'URI à transformer
 * @returns {string} Le nom extrait de l'URI
 */
function extractNameFromURI(uri) {
    if (!uri) return '';
    
    // Extraire le dernier segment après / ou #
    const lastSegment = uri.split(/[/#]/).pop();
    
    // Remplacer les caractères spéciaux et les underscores par des espaces
    return lastSegment.replace(/[_-]/g, ' ').trim();
}

/**
 * Formate un timestamp en date lisible
 * @param {number} timestamp - Le timestamp à formater
 * @returns {string} La date formatée
 */
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Formate un nombre avec séparateur de milliers
 * @param {number} num - Le nombre à formater
 * @returns {string} Le nombre formaté
 */
function formatNumber(num) {
    return new Intl.NumberFormat('fr-FR').format(num);
}

// Exporter les fonctions
export {
    hasStoredData,
    getStoredData,
    storeData,
    clearStoredData,
    getCookie,
    isNumericColumn,
    loadSampleData,
    extractNameFromURI,
    formatDate,
    formatNumber
}; 