/**
 * Données d'exemple pour les visualisations
 */

// Données métabolomiques d'exemple
const SAMPLE_DATA = {
    columns: [
        'id', 'name', 'concentration', 'fold_change', 'p_value', 
        'pathway', 'organism', 'tissue', 'experiment_date', 'sample_group'
    ],
    values: []
};

// Générer des données aléatoires
(function() {
    const pathways = [
        'Glycolyse', 'Cycle de Krebs', 'Voie des pentoses phosphates',
        'Métabolisme des lipides', 'Métabolisme des acides aminés'
    ];
    
    const organisms = ['Homo sapiens', 'Mus musculus', 'Rattus norvegicus', 'Escherichia coli'];
    
    const tissues = ['Foie', 'Rein', 'Muscle', 'Cerveau', 'Plasma', 'Urine'];
    
    const sampleGroups = ['Contrôle', 'Traité', 'Malade', 'Sain'];
    
    const metaboliteNames = [
        'Glucose', 'Pyruvate', 'Lactate', 'Citrate', 'Alpha-ketoglutarate',
        'Succinate', 'Fumarate', 'Malate', 'Oxaloacetate', 'Alanine',
        'Glutamate', 'Glycine', 'Serine', 'Leucine', 'Isoleucine',
        'Valine', 'Phenylalanine', 'Tyrosine', 'Tryptophane', 'Palmitate',
        'Stearate', 'Cholestérol', 'ATP', 'ADP', 'NAD+', 'NADH'
    ];
    
    // Générer des dates entre le 1er janvier 2022 et aujourd'hui
    const startDate = new Date(2022, 0, 1).getTime();
    const endDate = new Date().getTime();
    
    // Générer 200 entrées aléatoires
    for (let i = 0; i < 200; i++) {
        const concentrationValue = Math.random() * 1000;
        const foldChangeValue = Math.random() * 4 - 2; // Entre -2 et 2
        const date = new Date(startDate + Math.random() * (endDate - startDate));
        
        SAMPLE_DATA.values.push({
            id: `M${i.toString().padStart(5, '0')}`,
            name: metaboliteNames[Math.floor(Math.random() * metaboliteNames.length)],
            concentration: concentrationValue.toFixed(2),
            fold_change: foldChangeValue.toFixed(2),
            p_value: (Math.random() * 0.1).toFixed(4),
            pathway: pathways[Math.floor(Math.random() * pathways.length)],
            organism: organisms[Math.floor(Math.random() * organisms.length)],
            tissue: tissues[Math.floor(Math.random() * tissues.length)],
            experiment_date: date.toISOString().split('T')[0],
            sample_group: sampleGroups[Math.floor(Math.random() * sampleGroups.length)]
        });
    }
})();

// Données SPARQL d'exemple pour les tests
const SAMPLE_SPARQL_DATA = {
    "head": {
        "link": [],
        "vars": ["metabolite", "xref"]
    },
    "results": {
        "distinct": false,
        "ordered": true,
        "bindings": [
            {
                "metabolite": {
                    "type": "uri",
                    "value": "https://rdf.metanetx.org/chem/MNXM12406"
                },
                "xref": {
                    "type": "uri",
                    "value": "https://identifiers.org/CHEBI:82565"
                }
            },
            {
                "metabolite": {
                    "type": "uri",
                    "value": "https://rdf.metanetx.org/chem/MNXM12406"
                },
                "xref": {
                    "type": "uri",
                    "value": "https://identifiers.org/hmdb:HMDB0062508"
                }
            },
            {
                "metabolite": {
                    "type": "uri",
                    "value": "https://rdf.metanetx.org/chem/MNXM12406"
                },
                "xref": {
                    "type": "uri",
                    "value": "https://identifiers.org/hmdb:HMDB62508"
                }
            },
            {
                "metabolite": {
                    "type": "uri",
                    "value": "https://rdf.metanetx.org/chem/MNXM12406"
                },
                "xref": {
                    "type": "uri",
                    "value": "https://identifiers.org/kegg.compound:C19568"
                }
            },
            {
                "metabolite": {
                    "type": "uri",
                    "value": "https://rdf.metanetx.org/chem/MNXM12406"
                },
                "xref": {
                    "type": "uri",
                    "value": "https://identifiers.org/kegg.compound:C20306"
                }
            },
            {
                "metabolite": {
                    "type": "uri",
                    "value": "https://rdf.metanetx.org/chem/MNXM54455"
                },
                "xref": {
                    "type": "uri",
                    "value": "https://identifiers.org/CHEBI:16414"
                }
            },
            {
                "metabolite": {
                    "type": "uri",
                    "value": "https://rdf.metanetx.org/chem/MNXM54455"
                },
                "xref": {
                    "type": "uri",
                    "value": "https://identifiers.org/hmdb:HMDB0000056"
                }
            },
            {
                "metabolite": {
                    "type": "uri",
                    "value": "https://rdf.metanetx.org/chem/MNXM54455"
                },
                "xref": {
                    "type": "uri",
                    "value": "https://identifiers.org/hmdb:HMDB00056"
                }
            }
        ]
    }
};

// Exporter les données pour qu'elles soient accessibles globalement
window.SAMPLE_DATA = SAMPLE_DATA;
window.SAMPLE_SPARQL_DATA = SAMPLE_SPARQL_DATA; 