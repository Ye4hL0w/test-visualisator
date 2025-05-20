/**
 * Module de visualisation D3.js pour les données métabolomiques
 */
import { hasStoredData, getStoredData, storeData, clearStoredData, isNumericColumn, loadSampleData } from './utils.js';

// État interne du visualisateur
const state = {
    data: null,
    currentView: 'scatter',
    dimensions: {
        x: null,
        y: null,
        color: null
    },
    filters: [],
    isLoading: true
};

// Fonction de notification de changement de données
let onDataUpdate = null;

/**
 * Initialise le visualisateur
 */
function init() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('visualization').style.display = 'none';
    
    // Attacher les gestionnaires d'événements
    attachEventListeners();
    
    // Charger les données depuis localStorage
    loadStoredData();
    
    // Vérifier l'état des données
    checkDataStatus();
    
    // Sélectionner des dimensions par défaut après un court délai
    setTimeout(selectDefaultDimensions, 500);
    
    // Exposer l'API pour le tableau externe
    exposeAPI();
}

/**
 * Expose l'API pour les composants externes
 */
function exposeAPI() {
    window.d3Visualizer = {
        getState: () => state,
        
        // Pour être notifié quand les données changent
        set onDataUpdate(callback) {
            onDataUpdate = callback;
        },
        
        // Pour récupérer les données actuelles (filtrées ou non)
        getData: () => {
            return state.filters.length > 0 ? getFilteredData() : state.data?.values || [];
        }
    };
}

/**
 * Notifie des changements de données
 */
function notifyDataUpdate() {
    if (typeof onDataUpdate === 'function') {
        onDataUpdate();
    }
}

/**
 * Attacher tous les gestionnaires d'événements
 */
function attachEventListeners() {
    // Boutons de navigation
    document.getElementById('view-scatter').addEventListener('click', () => switchView('scatter'));
    document.getElementById('view-heatmap').addEventListener('click', () => switchView('heatmap'));
    document.getElementById('view-network').addEventListener('click', () => switchView('network'));
    document.getElementById('view-barplot').addEventListener('click', () => switchView('barplot'));
    
    // Contrôles des axes et filtres
    document.getElementById('x-axis-select').addEventListener('change', updateVisualization);
    document.getElementById('y-axis-select').addEventListener('change', updateVisualization);
    document.getElementById('color-by-select').addEventListener('change', updateVisualization);
    document.getElementById('apply-filter').addEventListener('click', applyFilter);
    
    // Gestion des données
    document.getElementById('load-sample-data').addEventListener('click', handleLoadSampleData);
    document.getElementById('clear-data').addEventListener('click', handleClearData);
}

/**
 * Charge les données métabolomiques stockées
 */
function loadStoredData() {
    state.data = getStoredData();
    
    if (state.data) {
        state.isLoading = false;
        setupInterface();
        updateDataSummary();
        notifyDataUpdate();
    } else {
        document.getElementById('loading').textContent = 'Aucune donnée métabolomique trouvée. Utilisez le bouton "Charger données d\'exemple".';
    }
}

/**
 * Configure l'interface utilisateur
 */
function setupInterface() {
    if (!state.data || !state.data.columns) return;
    
    // Remplir les sélecteurs d'axe X, Y et de couleur
    const selects = ['x-axis-select', 'y-axis-select', 'color-by-select', 'filter-select'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        select.innerHTML = '';
        
        // Ajouter une option vide pour le sélecteur de couleur
        if (selectId === 'color-by-select') {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Aucun --';
            select.appendChild(option);
        }
        
        // Ajouter toutes les colonnes comme options
        state.data.columns.forEach(column => {
            // Vérifier si c'est une colonne numérique pour X et Y
            if ((selectId === 'x-axis-select' || selectId === 'y-axis-select') && 
                !isNumericColumn(state.data, column)) return;
            
            const option = document.createElement('option');
            option.value = column;
            option.textContent = column;
            select.appendChild(option);
        });
    });
    
    // Définir les dimensions par défaut
    selectDefaultDimensions();
}

