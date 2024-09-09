import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box, FlatList, Text, VStack, HStack, Divider, Pressable, IconButton,
  Icon, Button, Input
} from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';


const Accueil = () => {
  const [listeNoeuds, setListeNoeuds] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedInterNoeuds, setSelectedInterNoeuds] = useState([]);
  const navigation = useNavigation();

  const handleListeNoeud = (item, property) => {
    setListeNoeuds((prevListeNoeuds) => [
      ...prevListeNoeuds,
      { 
        ...item,
        selectedProperty: property,
        selectedNoeud: item.selectedNoeud || item._fields[0].properties.noeud || property,
        propertyValue: item._fields[0].properties[property] || item.propertyValue || "Non disponible",
      }
    ]);
  };

  const handleNewSearch = () => {
    navigation.navigate('EcranDeRecherche', { 
      handleListeNoeud: handleListeNoeud, 
      listeNoeuds: listeNoeuds 
    });
  };

  const handleDelete = (index, isInterNode = false) => {
    if (isInterNode) {
      setSelectedInterNoeuds((prevSelectedInterNoeuds) => prevSelectedInterNoeuds.filter((_, i) => i !== index));
    } else {
      setListeNoeuds((prevListeNoeuds) => prevListeNoeuds.filter((_, i) => i !== index));
    }
  };

  const handleGeo = (item) => {
    try {
      if (!item.propertyValue || item.propertyValue === "Non disponible") {
        // Handle cases where propertyValue is empty
        item.propertyValue = "";  // Or some default value
      }
      // Pass the selected item to MapScreen and navigate
      navigation.navigate('MapScreen', { item });
    } catch (error) {
      console.error("Error handling geolocation:", error.message);
      Alert.alert('Erreur', error.message);
    }
  };
  
  

  const parseWKT = (wkt) => {
    if (!wkt) {
      return null;  // Return null if WKT is invalid
    }
  
    const match = wkt.match(/POINT\s*\(\s*([-.\d]+)\s+([-.\d]+)\s*\)/);
    if (match) {
      const coordinates = { latitude: parseFloat(match[2]), longitude: parseFloat(match[1]) };
      return coordinates;
    } else {
      return null;  // Return null if the parsing fails
    }
  };
  
  const handleMapView = () => {
    // Filter elements from ListNoeuds based on WKT in Results
    const itemsWithWKTNoeuds = listeNoeuds.filter(item => {
      if (item.Results && item.Results.some(result => {
        const wkt = result._fields[0].properties?.WKT;
        const coordinates = parseWKT(wkt);
        return coordinates !== null;
      })) {
        return true;
      } else {
        return false;
      }
    });
  
    // Filter elements from InterNoeuds based on WKT in Results
    const itemsWithWKTInterNoeuds = selectedInterNoeuds.filter(item => {
      if (item.Results && item.Results.some(result => {
        const wkt = result._fields[0].properties?.WKT;
        const coordinates = parseWKT(wkt);
        return coordinates !== null;
      })) {
        return true;
      } else {
        return false;
      }
    });
  
  
    // Check if there are any nodes with WKT before navigating
    if (itemsWithWKTNoeuds.length > 0 || itemsWithWKTInterNoeuds.length > 0) {
      // Navigate to MapScreen and pass both filtered lists
      navigation.navigate('MapScreen', { 
        itemsWithWKTNoeuds, 
        itemsWithWKTInterNoeuds 
      });
    } else {
      Alert.alert('Aucun élément géolocalisable', 'Il n\'y a aucun élément avec des propriétés WKT à afficher sur la carte.');
    }
  };
  

  
  

  const handleLevelChange = (text) => {
    if (/^(\*|[0-9]*)$/.test(text)) {
      setSelectedLevel(text);
    } else {
      setSelectedLevel(''); // Vider l'input
    }
  };

  const handleAddInterNoeud = () => {
    navigation.navigate('Intermédiaire', {
      setSelectedInterNoeuds: setSelectedInterNoeuds,
    });
  };

  const handleConnexion = () => {
    navigation.navigate('GraphScreen', {
      listeNoeuds: listeNoeuds,
      selectedLevel: selectedLevel,
      selectedInterNoeuds: selectedInterNoeuds,
    });
  };


  const hasWKT = (item) => {
    // Check if the item has a 'Results' array
    if (!item || !item.Results || !Array.isArray(item.Results)) {
      console.error('Item does not have Results or Results is not an array:', item);
      return false;
    }
  
    // Loop through each result in the Results array and check for the 'WKT' property
    for (const result of item.Results) {
      if (result._fields && result._fields[0] && result._fields[0].properties && result._fields[0].properties.WKT) {
        // WKT property found
        return true;
      }
    }
  
    // If no WKT property is found, return false
    return false;
  };

  
  const renderItem = ({ item, index }) => {
    const selectedNoeudValue = item.selectedNoeud || "Non disponible";
    const propertyValue = item.propertyValue || "Non disponible";
    const operator = item.operator || ""; // Utiliser l'opérateur s'il existe
    const value = item.value || ""; // Utiliser la valeur s'il existe
    const selectedProperty = item.selectedProperty || "Propriété non spécifiée";
  
    // Call the hasWKT function to check if the item has WKT data
    const wktAvailable = hasWKT(item);
  
    return (
      <Pressable>
        <Box p={4} borderBottomWidth={1} borderBottomColor="coolGray.200">
          <HStack justifyContent="space-between" alignItems="center">
            <VStack flex={1}>
              <Text bold>{`Noeud : ${selectedNoeudValue}`}</Text>
              {/* Condition pour afficher soit l'opérateur et la valeur, soit la propriété et la valeur */}
              {operator && value ? (
                <Text>{`${selectedProperty} ${operator} ${value}`}</Text>
              ) : (
                selectedProperty && propertyValue !== "Non disponible" && (
                  <Text>{`${selectedProperty}: ${propertyValue}`}</Text>
                )
              )}
            </VStack>
            <HStack space={2}>
              <Button size="sm" onPress={() => handleDelete(index)} colorScheme="red">
                Delete
              </Button>
              <Button
                size="sm"
                onPress={() => handleGeo(item)}
                colorScheme="green"
                isDisabled={!wktAvailable}  
              >
                Geoloc
              </Button>
            </HStack>
          </HStack>
        </Box>
      </Pressable>
    );
  };
  
  
  
  

  const renderInterNodeItem = ({ item, index }) => {
    const selectedNoeudValue = item.selectedNoeud || "Non disponible";
    const operator = item.operator || ""; // Utiliser l'opérateur s'il existe
    const value = item.value || ""; // Utiliser la valeur s'il existe
    const selectedProperty = item.selectedProperty || "Propriété non spécifiée";
    
    // Vérifier si la valeur de la propriété est disponible
    const propertyValue = item._fields[0].properties[selectedProperty] || "Non disponible";
    const wktAvailable = hasWKT(item);
  
    return (
      <Pressable>
        <Box p={4} borderBottomWidth={1} borderBottomColor="coolGray.200">
          <HStack justifyContent="space-between" alignItems="center">
            <VStack flex={1}>
              <Text bold>{`NoeudInter : ${selectedNoeudValue}`}</Text>
              {/* Condition pour afficher soit l'opérateur et la valeur, soit la propriété et la valeur */}
              {operator && value ? (
                <Text>{`${selectedProperty} ${operator} ${value}`}</Text>
              ) : (
                item.selectedProperty && propertyValue !== "Non disponible" && (
                  <Text>{`${selectedProperty}: ${propertyValue}`}</Text>
                )
              )}
            </VStack>
            <HStack space={2}>
              <Button size="sm" onPress={() => handleDelete(index, true)} colorScheme="red">
                Delete
              </Button>
              <Button
                size="sm"
                onPress={() => handleGeo(item)}
                colorScheme="green"
                isDisabled={!wktAvailable}  
              >
                Geoloc
              </Button>
            </HStack>
          </HStack>
        </Box>
      </Pressable>
    );
  };
  

  return (
    <Box flex={1}>
      {/* Première partie */}
      <Box flex={1.2} p={4}>
        {/* HStack containing "Noeuds Principaux" text and Search IconButton */}
        <HStack 
          justifyContent="space-between" 
          alignItems="center" 
          mb={2} 
          bg="gray.300"  // Setting the background color to gray
          p={1}          // Optional padding for better appearance
          borderRadius={5}  // Optional: Add some border radius for rounded corners
        >
          <Text bold fontSize="lg" flex={1} textAlign="center">
            Noeuds Principaux :
          </Text>
          <IconButton
            onPress={handleNewSearch}
            icon={<Icon as={MaterialIcons} name="search" />}
            size="lg"
            variant="solid"
            colorScheme="blue"
            w="48px"  // Set consistent button size
          />
        </HStack>

  
        <VStack>
          {listeNoeuds.length > 0 && (
            <FlatList
              data={listeNoeuds}
              keyExtractor={(item, index) => `result-${index}`}
              renderItem={renderItem}
            />
          )}
        </VStack>
      </Box>
  
      {/* Separator positioned in the middle of the screen */}
      {listeNoeuds.length > 0 && (
      <Box
        width="100%"
        height={1} // Thickness of the Divider
        bg="gray.500"
        my={0} // Add vertical margin for spacing
      />
      )}
      
      <Box flex={2} p={4}>
      {listeNoeuds.length > 0 && (
        <HStack 
        justifyContent="space-between" 
        alignItems="center" 
        mb={3}
        mt={0} 
        bg="gray.300"  // Setting the background color to gray
        p={1}          // Optional padding for better appearance
        borderRadius={5}  // Optional: Add some border radius for rounded corners
      >
        <Text bold fontSize="lg" flex={1} textAlign="center">
          Noeuds Intermédiaires :
        </Text>
        <IconButton
          onPress={handleAddInterNoeud}
          icon={<Icon as={MaterialIcons} name="add" />}
          size="lg"
          variant="solid"
          colorScheme="blue"
          w="48px"  // Ensure consistent button size
        />
      </HStack>
      
        )}
        
  
        {selectedInterNoeuds.length > 0 && (
          <FlatList
            data={selectedInterNoeuds}
            keyExtractor={(item, index) => `inter-${index}`}
            renderItem={renderInterNodeItem}
            ItemSeparatorComponent={() => <Divider />}
          />
        )}
      </Box>
  
      {/* Footer: "niveaux" and "connexion" buttons fixed at the bottom */}
      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        p={listeNoeuds.length > 0 ? 2 : 1}
        bg="white"
        borderColor="gray.300"
        h={listeNoeuds.length > 0 ? "auto" : "80px"}
      > 
        {listeNoeuds.length > 0 && (
        <HStack alignItems="center">
          <Text bold># niveaux :</Text>
          <Input
            value={selectedLevel}
            onChangeText={handleLevelChange}
            placeholder="*"
            width="50%"
            ml={2}
            keyboardType="default"
          />
          <Button 
            size="md" 
            onPress={handleConnexion} 
            ml={2}
          >
            connexion
          </Button>
        </HStack>
        )}
  
        {/* <HStack space={2} mt={4} justifyContent="space-around">
          <Button flex={1} onPress={() => navigation.navigate('Accueil')} bg="blue.400">
            Recherche
          </Button>
          <Button flex={1} onPress={handleConnexion} bg="green.400">
            Graphe
          </Button>
          <Button flex={1} onPress={handleMapView} bg="yellow.400">
            Map
          </Button>
        </HStack> */}
      </Box>
    </Box>
  );
  
};

export default Accueil;
