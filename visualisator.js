/**
 * @fileOverview Visualisateur de données métabolomiques utilisant D3.js
 * @author Moncada Jérémy
 * @version 1.0.0
 */

/** 
 * @namespace VisualisateurMetabolomique 
 * Espace de noms contenant toutes les fonctionnalités du visualisateur
 */
const VisualisateurMetabolomique = (function() {
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

    /**
     * @function init
     * @memberof VisualisateurMetabolomique
     * @description Initialise le visualisateur de données métabolomiques
     * @returns {void}
     */
    function init() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('visualization').style.display = 'none';
        
        // Attacher les gestionnaires d'événements
        attachEventListeners();
        
        // Charger les données depuis les cookies ou localStorage
        loadDataFromCookies();
        
        // Sélectionner des dimensions par défaut après un court délai
        setTimeout(selectDefaultDimensions, 500);
    }

    /**
     * @function attachEventListeners
     * @memberof VisualisateurMetabolomique
     * @description Attache tous les gestionnaires d'événements aux éléments d'interface
     * @returns {void}
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
    }

    /**
     * @function loadDataFromCookies
     * @memberof VisualisateurMetabolomique
     * @description Charge les données métabolomiques depuis localStorage ou les cookies
     * @returns {void}
     */
    function loadDataFromCookies() {
        try {
            let data = null;
            
            // Essayer d'abord de récupérer les données depuis localStorage
            const localData = localStorage.getItem('metabolomicsData');
            if (localData) {
                console.log("Données trouvées dans localStorage");
                data = JSON.parse(localData);
            } else {
                // Si aucune donnée n'est trouvée dans localStorage, essayer les cookies
                const dataCookie = getCookie('metabolomicsData');
                if (dataCookie) {
                    console.log("Données trouvées dans les cookies");
                    data = JSON.parse(dataCookie);
                }
            }
            
            if (data) {
                // Données trouvées, mettre à jour l'état
                state.data = data;
                state.isLoading = false;
                
                // Initialiser l'interface avec les données
                setupInterface();
                updateDataSummary();
                switchView(state.currentView);
            } else {
                // Si aucune donnée n'est trouvée, afficher un message
                document.getElementById('loading').textContent = 'Aucune donnée métabolomique trouvée. Utilisez le bouton "Charger données d\'exemple".';
                console.log('Aucune donnée trouvée dans localStorage ou les cookies');
            }
        } catch (error) {
            document.getElementById('loading').textContent = 'Erreur lors du chargement des données.';
            console.error('Erreur lors du chargement des données:', error);
        }
    }

    /**
     * @function getCookie
     * @memberof VisualisateurMetabolomique
     * @description Récupère la valeur d'un cookie spécifique
     * @param {string} name - Le nom du cookie à récupérer
     * @returns {string|null} La valeur du cookie ou null si non trouvé
     */
    function getCookie(name) {
        try {
            const cookieMatch = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
            if (cookieMatch) {
                console.log(`Cookie '${name}' trouvé:`, cookieMatch[2]);
                return cookieMatch[2];
            }
            console.log(`Cookie '${name}' non trouvé`);
            return null;
        } catch (error) {
            console.error(`Erreur lors de la récupération du cookie '${name}':`, error);
            return null;
        }
    }

    /**
     * @function setupInterface
     * @memberof VisualisateurMetabolomique
     * @description Configure l'interface utilisateur en fonction des données disponibles
     * @returns {void}
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
            
            // Ajouter toutes les colonnes numériques comme options
            state.data.columns.forEach(column => {
                // Vérifier si c'est une colonne numérique
                if (selectId !== 'color-by-select' && selectId !== 'filter-select' && 
                    !isNumericColumn(column)) return;
                
                const option = document.createElement('option');
                option.value = column;
                option.textContent = column;
                select.appendChild(option);
            });
        });
        
        // Définir les dimensions par défaut
        if (state.data.columns.length > 0) {
            const numericColumns = state.data.columns.filter(col => isNumericColumn(col));
            
            if (numericColumns.length >= 2) {
                state.dimensions.x = numericColumns[0];
                state.dimensions.y = numericColumns[1];
                
                document.getElementById('x-axis-select').value = state.dimensions.x;
                document.getElementById('y-axis-select').value = state.dimensions.y;
            }
        }
    }

    /**
     * @function isNumericColumn
     * @memberof VisualisateurMetabolomique
     * @description Vérifie si une colonne contient des données numériques
     * @param {string} columnName - Le nom de la colonne à vérifier
     * @returns {boolean} True si la colonne est numérique, sinon False
     */
    function isNumericColumn(columnName) {
        if (!state.data || !state.data.values || state.data.values.length === 0) return false;
        
        // Examiner quelques valeurs pour déterminer si la colonne est numérique
        for (let i = 0; i < Math.min(5, state.data.values.length); i++) {
            const value = state.data.values[i][columnName];
            if (value !== undefined && isNaN(parseFloat(value))) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * @function updateDataSummary
     * @memberof VisualisateurMetabolomique
     * @description Met à jour le résumé des données affichées
     * @returns {void}
     */
    function updateDataSummary() {
        const summaryElement = document.getElementById('data-summary');
        
        if (!state.data) {
            summaryElement.innerHTML = '<p>Aucune donnée disponible</p>';
            return;
        }
        
        // Créer un résumé basique des données
        const rowCount = state.data.values.length;
        const columnCount = state.data.columns.length;
        
        let html = `
            <p><strong>Nombre d'échantillons:</strong> ${rowCount}</p>
            <p><strong>Nombre de variables:</strong> ${columnCount}</p>
        `;
        
        // Ajouter des informations sur les filtres appliqués
        if (state.filters.length > 0) {
            html += '<p><strong>Filtres appliqués:</strong></p><ul>';
            state.filters.forEach(filter => {
                html += `<li>${filter.column} ${filter.operator} ${filter.value}</li>`;
            });
            html += '</ul>';
        }
        
        summaryElement.innerHTML = html;
    }

    /**
     * @function switchView
     * @memberof VisualisateurMetabolomique
     * @description Change le type de visualisation affichée
     * @param {string} viewType - Le type de visualisation ('scatter', 'heatmap', 'network', 'barplot')
     * @returns {void}
     */
    function switchView(viewType) {
        state.currentView = viewType;
        
        // Mettre à jour l'apparence des boutons
        const buttons = document.querySelectorAll('nav button');
        buttons.forEach(button => {
            if (button.id === `view-${viewType}`) {
                button.style.backgroundColor = '#2980b9';
            } else {
                button.style.backgroundColor = '#3498db';
            }
        });
        
        // Effacer la visualisation précédente
        const visualizationElement = document.getElementById('visualization');
        visualizationElement.innerHTML = '';
        
        // Afficher la visualisation appropriée
        document.getElementById('loading').style.display = 'none';
        visualizationElement.style.display = 'block';
        
        switch (viewType) {
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
            default:
                console.error('Type de visualisation non reconnu:', viewType);
        }
    }

    /**
     * @function updateVisualization
     * @memberof VisualisateurMetabolomique
     * @description Met à jour la visualisation avec les paramètres actuels
     * @returns {void}
     */
    function updateVisualization() {
        // Mettre à jour les dimensions sélectionnées
        state.dimensions.x = document.getElementById('x-axis-select').value;
        state.dimensions.y = document.getElementById('y-axis-select').value;
        state.dimensions.color = document.getElementById('color-by-select').value;
        
        // Redessiner la visualisation actuelle
        switchView(state.currentView);
    }

    /**
     * @function applyFilter
     * @memberof VisualisateurMetabolomique
     * @description Applique un filtre aux données
     * @returns {void}
     */
    function applyFilter() {
        const filterColumn = document.getElementById('filter-select').value;
        const filterValue = document.getElementById('filter-value').value;
        
        if (!filterColumn || !filterValue) return;
        
        // Ajouter un nouveau filtre
        state.filters.push({
            column: filterColumn,
            operator: '==',
            value: filterValue
        });
        
        // Mettre à jour le résumé et la visualisation
        updateDataSummary();
        switchView(state.currentView);
    }

    /**
     * @function getFilteredData
     * @memberof VisualisateurMetabolomique
     * @description Récupère les données filtrées selon les filtres appliqués
     * @returns {Array} Les données filtrées
     */
    function getFilteredData() {
        if (!state.data || !state.data.values) return [];
        
        let filteredData = [...state.data.values];
        
        // Appliquer tous les filtres
        state.filters.forEach(filter => {
            filteredData = filteredData.filter(item => {
                const value = item[filter.column];
                
                switch (filter.operator) {
                    case '==':
                        return value == filter.value;
                    case '>':
                        return parseFloat(value) > parseFloat(filter.value);
                    case '<':
                        return parseFloat(value) < parseFloat(filter.value);
                    default:
                        return true;
                }
            });
        });
        
        return filteredData;
    }

    /**
     * @function drawScatterPlot
     * @memberof VisualisateurMetabolomique
     * @description Dessine un graphique à dispersion avec D3.js
     * @returns {void}
     */
    function drawScatterPlot() {
        if (!state.dimensions.x || !state.dimensions.y) {
            document.getElementById('visualization').innerHTML = 
                '<p class="error">Veuillez sélectionner des dimensions pour les axes X et Y.</p>';
            return;
        }
        
        const container = document.getElementById('visualization');
        const filteredData = getFilteredData();
        
        if (filteredData.length === 0) {
            container.innerHTML = '<p class="error">Aucune donnée disponible pour l\'affichage.</p>';
            return;
        }
        
        // Définir les marges et dimensions du graphique
        const margin = { top: 40, right: 30, bottom: 60, left: 60 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;
        
        // Supprimer tout SVG existant
        d3.select(container).select('svg').remove();
        
        // Créer un élément SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        // Extraire les valeurs pour les axes x et y
        const xValues = filteredData.map(d => parseFloat(d[state.dimensions.x]));
        const yValues = filteredData.map(d => parseFloat(d[state.dimensions.y]));
        
        // Créer les échelles
        const xScale = d3.scaleLinear()
            .domain([d3.min(xValues) * 0.9, d3.max(xValues) * 1.1])
            .range([0, width]);
        
        const yScale = d3.scaleLinear()
            .domain([d3.min(yValues) * 0.9, d3.max(yValues) * 1.1])
            .range([height, 0]);
        
        // Ajouter les axes
        svg.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .append('text')
            .attr('class', 'axis-label')
            .attr('x', width / 2)
            .attr('y', 40)
            .attr('fill', '#000')
            .style('text-anchor', 'middle')
            .text(state.dimensions.x);
        
        svg.append('g')
            .attr('class', 'axis y-axis')
            .call(d3.axisLeft(yScale))
            .append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -40)
            .attr('fill', '#000')
            .style('text-anchor', 'middle')
            .text(state.dimensions.y);
        
        // Définir une échelle de couleur si une dimension de couleur est spécifiée
        let colorScale = null;
        
        if (state.dimensions.color) {
            const colorValues = filteredData.map(d => d[state.dimensions.color]);
            
            // Vérifier si les valeurs de couleur sont numériques
            const isNumeric = colorValues.every(val => !isNaN(parseFloat(val)));
            
            if (isNumeric) {
                // Échelle de couleur pour les valeurs numériques
                colorScale = d3.scaleSequential(d3.interpolateViridis)
                    .domain([
                        d3.min(colorValues, d => parseFloat(d)),
                        d3.max(colorValues, d => parseFloat(d))
                    ]);
            } else {
                // Échelle de couleur pour les valeurs catégorielles
                const uniqueValues = [...new Set(colorValues)];
                colorScale = d3.scaleOrdinal(d3.schemeCategory10)
                    .domain(uniqueValues);
            }
        }
        
        // Ajouter les points
        svg.selectAll('.point')
            .data(filteredData)
            .enter()
            .append('circle')
            .attr('class', 'point')
            .attr('cx', d => xScale(parseFloat(d[state.dimensions.x])))
            .attr('cy', d => yScale(parseFloat(d[state.dimensions.y])))
            .attr('r', 5)
            .attr('fill', d => {
                if (state.dimensions.color && colorScale) {
                    return colorScale(d[state.dimensions.color]);
                }
                return '#3498db';
            })
            .on('mouseover', function(event, d) {
                // Afficher une infobulle au survol
                const tooltip = d3.select(container)
                    .append('div')
                    .attr('class', 'tooltip')
                    .style('position', 'absolute')
                    .style('background', 'rgba(0, 0, 0, 0.7)')
                    .style('color', 'white')
                    .style('padding', '5px')
                    .style('border-radius', '5px')
                    .style('pointer-events', 'none')
                    .style('z-index', '10')
                    .style('left', `${event.pageX + 10}px`)
                    .style('top', `${event.pageY - 10}px`);
                
                let tooltipContent = `
                    <div><strong>${state.dimensions.x}:</strong> ${d[state.dimensions.x]}</div>
                    <div><strong>${state.dimensions.y}:</strong> ${d[state.dimensions.y]}</div>
                `;
                
                if (state.dimensions.color) {
                    tooltipContent += `<div><strong>${state.dimensions.color}:</strong> ${d[state.dimensions.color]}</div>`;
                }
                
                tooltip.html(tooltipContent);
                
                // Mettre en évidence le point
                d3.select(this)
                    .attr('stroke', '#000')
                    .attr('stroke-width', 2)
                    .attr('r', 7);
            })
            .on('mouseout', function() {
                // Supprimer l'infobulle
                d3.select(container).select('.tooltip').remove();
                
                // Restaurer l'apparence du point
                d3.select(this)
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 0.5)
                    .attr('r', 5);
            });
        
        // Ajouter une légende si une dimension de couleur est spécifiée
        if (state.dimensions.color && colorScale) {
            const isNumeric = filteredData.every(d => !isNaN(parseFloat(d[state.dimensions.color])));
            
            if (isNumeric) {
                // Légende pour les valeurs numériques (gradient)
                const legendWidth = 200;
                const legendHeight = 20;
                
                const legendX = width - legendWidth;
                const legendY = 0;
                
                const defs = svg.append('defs');
                
                const linearGradient = defs.append('linearGradient')
                    .attr('id', 'linear-gradient');
                
                linearGradient.selectAll('stop')
                    .data(d3.range(0, 1.1, 0.1))
                    .enter().append('stop')
                    .attr('offset', d => d)
                    .attr('stop-color', d => colorScale(d3.min(filteredData, e => parseFloat(e[state.dimensions.color])) + 
                        d * (d3.max(filteredData, e => parseFloat(e[state.dimensions.color])) - 
                            d3.min(filteredData, e => parseFloat(e[state.dimensions.color])))
                    ));
                
                svg.append('rect')
                    .attr('x', legendX)
                    .attr('y', legendY)
                    .attr('width', legendWidth)
                    .attr('height', legendHeight)
                    .style('fill', 'url(#linear-gradient)');
                
                svg.append('text')
                    .attr('class', 'legend-title')
                    .attr('x', legendX + legendWidth / 2)
                    .attr('y', legendY - 5)
                    .style('text-anchor', 'middle')
                    .text(state.dimensions.color);
                
                svg.append('text')
                    .attr('x', legendX)
                    .attr('y', legendY + legendHeight + 15)
                    .style('text-anchor', 'start')
                    .text(d3.min(filteredData, d => parseFloat(d[state.dimensions.color])).toFixed(2));
                
                svg.append('text')
                    .attr('x', legendX + legendWidth)
                    .attr('y', legendY + legendHeight + 15)
                    .style('text-anchor', 'end')
                    .text(d3.max(filteredData, d => parseFloat(d[state.dimensions.color])).toFixed(2));
            } else {
                // Légende pour les valeurs catégorielles
                const legendX = width - 150;
                const legendY = 0;
                
                const uniqueValues = [...new Set(filteredData.map(d => d[state.dimensions.color]))];
                
                svg.append('text')
                    .attr('class', 'legend-title')
                    .attr('x', legendX)
                    .attr('y', legendY - 5)
                    .text(state.dimensions.color);
                
                const legend = svg.selectAll('.legend')
                    .data(uniqueValues)
                    .enter()
                    .append('g')
                    .attr('class', 'legend')
                    .attr('transform', (d, i) => `translate(${legendX}, ${legendY + i * 20})`);
                
                legend.append('rect')
                    .attr('width', 15)
                    .attr('height', 15)
                    .attr('fill', d => colorScale(d));
                
                legend.append('text')
                    .attr('x', 20)
                    .attr('y', 12)
                    .text(d => d);
            }
        }
    }

    /**
     * @function drawHeatmap
     * @memberof VisualisateurMetabolomique
     * @description Dessine une carte de chaleur avec D3.js
     * @returns {void}
     */
    function drawHeatmap() {
        const container = document.getElementById('visualization');
        const filteredData = getFilteredData();
        
        if (filteredData.length === 0 || state.data.columns.length === 0) {
            container.innerHTML = '<p class="error">Aucune donnée disponible pour l\'affichage.</p>';
            return;
        }
        
        // Déterminer les colonnes numériques à inclure dans la carte de chaleur
        const numericColumns = state.data.columns.filter(col => isNumericColumn(col));
        
        if (numericColumns.length < 2) {
            container.innerHTML = '<p class="error">Il faut au moins 2 colonnes numériques pour générer une carte de chaleur.</p>';
            return;
        }
        
        // Définir les marges et dimensions
        const margin = { top: 80, right: 30, bottom: 100, left: 100 };
        const width = container.clientWidth - margin.left - margin.right;
        const cellSize = 25;
        
        // Calculer la hauteur en fonction du nombre d'échantillons
        const maxSamples = 30; // Limiter le nombre d'échantillons à afficher
        const samples = filteredData.slice(0, maxSamples);
        const height = samples.length * cellSize;
        
        // Supprimer tout SVG existant
        d3.select(container).select('svg').remove();
        
        // Créer un élément SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        // Transformer les données pour la carte de chaleur
        // Pour chaque échantillon, extraire les valeurs des colonnes numériques
        const heatmapData = [];
        
        samples.forEach((sample, i) => {
            numericColumns.forEach((column, j) => {
                heatmapData.push({
                    sample: i,
                    metabolite: j,
                    value: parseFloat(sample[column]),
                    sampleName: `Échantillon ${i + 1}`,
                    metaboliteName: column
                });
            });
        });
        
        // Créer les échelles
        const xScale = d3.scaleBand()
            .domain(d3.range(numericColumns.length))
            .range([0, Math.min(width, numericColumns.length * cellSize)])
            .padding(0.05);
        
        const yScale = d3.scaleBand()
            .domain(d3.range(samples.length))
            .range([0, height])
            .padding(0.05);
        
        // Déterminer les valeurs min et max pour l'échelle de couleur
        const minValue = d3.min(heatmapData, d => d.value);
        const maxValue = d3.max(heatmapData, d => d.value);
        
        // Créer l'échelle de couleur
        const colorScale = d3.scaleSequential(d3.interpolateViridis)
            .domain([minValue, maxValue]);
        
        // Dessiner les cellules de la carte de chaleur
        svg.selectAll('rect')
            .data(heatmapData)
            .enter()
            .append('rect')
            .attr('class', 'heatmap-cell')
            .attr('x', d => xScale(d.metabolite))
            .attr('y', d => yScale(d.sample))
            .attr('width', xScale.bandwidth())
            .attr('height', yScale.bandwidth())
            .attr('fill', d => colorScale(d.value))
            .on('mouseover', function(event, d) {
                // Afficher une infobulle au survol
                const tooltip = d3.select(container)
                    .append('div')
                    .attr('class', 'tooltip')
                    .style('position', 'absolute')
                    .style('background', 'rgba(0, 0, 0, 0.7)')
                    .style('color', 'white')
                    .style('padding', '5px')
                    .style('border-radius', '5px')
                    .style('pointer-events', 'none')
                    .style('z-index', '10')
                    .style('left', `${event.pageX + 10}px`)
                    .style('top', `${event.pageY - 10}px`);
                
                tooltip.html(`
                    <div><strong>Échantillon:</strong> ${d.sampleName}</div>
                    <div><strong>Métabolite:</strong> ${d.metaboliteName}</div>
                    <div><strong>Valeur:</strong> ${d.value.toFixed(3)}</div>
                `);
                
                // Mettre en évidence la cellule
                d3.select(this)
                    .attr('stroke', '#000')
                    .attr('stroke-width', 2);
            })
            .on('mouseout', function() {
                // Supprimer l'infobulle
                d3.select(container).select('.tooltip').remove();
                
                // Restaurer l'apparence de la cellule
                d3.select(this)
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 0.5);
            });
        
        // Ajouter les étiquettes pour les métabolites (colonnes)
        svg.selectAll('.metabolite-label')
            .data(numericColumns)
            .enter()
            .append('text')
            .attr('class', 'metabolite-label')
            .attr('x', (d, i) => xScale(i) + xScale.bandwidth() / 2)
            .attr('y', -10)
            .attr('transform', (d, i) => `rotate(-45, ${xScale(i) + xScale.bandwidth() / 2}, -10)`)
            .style('text-anchor', 'end')
            .style('font-size', '10px')
            .text(d => d);
        
        // Ajouter les étiquettes pour les échantillons (lignes)
        svg.selectAll('.sample-label')
            .data(samples)
            .enter()
            .append('text')
            .attr('class', 'sample-label')
            .attr('x', -5)
            .attr('y', (d, i) => yScale(i) + yScale.bandwidth() / 2)
            .style('text-anchor', 'end')
            .style('font-size', '10px')
            .style('alignment-baseline', 'middle')
            .text((d, i) => `Échantillon ${i + 1}`);
        
        // Ajouter une légende pour l'échelle de couleur
        const legendWidth = 200;
        const legendHeight = 20;
        
        const legendX = 0;
        const legendY = height + 40;
        
        const defs = svg.append('defs');
        
        const linearGradient = defs.append('linearGradient')
            .attr('id', 'heatmap-gradient');
        
        linearGradient.selectAll('stop')
            .data(d3.range(0, 1.1, 0.1))
            .enter().append('stop')
            .attr('offset', d => d)
            .attr('stop-color', d => colorScale(minValue + d * (maxValue - minValue)));
        
        svg.append('rect')
            .attr('x', legendX)
            .attr('y', legendY)
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .style('fill', 'url(#heatmap-gradient)');
        
        svg.append('text')
            .attr('class', 'legend-title')
            .attr('x', legendX + legendWidth / 2)
            .attr('y', legendY - 5)
            .style('text-anchor', 'middle')
            .text('Valeur');
        
        svg.append('text')
            .attr('x', legendX)
            .attr('y', legendY + legendHeight + 15)
            .style('text-anchor', 'start')
            .text(minValue.toFixed(2));
        
        svg.append('text')
            .attr('x', legendX + legendWidth)
            .attr('y', legendY + legendHeight + 15)
            .style('text-anchor', 'end')
            .text(maxValue.toFixed(2));
        
        // Ajouter un titre à la carte de chaleur
        svg.append('text')
            .attr('x', (Math.min(width, numericColumns.length * cellSize)) / 2)
            .attr('y', -50)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .text('Carte de chaleur des données métabolomiques');
    }

    /**
     * @function drawNetwork
     * @memberof VisualisateurMetabolomique
     * @description Dessine un réseau d'interactions entre métabolites avec D3.js
     * @returns {void}
     */
    function drawNetwork() {
        const container = document.getElementById('visualization');
        const filteredData = getFilteredData();
        
        if (filteredData.length === 0) {
            container.innerHTML = '<p class="error">Aucune donnée disponible pour l\'affichage.</p>';
            return;
        }
        
        // Déterminer les colonnes numériques
        const numericColumns = state.data.columns.filter(col => isNumericColumn(col));
        
        if (numericColumns.length < 3) {
            container.innerHTML = '<p class="error">Il faut au moins 3 colonnes numériques pour générer un réseau d\'interactions.</p>';
            return;
        }
        
        // Définir les marges et dimensions
        const margin = { top: 40, right: 40, bottom: 40, left: 40 };
        const width = Math.min(container.clientWidth - margin.left - margin.right, 800);
        const height = 600 - margin.top - margin.bottom;
        
        // Supprimer tout SVG existant
        d3.select(container).select('svg').remove();
        
        // Créer un élément SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        // Créer les nœuds (métabolites) et les liens
        // Pour simplifier, chaque colonne numérique devient un nœud
        // Les liens sont créés en fonction de la corrélation entre les métabolites
        
        // Créer les nœuds
        const nodes = numericColumns.map(column => {
            return {
                id: column,
                group: 1,
                radius: 8
            };
        });
        
        // Calculer les corrélations entre les métabolites pour établir les liens
        const links = [];
        
        for (let i = 0; i < numericColumns.length; i++) {
            for (let j = i + 1; j < numericColumns.length; j++) {
                const col1 = numericColumns[i];
                const col2 = numericColumns[j];
                
                // Calculer la corrélation de Pearson
                const correlation = calculateCorrelation(filteredData, col1, col2);
                
                // Ne créer un lien que si la corrélation est suffisamment forte
                if (Math.abs(correlation) > 0.3) {
                    links.push({
                        source: col1,
                        target: col2,
                        value: Math.abs(correlation),
                        sign: correlation > 0 ? 1 : -1
                    });
                }
            }
        }
        
        // Créer une simulation de force D3
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(d => 100 * (1 - d.value)))
            .force('charge', d3.forceManyBody().strength(-200))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(d => d.radius + 5));
        
        // Dessiner les liens
        const link = svg.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(links)
            .enter().append('line')
            .attr('stroke-width', d => Math.max(1, d.value * 5))
            .attr('stroke', d => d.sign > 0 ? '#1a9850' : '#d73027') // Vert pour positif, rouge pour négatif
            .attr('stroke-opacity', 0.6)
            .on('mouseover', function(event, d) {
                // Afficher une infobulle au survol
                const tooltip = d3.select(container)
                    .append('div')
                    .attr('class', 'tooltip')
                    .style('position', 'absolute')
                    .style('background', 'rgba(0, 0, 0, 0.7)')
                    .style('color', 'white')
                    .style('padding', '5px')
                    .style('border-radius', '5px')
                    .style('pointer-events', 'none')
                    .style('z-index', '10')
                    .style('left', `${event.pageX + 10}px`)
                    .style('top', `${event.pageY - 10}px`);
                
                tooltip.html(`
                    <div><strong>${d.source.id} — ${d.target.id}</strong></div>
                    <div>Corrélation: ${(d.value * d.sign).toFixed(3)}</div>
                `);
                
                // Mettre en évidence le lien
                d3.select(this)
                    .attr('stroke-width', d.value * 8)
                    .attr('stroke-opacity', 1);
            })
            .on('mouseout', function(event, d) {
                // Supprimer l'infobulle
                d3.select(container).select('.tooltip').remove();
                
                // Restaurer l'apparence du lien
                d3.select(this)
                    .attr('stroke-width', d.value * 5)
                    .attr('stroke-opacity', 0.6);
            });
        
        // Dessiner les nœuds
        const node = svg.append('g')
            .attr('class', 'nodes')
            .selectAll('circle')
            .data(nodes)
            .enter().append('circle')
            .attr('r', d => d.radius)
            .attr('fill', '#3498db')
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5)
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended))
            .on('mouseover', function(event, d) {
                // Afficher une infobulle au survol
                const tooltip = d3.select(container)
                    .append('div')
                    .attr('class', 'tooltip')
                    .style('position', 'absolute')
                    .style('background', 'rgba(0, 0, 0, 0.7)')
                    .style('color', 'white')
                    .style('padding', '5px')
                    .style('border-radius', '5px')
                    .style('pointer-events', 'none')
                    .style('z-index', '10')
                    .style('left', `${event.pageX + 10}px`)
                    .style('top', `${event.pageY - 10}px`);
                
                tooltip.html(`<div><strong>${d.id}</strong></div>`);
                
                // Mettre en évidence le nœud et ses connexions
                d3.select(this)
                    .attr('r', d.radius * 1.5)
                    .attr('stroke', '#000');
                
                link.style('stroke-opacity', o => {
                    return o.source.id === d.id || o.target.id === d.id ? 1 : 0.1;
                });
                
                link.style('stroke-width', o => {
                    return o.source.id === d.id || o.target.id === d.id ? 
                        Math.max(2, o.value * 8) : Math.max(1, o.value * 2);
                });
            })
            .on('mouseout', function(event, d) {
                // Supprimer l'infobulle
                d3.select(container).select('.tooltip').remove();
                
                // Restaurer l'apparence du nœud et des liens
                d3.select(this)
                    .attr('r', d.radius)
                    .attr('stroke', '#fff');
                
                link.style('stroke-opacity', 0.6);
                link.style('stroke-width', d => Math.max(1, d.value * 5));
            });
        
        // Ajouter des étiquettes aux nœuds
        const labels = svg.append('g')
            .attr('class', 'labels')
            .selectAll('text')
            .data(nodes)
            .enter().append('text')
            .attr('dy', 3)
            .style('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('pointer-events', 'none')
            .text(d => d.id);
        
        // Fonction d'animation de la simulation
        simulation.on('tick', () => {
            link
                .attr('x1', d => Math.max(d.source.radius, Math.min(width - d.source.radius, d.source.x)))
                .attr('y1', d => Math.max(d.source.radius, Math.min(height - d.source.radius, d.source.y)))
                .attr('x2', d => Math.max(d.target.radius, Math.min(width - d.target.radius, d.target.x)))
                .attr('y2', d => Math.max(d.target.radius, Math.min(height - d.target.radius, d.target.y)));
            
            node
                .attr('cx', d => Math.max(d.radius, Math.min(width - d.radius, d.x)))
                .attr('cy', d => Math.max(d.radius, Math.min(height - d.radius, d.y)));
            
            labels
                .attr('x', d => Math.max(d.radius, Math.min(width - d.radius, d.x)))
                .attr('y', d => Math.max(d.radius, Math.min(height - d.radius, d.y - 15)));
        });
        
        // Fonctions de glisser-déposer
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
        
        // Ajouter un titre
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .text('Réseau d\'interactions métabolomiques');
        
        // Ajouter une légende
        const legendX = 10;
        const legendY = height - 60;
        
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${legendX}, ${legendY})`);
        
        // Légende pour la corrélation positive
        legend.append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', 20)
            .attr('y2', 0)
            .attr('stroke', '#1a9850')
            .attr('stroke-width', 2);
        
        legend.append('text')
            .attr('x', 25)
            .attr('y', 4)
            .style('font-size', '12px')
            .text('Corrélation positive');
        
        // Légende pour la corrélation négative
        legend.append('line')
            .attr('x1', 0)
            .attr('y1', 20)
            .attr('x2', 20)
            .attr('y2', 20)
            .attr('stroke', '#d73027')
            .attr('stroke-width', 2);
        
        legend.append('text')
            .attr('x', 25)
            .attr('y', 24)
            .style('font-size', '12px')
            .text('Corrélation négative');
    }
    
    /**
     * @function drawBarPlot
     * @memberof VisualisateurMetabolomique
     * @description Dessine un diagramme à barres avec D3.js
     * @returns {void}
     */
    function drawBarPlot() {
        if (!state.dimensions.x) {
            document.getElementById('visualization').innerHTML = 
                '<p class="error">Veuillez sélectionner une dimension pour l\'axe X.</p>';
            return;
        }
        
        const container = document.getElementById('visualization');
        const filteredData = getFilteredData();
        
        if (filteredData.length === 0) {
            container.innerHTML = '<p class="error">Aucune donnée disponible pour l\'affichage.</p>';
            return;
        }
        
        // Définir les marges et dimensions
        const margin = { top: 40, right: 30, bottom: 60, left: 60 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;
        
        // Supprimer tout SVG existant
        d3.select(container).select('svg').remove();
        
        // Créer un élément SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        // Extraire les valeurs
        const values = filteredData.map(d => parseFloat(d[state.dimensions.x]));
        
        // Déterminer les statistiques descriptives
        const mean = d3.mean(values);
        const median = d3.median(values);
        const min = d3.min(values);
        const max = d3.max(values);
        const q1 = d3.quantile(values.sort(d3.ascending), 0.25);
        const q3 = d3.quantile(values.sort(d3.ascending), 0.75);
        
        // Créer un histogramme avec D3
        const histogram = d3.histogram()
            .domain([min * 0.9, max * 1.1])
            .thresholds(15)
            (values);
        
        // Créer les échelles
        const xScale = d3.scaleLinear()
            .domain([min * 0.9, max * 1.1])
            .range([0, width]);
        
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(histogram, d => d.length)])
            .range([height, 0]);
        
        // Ajouter les axes
        svg.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .append('text')
            .attr('class', 'axis-label')
            .attr('x', width / 2)
            .attr('y', 40)
            .attr('fill', '#000')
            .style('text-anchor', 'middle')
            .text(state.dimensions.x);
        
        svg.append('g')
            .attr('class', 'axis y-axis')
            .call(d3.axisLeft(yScale))
            .append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -40)
            .attr('fill', '#000')
            .style('text-anchor', 'middle')
            .text('Fréquence');
        
        // Dessiner les barres
        svg.selectAll('.bar')
            .data(histogram)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.x0))
            .attr('y', d => yScale(d.length))
            .attr('width', d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 1))
            .attr('height', d => height - yScale(d.length))
            .attr('fill', '#3498db')
            .on('mouseover', function(event, d) {
                // Afficher une infobulle au survol
                const tooltip = d3.select(container)
                    .append('div')
                    .attr('class', 'tooltip')
                    .style('position', 'absolute')
                    .style('background', 'rgba(0, 0, 0, 0.7)')
                    .style('color', 'white')
                    .style('padding', '5px')
                    .style('border-radius', '5px')
                    .style('pointer-events', 'none')
                    .style('z-index', '10')
                    .style('left', `${event.pageX + 10}px`)
                    .style('top', `${event.pageY - 10}px`);
                
                tooltip.html(`
                    <div><strong>Plage:</strong> ${d.x0.toFixed(2)} - ${d.x1.toFixed(2)}</div>
                    <div><strong>Fréquence:</strong> ${d.length}</div>
                    <div><strong>Pourcentage:</strong> ${(d.length / filteredData.length * 100).toFixed(1)}%</div>
                `);
                
                // Mettre en évidence la barre
                d3.select(this)
                    .attr('fill', '#2980b9');
            })
            .on('mouseout', function() {
                // Supprimer l'infobulle
                d3.select(container).select('.tooltip').remove();
                
                // Restaurer l'apparence de la barre
                d3.select(this)
                    .attr('fill', '#3498db');
            });
        
        // Ajouter une ligne pour la moyenne
        svg.append('line')
            .attr('class', 'mean-line')
            .attr('x1', xScale(mean))
            .attr('y1', 0)
            .attr('x2', xScale(mean))
            .attr('y2', height)
            .attr('stroke', '#e74c3c')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');
        
        // Ajouter une ligne pour la médiane
        svg.append('line')
            .attr('class', 'median-line')
            .attr('x1', xScale(median))
            .attr('y1', 0)
            .attr('x2', xScale(median))
            .attr('y2', height)
            .attr('stroke', '#2ecc71')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');
        
        // Ajouter les statistiques descriptives
        const stats = svg.append('g')
            .attr('class', 'stats')
            .attr('transform', `translate(${width - 200}, 20)`);
        
        stats.append('text')
            .attr('x', 0)
            .attr('y', 0)
            .style('font-weight', 'bold')
            .text('Statistiques:');
        
        stats.append('text')
            .attr('x', 0)
            .attr('y', 20)
            .text(`Moyenne: ${mean.toFixed(3)}`);
        
        stats.append('text')
            .attr('x', 0)
            .attr('y', 40)
            .text(`Médiane: ${median.toFixed(3)}`);
        
        stats.append('text')
            .attr('x', 0)
            .attr('y', 60)
            .text(`Min: ${min.toFixed(3)}`);
        
        stats.append('text')
            .attr('x', 0)
            .attr('y', 80)
            .text(`Max: ${max.toFixed(3)}`);
        
        stats.append('text')
            .attr('x', 0)
            .attr('y', 100)
            .text(`Q1: ${q1.toFixed(3)}`);
        
        stats.append('text')
            .attr('x', 0)
            .attr('y', 120)
            .text(`Q3: ${q3.toFixed(3)}`);
        
        // Ajouter une légende pour les lignes
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(20, 20)`);
        
        // Légende pour la moyenne
        legend.append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', 20)
            .attr('y2', 0)
            .attr('stroke', '#e74c3c')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');
        
        legend.append('text')
            .attr('x', 25)
            .attr('y', 4)
            .style('font-size', '12px')
            .text('Moyenne');
        
        // Légende pour la médiane
        legend.append('line')
            .attr('x1', 0)
            .attr('y1', 20)
            .attr('x2', 20)
            .attr('y2', 20)
            .attr('stroke', '#2ecc71')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');
        
        legend.append('text')
            .attr('x', 25)
            .attr('y', 24)
            .style('font-size', '12px')
            .text('Médiane');
        
        // Ajouter un titre
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .text(`Distribution de ${state.dimensions.x}`);
    }
    
    /**
     * @function calculateCorrelation
     * @memberof VisualisateurMetabolomique
     * @description Calcule le coefficient de corrélation de Pearson entre deux variables
     * @param {Array} data - Les données
     * @param {string} col1 - Le nom de la première colonne
     * @param {string} col2 - Le nom de la deuxième colonne
     * @returns {number} Le coefficient de corrélation de Pearson
     */
    function calculateCorrelation(data, col1, col2) {
        // Extraire les valeurs des deux colonnes
        const values1 = data.map(d => parseFloat(d[col1]));
        const values2 = data.map(d => parseFloat(d[col2]));
        
        // Calculer les moyennes
        const mean1 = d3.mean(values1);
        const mean2 = d3.mean(values2);
        
        // Calculer la covariance et les écarts types
        let covariance = 0;
        let variance1 = 0;
        let variance2 = 0;
        
        for (let i = 0; i < values1.length; i++) {
            const diff1 = values1[i] - mean1;
            const diff2 = values2[i] - mean2;
            
            covariance += diff1 * diff2;
            variance1 += diff1 * diff1;
            variance2 += diff2 * diff2;
        }
        
        // Normaliser
        covariance /= values1.length;
        variance1 /= values1.length;
        variance2 /= values1.length;
        
        // Calculer les écarts types
        const stdDev1 = Math.sqrt(variance1);
        const stdDev2 = Math.sqrt(variance2);
        
        // Calculer la corrélation
        return covariance / (stdDev1 * stdDev2);
    }

    /**
     * @function selectDefaultDimensions
     * @memberof VisualisateurMetabolomique
     * @description Sélectionne automatiquement des dimensions par défaut et force la mise à jour de la visualisation
     * @returns {void}
     */
    function selectDefaultDimensions() {
        try {
            console.log("Sélection automatique des dimensions...");
            
            // Récupérer les sélecteurs
            const xAxisSelect = document.getElementById('x-axis-select');
            const yAxisSelect = document.getElementById('y-axis-select');
            const colorSelect = document.getElementById('color-by-select');
            
            // Sélectionner les dimensions par défaut si nécessaire
            if (xAxisSelect && xAxisSelect.options.length > 0 && !state.dimensions.x) {
                xAxisSelect.selectedIndex = 0;
                state.dimensions.x = xAxisSelect.value;
                console.log("Dimension X sélectionnée:", state.dimensions.x);
            }
            
            if (yAxisSelect && yAxisSelect.options.length > 1 && !state.dimensions.y) {
                yAxisSelect.selectedIndex = 1;
                state.dimensions.y = yAxisSelect.value;
                console.log("Dimension Y sélectionnée:", state.dimensions.y);
            }
            
            if (colorSelect && colorSelect.options.length > 0) {
                // Chercher l'option "groupe" pour la coloration
                for (let i = 0; i < colorSelect.options.length; i++) {
                    if (colorSelect.options[i].value === 'groupe') {
                        colorSelect.selectedIndex = i;
                        state.dimensions.color = 'groupe';
                        console.log("Dimension couleur sélectionnée: groupe");
                        break;
                    }
                }
            }
            
            // Déclencher le changement de vue
            switchView('scatter');
            console.log("Visualisation par défaut activée: scatter");
        } catch (error) {
            console.error("Erreur lors de la sélection des dimensions par défaut:", error);
        }
    }

    // Initialiser le visualisateur lorsque la page est chargée
    window.addEventListener('DOMContentLoaded', init);

    // Retourner l'API publique
    return {
        init: init,
        switchView: switchView
    };
})();