/**
 * Met à jour le résumé des données
 */
function updateDataSummary() {
    if (!state.data) return;
    
    const summary = document.getElementById('data-summary');
    summary.innerHTML = `
        <p><strong>Nombre d'enregistrements:</strong> ${state.data.values.length}</p>
        <p><strong>Colonnes disponibles:</strong> ${state.data.columns.length}</p>
        <p><strong>Exemple:</strong></p>
        <pre>${JSON.stringify(state.data.values[0], null, 2).slice(0, 200)}...</pre>
    `;
}

/**
 * Change le type de visualisation
 */
function switchView(viewType) {
    // Mettre à jour l'état
    state.currentView = viewType;
    
    // Mettre à jour la classe active du bouton
    document.querySelectorAll('.sub-nav button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`view-${viewType}`).classList.add('active');
    
    // Mettre à jour la visualisation
    updateVisualization();
}

/**
 * Met à jour la visualisation en fonction de l'état actuel
 */
function updateVisualization() {
    // Vérifier si les données sont disponibles
    if (!state.data) return;
    
    // Récupérer les dimensions sélectionnées
    state.dimensions.x = document.getElementById('x-axis-select').value;
    state.dimensions.y = document.getElementById('y-axis-select').value;
    state.dimensions.color = document.getElementById('color-by-select').value;
    
    // Afficher la visualisation
    document.getElementById('loading').style.display = 'none';
    document.getElementById('visualization').style.display = 'block';
    
    // Effacer le conteneur
    document.getElementById('visualization').innerHTML = '';
    
    // Dessiner la visualisation appropriée
    switch (state.currentView) {
        case 'scatter':
            drawScatterPlot();
            break;
        case 'heatmap':
            drawHeatmap();
            break;
        case 'network':
            drawNetwork();
            break;
        case 'barplot':
            drawBarPlot();
            break;
    }
}

/**
 * Applique un filtre aux données
 */
function applyFilter() {
    const filterColumn = document.getElementById('filter-select').value;
    const filterValue = document.getElementById('filter-value').value.trim();
    
    if (!filterColumn || !filterValue) return;
    
    // Ajouter le filtre
    state.filters.push({
        column: filterColumn,
        value: filterValue
    });
    
    // Mettre à jour la visualisation
    updateVisualization();
    
    // Notifier du changement de données filtrées
    notifyDataUpdate();
}

/**
 * Récupère les données filtrées
 */
function getFilteredData() {
    if (!state.data) return [];
    
    let filteredData = [...state.data.values];
    
    // Appliquer tous les filtres
    if (state.filters.length > 0) {
        state.filters.forEach(filter => {
            filteredData = filteredData.filter(item => {
                const itemValue = String(item[filter.column]).toLowerCase();
                const filterValue = String(filter.value).toLowerCase();
                return itemValue.includes(filterValue);
            });
        });
    }
    
    return filteredData;
}

/**
 * Dessine un nuage de points
 */
function drawScatterPlot() {
    if (!state.dimensions.x || !state.dimensions.y) {
        document.getElementById('visualization').innerHTML = '<div class="error">Veuillez sélectionner des dimensions X et Y.</div>';
        return;
    }
    
    const filteredData = getFilteredData();
    if (filteredData.length === 0) {
        document.getElementById('visualization').innerHTML = '<div class="error">Aucune donnée à visualiser.</div>';
        return;
    }
    
    // Configurer les dimensions
    const container = document.getElementById('visualization');
    const width = container.clientWidth;
    const height = 500;
    const margin = { top: 20, right: 20, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Créer le conteneur SVG
    const svg = d3.select('#visualization')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Créer les échelles
    const xScale = d3.scaleLinear()
        .domain([
            d3.min(filteredData, d => parseFloat(d[state.dimensions.x])),
            d3.max(filteredData, d => parseFloat(d[state.dimensions.x]))
        ])
        .range([0, innerWidth]);
    
    const yScale = d3.scaleLinear()
        .domain([
            d3.min(filteredData, d => parseFloat(d[state.dimensions.y])),
            d3.max(filteredData, d => parseFloat(d[state.dimensions.y]))
        ])
        .range([innerHeight, 0]);
    
    // Créer le groupe principal
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Ajouter les axes
    g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .append('text')
        .attr('fill', '#000')
        .attr('y', margin.bottom - 10)
        .attr('x', innerWidth / 2)
        .attr('text-anchor', 'middle')
        .text(state.dimensions.x);
    
    g.append('g')
        .call(d3.axisLeft(yScale))
        .append('text')
        .attr('fill', '#000')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 10)
        .attr('x', -innerHeight / 2)
        .attr('text-anchor', 'middle')
        .text(state.dimensions.y);
    
    // Créer l'échelle de couleur si nécessaire
    let colorScale;
    if (state.dimensions.color) {
        const colorDomain = [...new Set(filteredData.map(d => d[state.dimensions.color]))];
        
        if (isNumericColumn(state.data, state.dimensions.color)) {
            const values = filteredData.map(d => parseFloat(d[state.dimensions.color]));
            colorScale = d3.scaleSequential(d3.interpolateViridis)
                .domain([d3.min(values), d3.max(values)]);
        } else {
            colorScale = d3.scaleOrdinal(d3.schemeCategory10)
                .domain(colorDomain);
        }
    }
    
    // Ajouter les points
    g.selectAll('circle')
        .data(filteredData)
        .enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('cx', d => xScale(parseFloat(d[state.dimensions.x])))
        .attr('cy', d => yScale(parseFloat(d[state.dimensions.y])))
        .attr('r', 5)
        .attr('fill', d => state.dimensions.color ? colorScale(d[state.dimensions.color]) : '#4CAF50')
        .attr('opacity', 0.7)
        .on('mouseover', function(event, d) {
            d3.select(this)
                .attr('r', 8)
                .attr('opacity', 1);
            
            const tooltip = d3.select('body')
                .append('div')
                .attr('class', 'tooltip')
                .style('position', 'absolute')
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY + 10}px`)
                .style('opacity', 0);
            
            let tooltipContent = `
                <strong>${d.name || d.id || ''}</strong><br>
                ${state.dimensions.x}: ${d[state.dimensions.x]}<br>
                ${state.dimensions.y}: ${d[state.dimensions.y]}
            `;
            
            if (state.dimensions.color) {
                tooltipContent += `<br>${state.dimensions.color}: ${d[state.dimensions.color]}`;
            }
            
            tooltip.html(tooltipContent)
                .transition()
                .duration(200)
                .style('opacity', 0.9);
        })
        .on('mouseout', function() {
            d3.select(this)
                .attr('r', 5)
                .attr('opacity', 0.7);
            
            d3.selectAll('.tooltip')
                .transition()
                .duration(500)
                .style('opacity', 0)
                .remove();
        });
    
    // Ajouter une légende si nécessaire
    if (state.dimensions.color) {
        // Implémentation de la légende...
    }
}

/**
 * Dessine une carte de chaleur
 */
function drawHeatmap() {
    if (!state.dimensions.x || !state.dimensions.y) {
        document.getElementById('visualization').innerHTML = '<div class="error">Veuillez sélectionner des dimensions X et Y.</div>';
        return;
    }
    
    const filteredData = getFilteredData();
    if (filteredData.length === 0) {
        document.getElementById('visualization').innerHTML = '<div class="error">Aucune donnée à visualiser.</div>';
        return;
    }
    
    // Obtenir les valeurs uniques pour X et Y
    const xCategories = [...new Set(filteredData.map(d => d[state.dimensions.x]))];
    const yCategories = [...new Set(filteredData.map(d => d[state.dimensions.y]))];
    
    if (xCategories.length > 50 || yCategories.length > 50) {
        document.getElementById('visualization').innerHTML = '<div class="error">Trop de catégories pour une carte de chaleur. Choisissez des dimensions avec moins de valeurs uniques.</div>';
        return;
    }
    
    // Créer une matrice pour les données
    const matrix = [];
    const valuesByCell = {};
    
    // Initialiser la matrice avec des zéros
    yCategories.forEach(y => {
        const row = {};
        xCategories.forEach(x => {
            row[x] = 0;
            valuesByCell[`${x}-${y}`] = [];
        });
        matrix.push(row);
    });
    
    // Remplir la matrice avec les comptages
    filteredData.forEach(d => {
        const x = d[state.dimensions.x];
        const y = d[state.dimensions.y];
        
        const yIndex = yCategories.indexOf(y);
        if (yIndex !== -1) {
            matrix[yIndex][x] += 1;
            valuesByCell[`${x}-${y}`].push(d);
        }
    });
    
    // Configurer les dimensions
    const container = document.getElementById('visualization');
    const width = container.clientWidth;
    const height = 500;
    const margin = { top: 50, right: 50, bottom: 100, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Calculer la taille des cellules
    const cellWidth = innerWidth / xCategories.length;
    const cellHeight = innerHeight / yCategories.length;
    
    // Créer le conteneur SVG
    const svg = d3.select('#visualization')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Ajouter un titre
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .text(`Carte de chaleur: ${state.dimensions.x} vs ${state.dimensions.y}`);
    
    // Créer le groupe principal
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Créer l'échelle de couleur
    const colorScale = d3.scaleSequential(d3.interpolateViridis)
        .domain([0, d3.max(matrix, row => d3.max(Object.values(row)))]);
    
    // Créer les échelles X et Y
    const xScale = d3.scaleBand()
        .domain(xCategories)
        .range([0, innerWidth])
        .padding(0.05);
    
    const yScale = d3.scaleBand()
        .domain(yCategories)
        .range([0, innerHeight])
        .padding(0.05);
    
    // Ajouter les axes
    g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em');
    
    g.append('g')
        .call(d3.axisLeft(yScale));
    
    // Ajouter les cellules de la heatmap
    yCategories.forEach((y, yIndex) => {
        xCategories.forEach(x => {
            const count = matrix[yIndex][x];
            
            g.append('rect')
                .attr('x', xScale(x))
                .attr('y', yScale(y))
                .attr('width', xScale.bandwidth())
                .attr('height', yScale.bandwidth())
                .attr('fill', colorScale(count))
                .attr('stroke', 'white')
                .attr('stroke-width', 1)
                .on('mouseover', function(event) {
                    // Afficher les informations au survol
                    d3.select(this).attr('stroke-width', 2);
                    
                    const tooltip = d3.select('body')
                        .append('div')
                        .attr('class', 'tooltip')
                        .style('position', 'absolute')
                        .style('left', `${event.pageX + 10}px`)
                        .style('top', `${event.pageY + 10}px`)
                        .style('opacity', 0);
                    
                    tooltip.html(`
                        <strong>${x} - ${y}</strong><br>
                        Nombre: ${count}
                    `)
                    .transition()
                    .duration(200)
                    .style('opacity', 0.9);
                })
                .on('mouseout', function() {
                    d3.select(this).attr('stroke-width', 1);
                    
                    d3.selectAll('.tooltip')
                        .transition()
                        .duration(500)
                        .style('opacity', 0)
                        .remove();
                });
        });
    });
    
    // Ajouter une légende pour la couleur
    const legendWidth = 20;
    const legendHeight = innerHeight;
    
    const legendScale = d3.scaleSequential(d3.interpolateViridis)
        .domain([d3.max(matrix, row => d3.max(Object.values(row))), 0]);
    
    const legend = svg.append('g')
        .attr('transform', `translate(${width - margin.right + 10}, ${margin.top})`);
    
    // Créer le gradient pour la légende
    const legendData = Array.from({ length: 100 }, (_, i) => i);
    
    legend.selectAll('rect')
        .data(legendData)
        .enter()
        .append('rect')
        .attr('x', 0)
        .attr('y', (d, i) => i * (legendHeight / 100))
        .attr('width', legendWidth)
        .attr('height', legendHeight / 100)
        .attr('fill', d => colorScale(d3.max(matrix, row => d3.max(Object.values(row))) - d * (d3.max(matrix, row => d3.max(Object.values(row))) / 100)));
    
    // Ajouter l'axe de la légende
    const legendAxis = d3.axisRight()
        .scale(d3.scaleLinear()
            .domain([0, d3.max(matrix, row => d3.max(Object.values(row)))])
            .range([legendHeight, 0]))
        .ticks(5);
    
    legend.append('g')
        .attr('transform', `translate(${legendWidth}, 0)`)
        .call(legendAxis);
    
    legend.append('text')
        .attr('transform', 'rotate(90)')
        .attr('x', legendHeight / 2)
        .attr('y', -legendWidth - 10)
        .attr('text-anchor', 'middle')
        .text('Nombre');
}

/**
 * Dessine un réseau d'interactions
 */
function drawNetwork() {
    if (!state.dimensions.x || !state.dimensions.y) {
        document.getElementById('visualization').innerHTML = '<div class="error">Veuillez sélectionner des dimensions X et Y pour définir les connexions du réseau.</div>';
        return;
    }
    
    const filteredData = getFilteredData();
    if (filteredData.length === 0) {
        document.getElementById('visualization').innerHTML = '<div class="error">Aucune donnée à visualiser.</div>';
        return;
    }
    
    // Configurer les dimensions
    const container = document.getElementById('visualization');
    const width = container.clientWidth;
    const height = 600;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Créer le conteneur SVG
    const svg = d3.select('#visualization')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Créer le groupe principal
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Ajouter un titre
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', margin.top)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .text(`Réseau d'interactions: ${state.dimensions.x} vers ${state.dimensions.y}`);
    
    // Construire les nœuds et les liens
    const nodesMap = new Map();
    const links = [];
    
    filteredData.forEach(d => {
        const sourceId = d[state.dimensions.x];
        const targetId = d[state.dimensions.y];
        
        if (!sourceId || !targetId) return;
        
        // Ajouter le nœud source s'il n'existe pas
        if (!nodesMap.has(sourceId)) {
            nodesMap.set(sourceId, {
                id: sourceId,
                group: 1,
                count: 1
            });
        } else {
            nodesMap.get(sourceId).count++;
        }
        
        // Ajouter le nœud cible s'il n'existe pas
        if (!nodesMap.has(targetId)) {
            nodesMap.set(targetId, {
                id: targetId,
                group: 2,
                count: 1
            });
        } else {
            nodesMap.get(targetId).count++;
        }
        
        // Ajouter le lien
        links.push({
            source: sourceId,
            target: targetId,
            value: 1
        });
    });
    
    // Convertir les nœuds en tableau
    const nodes = Array.from(nodesMap.values());
    
    // Si trop de nœuds, afficher un avertissement
    if (nodes.length > 100) {
        document.getElementById('visualization').innerHTML = '<div class="error">Trop de nœuds pour une visualisation réseau claire. Essayez de filtrer davantage les données.</div>';
        return;
    }
    
    // Créer la simulation de force
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(innerWidth / 2, innerHeight / 2))
        .force('collision', d3.forceCollide().radius(d => Math.sqrt(d.count) * 5 + 10));
    
    // Dessiner les liens
    const link = g.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', d => Math.sqrt(d.value));
    
    // Dessiner les nœuds
    const node = g.append('g')
        .attr('class', 'nodes')
        .selectAll('circle')
        .data(nodes)
        .enter()
        .append('circle')
        .attr('r', d => Math.sqrt(d.count) * 5 + 5)
        .attr('fill', d => d.group === 1 ? '#4CAF50' : '#2196F3')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));
    
    // Ajouter les étiquettes
    const label = g.append('g')
        .attr('class', 'labels')
        .selectAll('text')
        .data(nodes)
        .enter()
        .append('text')
        .text(d => d.id)
        .attr('font-size', 10)
        .attr('dx', 12)
        .attr('dy', 4);
    
    // Ajouter les tooltips
    node.append('title')
        .text(d => `${d.id} (${d.count} connexions)`);
    
    // Mettre à jour les positions à chaque tick
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node
            .attr('cx', d => d.x = Math.max(10, Math.min(innerWidth - 10, d.x)))
            .attr('cy', d => d.y = Math.max(10, Math.min(innerHeight - 10, d.y)));
        
        label
            .attr('x', d => d.x)
            .attr('y', d => d.y);
    });
    
    // Fonctions de gestion du drag pour déplacer les nœuds
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }
    
    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
    
    // Ajouter une légende
    const legend = svg.append('g')
        .attr('transform', `translate(${margin.left + 10}, ${margin.top + 30})`);
    
    legend.append('circle')
        .attr('r', 6)
        .attr('cx', 10)
        .attr('cy', 10)
        .attr('fill', '#4CAF50');
    
    legend.append('text')
        .attr('x', 25)
        .attr('y', 13)
        .attr('font-size', 12)
        .text(`${state.dimensions.x}`);
    
    legend.append('circle')
        .attr('r', 6)
        .attr('cx', 10)
        .attr('cy', 30)
        .attr('fill', '#2196F3');
    
    legend.append('text')
        .attr('x', 25)
        .attr('y', 33)
        .attr('font-size', 12)
        .text(`${state.dimensions.y}`);
}

