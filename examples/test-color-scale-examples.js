/**
 * Exemples de test pour ColorScaleCalculator
 * À utiliser dans la console ou comme référence
 */

// Import du ColorScaleCalculator (si utilisé en module)
// import { ColorScaleCalculator } from '../components/ColorScaleCalculator.js';

// === TESTS ORDINAL ===

// Test 1: Blues ordinal (d3.schemeBlues)
function testBluesOrdinal() {
    console.log("🔵 Test: Blues Ordinal");
    
    const calculator = new ColorScaleCalculator();
    const result = calculator.createColorScale({
        domain: ["uri", "literal", "blank"],
        range: "Blues",  // Sera converti en d3.schemeBlues
        dataKeys: ["uri", "literal", "blank"],
        scaleType: "ordinal",
        label: "Blues-Test"
    });
    
    console.log("Domain:", result.domain);
    console.log("Range:", result.range);
    console.log("Scale type:", result.scale.constructor.name);
    return result;
}

// Test 1b: Blues avec index spécifique (d3.schemeBlues[5])
function testBluesOrdinalWithIndex() {
    console.log("🔵 Test: Blues[5] Ordinal avec Index");
    
    const calculator = new ColorScaleCalculator();
    const result = calculator.createColorScale({
        domain: ["A", "B", "C", "D", "E"],
        range: "Blues[5]",  // Sera converti en d3.schemeBlues[5]
        dataKeys: ["A", "B", "C", "D", "E"],
        scaleType: "ordinal",
        label: "Blues-Index-Test"
    });
    
    console.log("Domain:", result.domain);
    console.log("Range:", result.range);
    console.log("Scale type:", result.scale.constructor.name);
    return result;
}

// Test 2: Set1 ordinal (schéma qualitatif)
function testSet1Ordinal() {
    console.log("🎨 Test: Set1 Ordinal");
    
    const calculator = new ColorScaleCalculator();
    const result = calculator.createColorScale({
        domain: ["protein", "gene", "pathway", "disease"],
        range: "Set1",  // Sera converti en d3.schemeSet1
        dataKeys: ["protein", "gene", "pathway", "disease"],
        scaleType: "ordinal",
        label: "Set1-Test"
    });
    
    console.log("Domain:", result.domain);
    console.log("Range:", result.range);
    return result;
}

// Test 3: Category10 ordinal
function testCategory10Ordinal() {
    console.log("📊 Test: Category10 Ordinal");
    
    const calculator = new ColorScaleCalculator();
    const result = calculator.createColorScale({
        domain: ["UniProt", "Ensembl", "GO", "KEGG", "Reactome"],
        range: "Category10",  // Sera converti en d3.schemeCategory10
        dataKeys: ["UniProt", "Ensembl", "GO", "KEGG", "Reactome"],
        scaleType: "ordinal",
        label: "Category10-Test"
    });
    
    console.log("Domain:", result.domain);
    console.log("Range:", result.range);
    return result;
}

// === TESTS QUANTITATIVE ===

// Test 4: Blues quantitative (d3.interpolateBlues)
function testBluesQuantitative() {
    console.log("🌊 Test: Blues Quantitative");
    
    const calculator = new ColorScaleCalculator();
    const result = calculator.createColorScale({
        domain: [0, 100],
        range: "Blues",  // Sera converti en d3.interpolateBlues
        dataKeys: [0, 25, 50, 75, 100],
        scaleType: "quantitative",
        label: "Blues-Quantitative"
    });
    
    console.log("Domain:", result.domain);
    console.log("Range:", result.range);
    console.log("Scale type:", result.scale.constructor.name);
    return result;
}

// Test 5: Viridis quantitative
function testViridisQuantitative() {
    console.log("💚 Test: Viridis Quantitative");
    
    const calculator = new ColorScaleCalculator();
    const result = calculator.createColorScale({
        domain: [0, 1],
        range: "Viridis",  // Sera converti en d3.interpolateViridis
        dataKeys: [0, 0.25, 0.5, 0.75, 1],
        scaleType: "quantitative",
        label: "Viridis-Quantitative"
    });
    
    console.log("Domain:", result.domain);
    console.log("Range:", result.range);
    return result;
}

// Test 6: RdYlBu divergent quantitative
function testRdYlBuQuantitative() {
    console.log("🔴🟡🔵 Test: RdYlBu Quantitative (Divergent)");
    
    const calculator = new ColorScaleCalculator();
    const result = calculator.createColorScale({
        domain: [-1, 1],
        range: "RdYlBu",  // Sera converti en d3.interpolateRdYlBu
        dataKeys: [-1, -0.5, 0, 0.5, 1],
        scaleType: "quantitative",
        label: "RdYlBu-Divergent"
    });
    
    console.log("Domain:", result.domain);
    console.log("Range:", result.range);
    return result;
}

