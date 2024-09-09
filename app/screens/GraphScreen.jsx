import React, { useEffect, useState } from 'react';
import { Box, Text, Button, HStack, Modal, VStack } from 'native-base';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { fetchCypherQuery } from '../api/fetchCypherQuery'; // Import the fetch function


// Liste des couleurs prédéfinies
const predefinedColors = ['#008000', '#FF0000', '#8B4513', '#0000FF', '#800080', '#00FFFF', '#FFC0CB', '#FFD700', '#A52A2A', '#000000'];

const GraphScreen = ({ route }) => {
  const { listeNoeuds, selectedLevel, selectedInterNoeuds } = route.params;
  const [htmlContent, setHtmlContent] = useState('');
  const [selectedElementProperties, setSelectedElementProperties] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const navigation = useNavigation();
  const [visData, setVisData] = useState({ nodes: [], edges: [], groupColors: {} });

  const extractedData = listeNoeuds.map(item => {
    const selectedNoeud = item.selectedNoeud;
    const selectedProperty = item.selectedProperty;
    const operator = item.operator || "="; // Par défaut "=" si l'opérateur n'existe pas
    const value = item.value || ""; // Utiliser la valeur stockée ou une chaîne vide par défaut
    const propertyValue = item._fields?.[0]?.properties[selectedProperty];
    if (item.operator && item.value) {
      return { selectedNoeud, selectedProperty, operator, value };
    }
    return { selectedNoeud, selectedProperty, propertyValue };
  });

  const interData = selectedInterNoeuds.map(item => {
    const selectedNoeud = item.selectedNoeud;
    const selectedProperty = item.selectedProperty;
    const operator = item.operator || "="; // Default operator is "="
    const value = item.value || ""; // Default value is an empty string
    if (item.operator && item.value) {
      return { selectedNoeud, selectedProperty, operator, value };
    }
    const propertyValue = item._fields?.[0]?.properties[selectedProperty];
    return { selectedNoeud, selectedProperty, propertyValue };
  });

  const generateCypherQuery = (extractedData, selectedLevel, interData) => {
    let query = '';
    let returnClause = 'RETURN DISTINCT';
    const nFrom = extractedData.length > 0 ? extractedData[0] : null;
    const nTo = extractedData.length > 1 ? extractedData[1] : null;

    if (nFrom) {
      query += `MATCH (nFrom:${nFrom.selectedNoeud})`;
      if (nFrom.operator && nFrom.value) {
        query += ` WHERE nFrom.${nFrom.selectedProperty} ${nFrom.operator} '${nFrom.value}'`;
      } else if (nFrom.selectedProperty && nFrom.propertyValue) {
        query += ` WHERE nFrom.${nFrom.selectedProperty} = '${nFrom.propertyValue}'`;
      }
    } else {
      query += `MATCH (nFrom)`;
    }

    if (nTo) {
      query += `\nMATCH (nTo:${nTo.selectedNoeud})`;
      if (nTo.operator && nTo.value) {
        query += ` WHERE nTo.${nTo.selectedProperty} ${nTo.operator} '${nTo.value}'`;
      } else if (nTo.selectedProperty && nTo.propertyValue) {
        query += ` WHERE nTo.${nTo.selectedProperty} = '${nTo.propertyValue}'`;
      }
    } else {
      query += `\nMATCH (nTo)`;
    }

    query += `\nWITH nFrom, nTo`;
    query += `\nMATCH x = (nFrom)-[rDirect*..1]->(nTo)`;
    query += `\nWHERE id(nFrom) < id(nTo)`;
    returnClause += ' x';

    query += `\nOPTIONAL MATCH S1 = (nFrom)-[:*..1]->(nSFrom:SPATIALE)`;
    query += `\nOPTIONAL MATCH S2 = (nTo)-[:*..1]->(nSTo:SPATIALE)`;
    returnClause += ', S1, S2';

    interData.forEach((interNoeud, index) => {
      const nInt = `nInt${index + 1}`;
      query += `\nOPTIONAL MATCH y${index + 1} = (nFrom)-[:*..${selectedLevel}]->(${nInt})-[:*..${selectedLevel}]->(nTo)`;
      if (interNoeud.operator && interNoeud.value) {
        query += ` WHERE ${nInt}:${interNoeud.selectedNoeud} AND ${nInt}.${interNoeud.selectedProperty} ${interNoeud.operator} '${interNoeud.value}'`;
      } else if (interNoeud.selectedProperty && interNoeud.propertyValue) {
        query += ` WHERE ${nInt}:${interNoeud.selectedNoeud} AND ${nInt}.${interNoeud.selectedProperty} = '${interNoeud.propertyValue}'`;
      } else {
        query += ` WHERE ${nInt}:${interNoeud.selectedNoeud}`;
      }
      returnClause += `, y${index + 1}`;
    });

    query += `\n${returnClause}`;
    return query;
  };

  const alignCypherQuery = (query) => query.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

  const transformNeo4jResponseToVis = (data) => {
    const nodes = [];
    const edges = [];
    const nodeMap = new Map();
    const groupColors = {};
    let colorIndex = 0;

    data.forEach(record => {
      record._fields.forEach(field => {
        if (field.segments) {
          field.segments.forEach(segment => {
            const startGroup = segment.start.labels[0];
            const endGroup = segment.end.labels[0];

            if (!groupColors[startGroup]) {
              groupColors[startGroup] = predefinedColors[colorIndex % predefinedColors.length];
              colorIndex++;
            }

            if (!groupColors[endGroup]) {
              groupColors[endGroup] = predefinedColors[colorIndex % predefinedColors.length];
              colorIndex++;
            }

            if (!nodeMap.has(segment.start.identity)) {
              nodeMap.set(segment.start.identity, true);
              nodes.push({
                id: segment.start.identity,
                Groupe: segment.start.labels,
                label: segment.start.properties.prenom || segment.start.properties.nom || `Node ${segment.start.identity}`,
                group: startGroup,
                color: groupColors[startGroup],
                properties: segment.start.properties
              });
            }

            if (!nodeMap.has(segment.end.identity)) {
              nodeMap.set(segment.end.identity, true);
              nodes.push({
                id: segment.end.identity,
                Groupe: segment.end.labels,
                label: segment.end.properties.prenom || segment.end.properties.nom || `Node ${segment.end.identity}`,
                group: endGroup,
                color: groupColors[endGroup],
                properties: segment.end.properties
              });
            }

            edges.push({
              from: segment.start.identity,
              to: segment.end.identity,
              label: segment.relationship.type,
              properties: segment.relationship.properties
            });
          });
        }
      });
    });

    return { nodes, edges, groupColors };
  };

  const cypherQuery = generateCypherQuery(extractedData, selectedLevel, interData);
  const alignedCypherQuery = alignCypherQuery(cypherQuery);
  console.log('alignedCypherQuery :', alignedCypherQuery);

  useEffect(() => {
    fetchCypherQuery(alignedCypherQuery)
      .then(data => {
        const visData = transformNeo4jResponseToVis(data);
        setVisData(visData);

        if (visData.nodes && visData.edges) {
          const html = `
            <html>
            <head>
              <script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
            </head>
            <body>
              <div id="network" style="width: 100%; height: 100%;"></div>
              <script type="text/javascript">
                var nodes = new vis.DataSet(${JSON.stringify(visData.nodes)});
                var edges = new vis.DataSet(${JSON.stringify(visData.edges)});
                var container = document.getElementById('network');
                var data = { nodes: nodes, edges: edges };
                var options = {
                  nodes: {
                    shape: 'dot',
                    size: 29,
                    font: {
                      size: 11,
                      color: '#ffffff',
                      strokeWidth: 9,
                      strokeColor: '#000000'
                    },
                    color: {
                      border: '#2B7CE9',
                      background: '#97C2FC',
                      highlight: {
                        border: '#2B7CE9',
                        background: '#D2E5FF'
                      },
                      hover: {
                        border: '#2B7CE9',
                        background: '#D2E5FF'
                      }
                    },
                  },
                  edges: {
                    width: 2,
                    color: { color: '#848484', highlight: '#848484', hover: '#848484', inherit: false },
                    smooth: {
                      type: 'continuous',
                      roundness: 0.5
                    },
                    font: {
                      align: 'top',
                      color: '#343434',
                      size: 12,
                      background: 'none',
                      strokeWidth: 0,
                      strokeColor: '#ffffff',
                    },
                  },
                  physics: {
                    enabled: true,
                    solver: 'forceAtlas2Based',
                    stabilization: {
                      enabled: true,
                      iterations: 1000,
                    },
                  },
                  layout: {
                    improvedLayout: true,
                    hierarchical: false,
                  },
                };
                var network = new vis.Network(container, data, options);
                
                network.on('click', function (params) {
                  if (params.nodes.length > 0) {
                    var nodeId = params.nodes[0];
                    var node = nodes.get(nodeId);
                    if (node) {
                      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'node', properties: node.properties }));
                    }
                  } else if (params.edges.length > 0) {
                    var edgeId = params.edges[0];
                    var edge = edges.get(edgeId);
                    if (edge) {
                      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'edge', properties: edge.properties }));
                    }
                  }
                });
              </script>
            </body>
            </html>
          `;
          setHtmlContent(html);
        } else {
          console.error('Données API inattendues :', data);
        }
      })
      .catch(error => {
        console.error('Erreur lors de l\'exécution de la requête Cypher', error);
      });
  }, [alignedCypherQuery]);

  const renderProperties = (properties) => {
    return Object.keys(properties).map((key, index) => {
      const value = properties[key];
  
      // 1. Ignore if the key is a number (check if it's notNaN after coercion)
      if (!isNaN(key)) {
        return null; // Skip rendering this property
      }
  
      // 2. Check if value is an object and contains year, month, and day
      if (typeof value === 'object' && value !== null) {
        const { year, month, day, number } = value;
        
        // If the object contains year, month, and day, format it as a date
        if (year !== undefined && month !== undefined && day !== undefined) {
          const formattedDate = `${day}/${month}/${year}`; // Format date as DD/MM/YYYY
          return (
            <Box key={index} mt={2}>
              <HStack>
                <Text bold flex={1}>{`${key}: `}</Text>
                <Text flex={2}>{formattedDate}</Text>
              </HStack>
            </Box>
          );
        }
        if (number !== undefined) {
          return (
            <Box key={index} mt={2}>
              <HStack>
                <Text bold flex={1}>{`${key}: `}</Text>
                <Text flex={2}>{`${number}`}</Text> 
              </HStack>
            </Box>
          );
        }
  
        // Recursively render the properties if it's a nested object but not a date
        return (
          <Box key={index} mt={2}>
            <Text bold>{`${key}:`}</Text>
            {renderProperties(value)} {/* Recursive call for nested objects */}
          </Box>
        );
      }
  
      // 3. Render non-object values (direct key-value pairs)
      return (
        <Box key={index} mt={2}>
          <HStack>
            <Text bold flex={1}>{`${key}: `}</Text>
            <Text flex={2}>{typeof value === 'string' || typeof value === 'number' ? `${value}` : JSON.stringify(value)}</Text>
            </HStack>
        </Box>
      );
    });
  };
  

  const handleWebViewMessage = (event) => {
    const { type, properties } = JSON.parse(event.nativeEvent.data);
    setSelectedElementProperties({ type, properties });
    setShowModal(true);
  };

  const handleNavigateToMap = () => {
    navigation.navigate('MapScreen', { nodes: visData.nodes, edges: visData.edges, nodeColors: visData.groupColors });
  };

  // Rendering the color legend
  const renderLegend = () => {
    return Object.entries(visData.groupColors).map(([group, color], index) => (
      <HStack key={index} space={2} alignItems="center" mb={1}>
        <Box width={9} height={3} bg={color} />
        <Text>{group}</Text>
      </HStack>
    ));
  };

  return (
<Box flex={1} p={4}>
  <Text bold fontSize="lg" mt={0}>Visualisation du Graphe :</Text>
  {htmlContent ? (
    <WebView 
      originWhitelist={['*']} 
      source={{ html: htmlContent }} 
      style={{ height: '60%', marginTop: 2 }}  // Adjusted height to take 50% of the space
      onMessage={handleWebViewMessage}
    />
  ) : (
    <Text>Chargement du graphe...</Text>
  )}
  
  {/* Modal for displaying node/edge properties */}
  <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
    <Modal.Content maxWidth="400px">
      <Modal.CloseButton />
      <Modal.Header>Propriétés de l'élément</Modal.Header>
      <Modal.Body>
        {selectedElementProperties ? (
          renderProperties(selectedElementProperties.properties)
        ) : (
          <Text>Aucune propriété disponible.</Text>
        )}
      </Modal.Body>
    </Modal.Content>
  </Modal>

  {/* Legend container with flex=1 to fill remaining space */}
  <Box flex={0.45} p={4} bg="gray.100" borderRadius={8}>  
    <Text bold>Légende :</Text>
    {renderLegend()}
  </Box>

  {/* Footer fixed at the bottom */}
  <HStack 
    space={2} 
    position="absolute" 
    bottom={0} 
    left={0} 
    right={0} 
    bg="white" 
    p={4} 
    justifyContent="space-around" 
    borderTopWidth={1} 
    borderColor="coolGray.200"
  >
    <Button flex={1} onPress={() => navigation.navigate('Accueil')} bg="blue.400">
      Recherche
    </Button>
    <Button flex={1} onPress={() => navigation.navigate('Resultats')} bg="green.400">
      Graphe
    </Button>
    <Button flex={1} onPress={handleNavigateToMap} bg="yellow.400">
      Map
    </Button>
  </HStack>
</Box>


  );
};

export default GraphScreen;