/**
 * Dessine un diagramme à barres
 */
function drawBarPlot() {
    if (!state.dimensions.x || !state.dimensions.y) {
        document.getElementById('visualization').innerHTML = '<div class="error">Veuillez sélectionner des dimensions X (catégories) et Y (valeurs).</div>';
        return;
    }
    
    const filteredData = getFilteredData();
    if (filteredData.length === 0) {
        document.getElementById('visualization').innerHTML = '<div class="error">Aucune donnée à visualiser.</div>';
        return;
    }
    
    // Agréger les données par catégorie X
    const aggregatedData = d3.rollup(
        filteredData,
        v => d3.sum(v, d => isNaN(parseFloat(d[state.dimensions.y])) ? 1 : parseFloat(d[state.dimensions.y])),
        d => d[state.dimensions.x]
    );
    
    // Convertir en tableau
    const data = Array.from(aggregatedData, ([name, value]) => ({ name, value }));
    
    // Trier les données
    data.sort((a, b) => b.value - a.value);
    
    // Si trop de catégories, limiter pour la lisibilité
    let limitedData = data;
    if (data.length > 20) {
        document.getElementById('visualization').innerHTML = `
            <div class="info">Il y a ${data.length} catégories. Affichage des 20 premières pour la lisibilité.</div>
        `;
        limitedData = data.slice(0, 20);
    }
    
    // Configurer les dimensions
    const container = document.getElementById('visualization');
    const width = container.clientWidth;
    const height = 500;
    const margin = { top: 50, right: 30, bottom: 120, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Créer le conteneur SVG
    const svg = d3.select('#visualization')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Ajouter un titre
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .text(`Diagramme à barres: ${state.dimensions.x} vs ${state.dimensions.y}`);
    
    // Créer le groupe principal
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Créer les échelles
    const xScale = d3.scaleBand()
        .domain(limitedData.map(d => d.name))
        .range([0, innerWidth])
        .padding(0.1);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(limitedData, d => d.value) * 1.1])
        .range([innerHeight, 0]);
    
    // Ajouter les axes
    g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em');
    
    g.append('g')
        .call(d3.axisLeft(yScale));
    
    // Ajouter les barres
    g.selectAll('.bar')
        .data(limitedData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.name))
        .attr('y', d => yScale(d.value))
        .attr('width', xScale.bandwidth())
        .attr('height', d => innerHeight - yScale(d.value))
        .attr('fill', state.dimensions.color ? () => '#4CAF50' : '#4CAF50')
        .on('mouseover', function(event, d) {
            d3.select(this)
                .attr('fill', '#45a049');
            
            const tooltip = d3.select('body')
                .append('div')
                .attr('class', 'tooltip')
                .style('position', 'absolute')
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY + 10}px`)
                .style('opacity', 0);
            
            tooltip.html(`
                <strong>${d.name}</strong><br>
                ${state.dimensions.y}: ${d.value.toFixed(2)}
            `)
            .transition()
            .duration(200)
            .style('opacity', 0.9);
        })
        .on('mouseout', function() {
            d3.select(this)
                .attr('fill', state.dimensions.color ? () => '#4CAF50' : '#4CAF50');
            
            d3.selectAll('.tooltip')
                .transition()
                .duration(500)
                .style('opacity', 0)
                .remove();
        });
    
    // Ajouter des étiquettes pour les valeurs
    g.selectAll('.bar-label')
        .data(limitedData)
        .enter()
        .append('text')
        .attr('class', 'bar-label')
        .attr('x', d => xScale(d.name) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.value) - 5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .text(d => d.value.toFixed(1));
    
    // Ajouter des légendes pour les axes
    svg.append('text')
        .attr('transform', `translate(${width / 2}, ${height - margin.bottom / 3})`)
        .attr('text-anchor', 'middle')
        .text(state.dimensions.x);
    
    svg.append('text')
        .attr('transform', `rotate(-90)`)
        .attr('x', -(height / 2))
        .attr('y', margin.left / 3)
        .attr('text-anchor', 'middle')
        .text(state.dimensions.y);
}

/**
 * Sélectionne des dimensions par défaut en fonction des données disponibles
 */
function selectDefaultDimensions() {
    if (!state.data || !state.data.columns) return;
    
    const numericColumns = state.data.columns.filter(col => isNumericColumn(state.data, col));
    
    if (numericColumns.length >= 2) {
        state.dimensions.x = numericColumns[0];
        state.dimensions.y = numericColumns[1];
        
        const xSelect = document.getElementById('x-axis-select');
        const ySelect = document.getElementById('y-axis-select');
        
        if (xSelect) xSelect.value = state.dimensions.x;
        if (ySelect) ySelect.value = state.dimensions.y;
    }
    
    // Mettre à jour la visualisation
    updateVisualization();
}

/**
 * Gestionnaire pour le bouton 'Charger données d'exemple'
 */
function handleLoadSampleData() {
    const button = document.getElementById('load-sample-data');
    button.disabled = true;
    button.textContent = 'Chargement en cours...';
    
    // Charger les données d'exemple
    const data = loadSampleData();
    state.data = data;
    
    // Mettre à jour l'interface
    setTimeout(() => {
        setupInterface();
        updateDataSummary();
        checkDataStatus();
        notifyDataUpdate();
        button.disabled = false;
        button.textContent = 'Charger données d\'exemple';
    }, 500);
}

/**
 * Gestionnaire pour le bouton 'Effacer données'
 */
function handleClearData() {
    // Supprimer les données
    clearStoredData();
    state.data = null;
    
    // Mettre à jour l'interface
    checkDataStatus();
    notifyDataUpdate();
    
    // Recharger la page pour vider la visualisation
    location.reload();
}

/**
 * Vérifie l'état des données et met à jour l'interface
 */
function checkDataStatus() {
    const dataStatus = document.getElementById('data-status');
    if (hasStoredData()) {
        dataStatus.innerHTML = '<p>✅ Données chargées avec succès</p>';
        dataStatus.className = 'success';
        
        // Masquer le message d'aide après un certain temps
        setTimeout(() => {
            const helpMessage = document.getElementById('help-message');
            if (helpMessage) {
                helpMessage.style.display = 'none';
            }
        }, 5000);
    } else {
        dataStatus.innerHTML = '<p>❌ Aucune donnée chargée</p><p>Cliquez sur "Charger données d\'exemple" pour commencer</p>';
        dataStatus.className = 'error';
    }
}

// Initialiser le visualisateur quand le DOM est chargé
document.addEventListener('DOMContentLoaded', init); 