// === TESTS DE CAS LIMITES ===

// Test 7: Schéma inexistant (fallback)
function testSchemaInexistant() {
    console.log("❓ Test: Schéma Inexistant (Fallback)");
    
    const calculator = new ColorScaleCalculator();
    const result = calculator.createColorScale({
        domain: ["test1", "test2"],
        range: "SchemaInexistant",  // N'existe pas dans D3
        dataKeys: ["test1", "test2"],
        scaleType: "ordinal",
        label: "Fallback-Test"
    });
    
    console.log("Domain:", result.domain);
    console.log("Range (fallback):", result.range);
    return result;
}

// Test 8: Domain vide (calcul automatique)
function testDomainVide() {
    console.log("📭 Test: Domain Vide (Auto-calcul)");
    
    const calculator = new ColorScaleCalculator();
    const result = calculator.createColorScale({
        domain: [],  // Vide
        range: "Blues",
        dataKeys: ["auto1", "auto2", "auto3"],  // Sera utilisé comme domain
        scaleType: "ordinal",
        label: "Auto-Domain-Test"
    });
    
    console.log("Domain (auto):", result.domain);
    console.log("Range:", result.range);
    return result;
}

// Test 9: Range déjà sous forme d'array
function testRangeArray() {
    console.log("🎨 Test: Range Array (Pas de parsing)");
    
    const calculator = new ColorScaleCalculator();
    const result = calculator.createColorScale({
        domain: ["active", "inactive"],
        range: ["#ff0000", "#00ff00"],  // Déjà un array, pas de parsing
        dataKeys: ["active", "inactive"],
        scaleType: "ordinal",
        label: "Array-Range-Test"
    });
    
    console.log("Domain:", result.domain);
    console.log("Range (array):", result.range);
    return result;
}

// Test 9b: Test des utilitaires de couleur
function testColorUtilities() {
    console.log("🌈 Test: Utilitaires de Couleur");
    
    const calculator = new ColorScaleCalculator();
    
    // Test conversion hex vers RGB
    const rgbColor = calculator.hexToRgb("#ff5733");
    console.log("Hex #ff5733 → RGB:", rgbColor);
    
    // Test conversion RGB vers hex
    const hexColor = calculator.rgbToHex(255, 87, 51);
    console.log("RGB(255, 87, 51) → Hex:", hexColor);
    
    // Test recherche d'indices
    const testArray = ["A", "B", "A", "C", "A"];
    const indices = calculator.getAllIndexes(testArray, "A");
    console.log("Indices de 'A' dans", testArray, ":", indices);
    
    return { rgbColor, hexColor, indices };
}

// Test 9c: Test parsing case-insensitive
function testCaseInsensitiveParsing() {
    console.log("🔤 Test: Parsing Case-Insensitive");
    
    const calculator = new ColorScaleCalculator();
    
    // Test avec différentes casses
    const tests = ["blues", "BLUES", "Blues", "bLuEs", "category10", "CATEGORY10"];
    const results = {};
    
    tests.forEach(testName => {
        const parsed = calculator.parseD3ColorScheme(testName);
        results[testName] = parsed ? parsed.type : "null";
        console.log(`"${testName}" → ${results[testName]}`);
    });
    
    return results;
}

// === TESTS D'ENCODING COMPLET ===

// Test 10: Encoding avec vis-graph configuration
function testEncodingComplet() {
    console.log("🔧 Test: Encoding Complet pour vis-graph");
    
    const encoding = {
        "nodes": {
            "color": {
                "field": "type",
                "scale": {
                    "type": "ordinal",
                    "domain": ["protein", "metabolite", "pathway"],
                    "range": "Set1"  // Sera automatiquement parsé
                }
            },
            "size": {
                "field": "degree",
                "scale": {
                    "type": "linear",
                    "domain": [1, 50],
                    "range": [5, 30]
                }
            }
        },
        "links": {
            "color": {
                "field": "confidence",
                "scale": {
                    "type": "quantitative",
                    "domain": [0, 1],
                    "range": "Blues"  // Sera automatiquement parsé
                }
            }
        }
    };
    
    console.log("Encoding complet:", encoding);
    
    // Test des deux palettes de couleur
    const calculator = new ColorScaleCalculator();
    
    // Test nodes color
    const nodesColorResult = calculator.createColorScale({
        domain: encoding.nodes.color.scale.domain,
        range: encoding.nodes.color.scale.range,
        dataKeys: encoding.nodes.color.scale.domain,
        scaleType: encoding.nodes.color.scale.type,
        label: "Nodes-Color"
    });
    
    // Test links color
    const linksColorResult = calculator.createColorScale({
        domain: encoding.links.color.scale.domain,
        range: encoding.links.color.scale.range,
        dataKeys: [0, 0.2, 0.4, 0.6, 0.8, 1],
        scaleType: encoding.links.color.scale.type,
        label: "Links-Color"
    });
    
    console.log("Nodes colors:", nodesColorResult.range);
    console.log("Links colors:", linksColorResult.range);
    
    return { nodes: nodesColorResult, links: linksColorResult };
}

