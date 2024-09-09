import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Box, Text } from 'native-base';
import { fetchCypherData } from '../api/fetchData';  // Import the fetch function

// Function to parse WKT string into coordinates
const parseWKT = (wkt) => {
  if (!wkt) {
    return { latitude: null, longitude: null };  // Return null if WKT is invalid
  }

  const match = wkt.match(/POINT\s*\(\s*([-.\d]+)\s+([-.\d]+)\s*\)/);
  if (match) {
    const coordinates = { latitude: parseFloat(match[2]), longitude: parseFloat(match[1]) };
    return coordinates;
  } else {
    return { latitude: null, longitude: null };  // Return null if parsing fails
  }
};

// Function to build a Cypher query
const buildCypherQuery = (selectedNoeud, propertyToSearch, operator, propertyValue, valueToSearch) => {
  const value = propertyValue || valueToSearch;

  if (!value || value === "Non disponible") {
    return `MATCH (n:${selectedNoeud}) RETURN n`;
  }

  let query = `MATCH (n:${selectedNoeud})`;

  if (propertyToSearch && value) {
    query += ` WHERE n.${propertyToSearch} ${operator} "${value}"`;
  }

  query += ` RETURN n`;

  return query;
};

const MapScreen = ({ route }) => {
  const { item, coordinates, name, itemsWithWKTNoeuds = [], itemsWithWKTInterNoeuds = [], nodes = [], nodeColors = {} } = route.params || {};
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    if (item) {
      console.log("Item in MapScreen:", item);  // Inspect the item to see if operator and value are present
      const selectedNoeud = item.selectedNoeud;
      const selectedProperty = item.selectedProperty;
      const operator = item.operator || "=";
      const propertyValue = item.propertyValue;
      const value = item.value || "";

      // Construct the Cypher query based on the item passed
      const cypherQuery = buildCypherQuery(selectedNoeud, selectedProperty, operator, propertyValue, value);
      console.log("Constructed Cypher Query:", cypherQuery);

      // Fetch data using the imported fetch function
      fetchCypherData(cypherQuery)
        .then(data => {
          const filteredData = data.filter(node => node._fields[0].properties.hasOwnProperty('WKT'));
          const markerData = filteredData.map((node, index) => {
            const wkt = node._fields[0].properties.WKT;
            const coordinates = parseWKT(wkt);

            if (coordinates && coordinates.latitude !== null && coordinates.longitude !== null) {
              return {
                key: `node-${index}`,
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
                name: node._fields[0].properties.nom || `Node ${node._fields[0].identity.low}`,
              };
            } else {
              console.warn(`Invalid coordinates for node ${index}:`, coordinates);
              return null;
            }
          }).filter(marker => marker !== null);  // Filter out null markers

          // Only setMarkers if there's a change to avoid unnecessary renders
          if (JSON.stringify(markers) !== JSON.stringify(markerData)) {
            setMarkers(markerData);
          }
        })
        .catch(error => {
          console.error('Error fetching or processing data:', error);
          Alert.alert('Erreur', 'Échec de la récupération des données.');
        });
    }
  }, [item, markers]);

  // Handle coordinates and other data
  useEffect(() => {
    if (coordinates && name) {
      if (coordinates.latitude && coordinates.longitude) {
        const newMarker = [{
          key: 0,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          name,
          color: 'red',
        }];
        // Only setMarkers if there's a change
        if (JSON.stringify(markers) !== JSON.stringify(newMarker)) {
          setMarkers(newMarker);
        }
      } else {
        console.warn("Invalid coordinates passed:", coordinates);
      }
    }

    if (itemsWithWKTNoeuds.length > 0 || itemsWithWKTInterNoeuds.length > 0) {
      const markersNoeuds = itemsWithWKTNoeuds.map((item, index) => {
        const { latitude, longitude } = parseWKT(item._fields[0].properties.WKT);
        const itemName = item._fields[0].properties.nom || `Noeud ${index + 1}`;

        if (latitude !== null && longitude !== null) {
          return {
            key: `noeud-${index}`,
            latitude,
            longitude,
            name: itemName,
            color: 'blue',
          };
        } else {
          console.warn(`Invalid coordinates for noeud ${index}:`, { latitude, longitude });
          return null;
        }
      }).filter(marker => marker !== null);  // Filter out invalid markers

      const markersInterNoeuds = itemsWithWKTInterNoeuds.map((item, index) => {
        const { latitude, longitude } = parseWKT(item._fields[0].properties.WKT);
        const itemName = item._fields[0].properties.nom || `InterNoeud ${index + 1}`;

        if (latitude !== null && longitude !== null) {
          return {
            key: `interNoeud-${index}`,
            latitude,
            longitude,
            name: itemName,
            color: 'brown',
          };
        } else {
          console.warn(`Invalid coordinates for interNoeud ${index}:`, { latitude, longitude });
          return null;
        }
      }).filter(marker => marker !== null);  // Filter out invalid markers

      const allMarkers = [...markersNoeuds, ...markersInterNoeuds];
      // Only setMarkers if there's a change
      if (JSON.stringify(markers) !== JSON.stringify(allMarkers)) {
        setMarkers(allMarkers);
      }
    }

    if (nodes.length > 0) {
      const markersNodes = nodes
        .filter(node => node.properties.WKT)
        .map((node, index) => {
          const { latitude, longitude } = parseWKT(node.properties.WKT);
          const nodeName = node.properties.nom || `Node ${node.id}`;
          const color = nodeColors[node.group] || '#FF6347';

          if (latitude !== null && longitude !== null) {
            return {
              key: `node-${index}`,
              latitude,
              longitude,
              name: nodeName,
              color,
            };
          } else {
            console.warn(`Invalid coordinates for node ${index}:`, { latitude, longitude });
            return null;
          }
        }).filter(marker => marker !== null);  // Filter out invalid markers

      // Only setMarkers if there's a change
      if (JSON.stringify(markers) !== JSON.stringify(markersNodes)) {
        setMarkers(markersNodes);
      }
    }
  }, [coordinates, name, itemsWithWKTNoeuds, itemsWithWKTInterNoeuds, nodes, nodeColors, markers]);

  let initialRegion = {
    latitude: 31.7917,  // Set to Morocco's latitude
    longitude: -7.0926,  // Set to Morocco's longitude
    latitudeDelta: 5.0,  // Adjust zoom level as needed
    longitudeDelta: 5.0,  // Adjust zoom level as needed
  };

  if (markers.length > 0) {
    initialRegion = {
      latitude: markers[0].latitude,
      longitude: markers[0].longitude,
      latitudeDelta: 5.0,
      longitudeDelta: 5.0,
    };
  }

  return (
    <Box flex={1}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
      >
        {markers.map(marker => (
          <Marker
            key={marker.key}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            pinColor={marker.color}
          >
            <Callout>
              <Box p={2}>
                <Text bold>{marker.name}</Text>
                <Text>Latitude: {marker.latitude}</Text>
                <Text>Longitude: {marker.longitude}</Text>
              </Box>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </Box>
  );
};

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default MapScreen;
