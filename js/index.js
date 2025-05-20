/**
 * Script pour la page index.html
 * Gère l'interaction avec le tableau de données
 */
document.addEventListener('DOMContentLoaded', function() {
    const viewTable = document.getElementById('view-table');
    const dataTable = document.getElementById('data-table');
    const tableContainer = document.getElementById('table-container');
    const visualizationElement = document.getElementById('visualization');
    const visualizationControls = document.getElementById('visualization-controls');
    const tableControls = document.getElementById('table-controls');
    const showJsonCheckbox = document.getElementById('show-json-checkbox');
    
    // Gérer le clic sur le bouton "Tableau de données"
    viewTable.addEventListener('click', function() {
        // Mettre à jour la classe active
        document.querySelectorAll('.sub-nav button').forEach(button => {
            button.classList.remove('active');
        });
        this.classList.add('active');
        
        // Masquer la visualisation D3 et afficher le tableau
        visualizationElement.style.display = 'none';
        tableContainer.style.display = 'block';
        
        // Basculer les contrôles
        visualizationControls.style.display = 'none';
        tableControls.style.display = 'block';
        
        // Mettre à jour le tableau avec les données actuelles
        updateTableWithCurrentData();
    });
    
    // Gérer le clic sur les autres boutons de visualisation
    const otherButtons = ['view-scatter', 'view-heatmap', 'view-network', 'view-barplot'];
    otherButtons.forEach(buttonId => {
        document.getElementById(buttonId).addEventListener('click', function() {
            tableContainer.style.display = 'none';
            visualizationElement.style.display = 'block';
            visualizationControls.style.display = 'block';
            tableControls.style.display = 'none';
        });
    });
    
    // Option pour afficher/masquer le JSON
    showJsonCheckbox.addEventListener('change', function() {
        dataTable.setAttribute('show-json', this.checked);
    });
    
    // Fonction pour mettre à jour le tableau avec les données actuelles
    function updateTableWithCurrentData() {
        // Récupérer les données depuis l'état de d3-visualizer.js
        if (window.d3Visualizer && window.d3Visualizer.getState) {
            const state = window.d3Visualizer.getState();
            if (state.data && state.data.values) {
                dataTable.setData(state.data.values);
            }
        }
    }
    
    // Observer les changements de données
    if (window.d3Visualizer) {
        window.d3Visualizer.onDataUpdate = updateTableWithCurrentData;
    }
}); 