// === FONCTION DE TEST GLOBAL ===
function runAllTests() {
    console.log("🚀 === LANCEMENT DE TOUS LES TESTS ColorScaleCalculator ===");
    
    const tests = [
        testBluesOrdinal,
        testBluesOrdinalWithIndex,
        testSet1Ordinal, 
        testCategory10Ordinal,
        testBluesQuantitative,
        testViridisQuantitative,
        testRdYlBuQuantitative,
        testSchemaInexistant,
        testDomainVide,
        testRangeArray,
        testColorUtilities,
        testCaseInsensitiveParsing,
        testEncodingComplet
    ];
    
    const results = [];
    let passed = 0;
    let failed = 0;
    
    tests.forEach((test, index) => {
        try {
            console.log(`\n--- Test ${index + 1}/${tests.length} ---`);
            const result = test();
            results.push({ test: test.name, success: true, result });
            passed++;
            console.log("✅ SUCCÈS");
        } catch (error) {
            results.push({ test: test.name, success: false, error: error.message });
            failed++;
            console.log("❌ ÉCHEC:", error.message);
        }
    });
    
    console.log(`\n🎯 === RÉSULTATS FINAUX ===`);
    console.log(`✅ Tests réussis: ${passed}`);
    console.log(`❌ Tests échoués: ${failed}`);
    console.log(`📊 Taux de réussite: ${Math.round(passed / tests.length * 100)}%`);
    
    return results;
}

// === EXEMPLES D'UTILISATION POUR VIS-GRAPH ===

/**
 * Exemple 1: Configuration ordinal simple
 */
const exempleOrdinalSimple = {
    "nodes": {
        "color": {
            "field": "type",
            "scale": {
                "type": "ordinal",
                "domain": ["uri", "literal"],
                "range": "Set1"  // ← Le ColorScaleCalculator convertira automatiquement
            }
        }
    }
};

/**
 * Exemple 2: Configuration quantitative avec interpolateur
 */
const exempleQuantitatif = {
    "nodes": {
        "color": {
            "field": "score",
            "scale": {
                "type": "quantitative",
                "domain": [0, 100],
                "range": "Viridis"  // ← Sera converti en d3.interpolateViridis
            }
        }
    }
};

/**
 * Exemple 3: Configuration mixte (ordinal + quantitative)
 */
const exempleMixte = {
    "nodes": {
        "color": {
            "field": "category", 
            "scale": {
                "type": "ordinal",
                "domain": ["A", "B", "C"],
                "range": "Category10"
            }
        }
    },
    "links": {
        "color": {
            "field": "weight",
            "scale": {
                "type": "quantitative", 
                "domain": [0, 1],
                "range": "Blues"
            }
        }
    }
};

// Exposer les fonctions pour utilisation dans la console
if (typeof window !== 'undefined') {
    window.testColorScale = {
        testBluesOrdinal,
        testBluesOrdinalWithIndex,
        testSet1Ordinal,
        testCategory10Ordinal,
        testBluesQuantitative,
        testViridisQuantitative,
        testRdYlBuQuantitative,
        testSchemaInexistant,
        testDomainVide,
        testRangeArray,
        testColorUtilities,
        testCaseInsensitiveParsing,
        testEncodingComplet,
        runAllTests,
        exemples: {
            exempleOrdinalSimple,
            exempleQuantitatif,
            exempleMixte
        }
    };
    
    console.log("📋 Fonctions de test disponibles dans window.testColorScale");
    console.log("💡 Exemple: window.testColorScale.runAllTests()");
}

// Export pour modules ES6
export {
    testBluesOrdinal,
    testBluesOrdinalWithIndex,
    testSet1Ordinal,
    testCategory10Ordinal,
    testBluesQuantitative,
    testViridisQuantitative,
    testRdYlBuQuantitative,
    testSchemaInexistant,
    testDomainVide,
    testRangeArray,
    testColorUtilities,
    testCaseInsensitiveParsing,
    testEncodingComplet,
    runAllTests,
    exempleOrdinalSimple,
    exempleQuantitatif,
    exempleMixte
}; 