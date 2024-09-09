import React, { useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Network } from 'vis-network/standalone';
import 'isomorphic-fetch';

const GraphScreen = ({ route }) => {
  const { selectedLevel, listeNoeuds } = route.params;
  const [networkData, setNetworkData] = useState({ nodes: [], edges: [] });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetchDataFromAPI(listeNoeuds, selectedLevel);
        if (response.success) {
          setNetworkData(response.data);
        } else {
          Alert.alert('Erreur', 'Erreur lors de la récupération des données.');
        }
      } catch (error) {
        Alert.alert('Erreur', `Erreur réseau: ${error.message}`);
      }
    };

    fetchData();
  }, [selectedLevel, listeNoeuds]);

  useEffect(() => {
    if (networkData.nodes.length > 0 && networkData.edges.length > 0) {
      const container = document.getElementById('mynetwork');
      const data = {
        nodes: new vis.DataSet(networkData.nodes),
        edges: new vis.DataSet(networkData.edges),
      };
      const options = {};
      new Network(container, data, options);
    }
  }, [networkData]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>Niveau sélectionné: {selectedLevel}</Text>
      <Text>Graphe des connexions :</Text>
      <div id="mynetwork" style={{ height: '500px' }}></div>
    </View>
  );
};

// Fonction pour effectuer la requête API
const fetchDataFromAPI = async (nodes, level) => {
  const requestBody = {
    id: 274,
    etat: "base",
    nomReq: "Recherche Connexions",
    textReq: "MATCH (v:Ville)-[r:RESIDE_DANS]->(p:Personne) WHERE v.nom IN ['Rabat', 'Casablanca', 'Marrakech'] AND p.prenom CONTAINS 'med' RETURN v, r, p",
    description: "Recherche Connexions",
    scope: "",
    user: "",
    params: [
      {
        id: null,
        nom: "nom",
        type: "STRING",
        defaultValue: nodes.map(node => node._fields[0].properties.nom).join(', ')
      },
      {
        id: null,
        nom: "prenom",
        type: "STRING",
        defaultValue: "med"
      }
    ]
  };

  console.log("Sending request with body:", requestBody);

  try {
    const response = await fetch('http://localhost:9090/api/executerRequete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (response.ok) {
      // Traitez la réponse pour construire les nœuds et les arêtes
      const nodes = [];
      const edges = [];

      result.forEach((record) => {
        const ville = record._fields[0];
        const personne = record._fields[2];

        nodes.push({ id: ville.identity, label: ville.properties.nom, group: 'Ville' });
        nodes.push({ id: personne.identity, label: `${personne.properties.prenom.trim()} ${personne.properties.nom.trim()}`, group: 'Personne' });
        edges.push({ from: ville.identity, to: personne.identity, label: `Réside depuis ${record._fields[1].properties.depuis}` });
      });

      return {
        success: true,
        data: {
          nodes: nodes,
          edges: edges,
        },
      };
    } else {
      return {
        success: false,
        message: "Failed to fetch data",
      };
    }
  } catch (error) {
    console.error("API Request Error:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};

export default GraphScreen;
