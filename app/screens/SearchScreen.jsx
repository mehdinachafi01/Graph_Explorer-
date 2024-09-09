import React, { useState, useEffect } from 'react';
import { Alert, TouchableOpacity, FlatList } from 'react-native';
import { NativeBaseProvider, Box, Text, Input, Button, VStack, HStack, Modal, Select, CheckIcon } from 'native-base';
import { useNavigation } from '@react-navigation/native';
import { fetchLabels, fetchProperties, executeCypherQuery } from '../api/fetchData';  // Import the functions

// Function to parse operator and value from the input string
const getWhere = (propertyValue) => {
  const myOperators = [">", ">=", "<", "<=", "~", "!=", "="];

  if (typeof propertyValue !== 'string') {
    throw new Error("propertyValue must be a string");
  }

  const myArray = propertyValue.trim().split(/\s+/);

  let op;
  let value;

  if (myArray.length === 1) {
    op = "=";
    value = myArray[0];
  } else if (myArray.length === 2 && myOperators.includes(myArray[0])) {
    op = myArray[0];
    value = myArray[1];
  } else {
    throw new Error("Invalid format. Use an operator followed by a value, e.g., '>= 100'.");
  }

  return [op, value];
};

const EcranDeRecherche = ({ route }) => {
  const { handleListeNoeud, listeNoeuds } = route.params;
  const navigation = useNavigation();
  const [labels, setLabels] = useState([]);
  const [selectedNoeud, setSelectedNoeud] = useState('');
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [propertyValue, setPropertyValue] = useState('');
  const [data, setData] = useState([]);
  const [noResults, setNoResults] = useState(false);
  const [searchResult, setSearchResult] = useState(false);
  const [selectedResult, setSelectedResult] = useState();
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [searchedProperty, setSearchedProperty] = useState('');

  useEffect(() => {
    fetchLabels()
      .then(data => setLabels(data))
      .catch(error => {
        console.error('Error fetching labels:', error);
        Alert.alert('Error', 'Failed to fetch labels.');
      });
  }, []);

  useEffect(() => {
    if (selectedNoeud) {
      fetchProperties(selectedNoeud)
        .then(data => setProperties(data))
        .catch(error => {
          console.error('Error fetching properties:', error);
          Alert.alert('Error', 'Failed to fetch properties.');
        });
    }
  }, [selectedNoeud]);

  // Build the Cypher query based on user input and operator
  const buildCypherQuery = (selectedNoeud, propertyToSearch, valueToSearch) => {
    const [operator, value] = getWhere(valueToSearch);  // Get the operator and value

    let query = `MATCH (n:${selectedNoeud})`;
    if (propertyToSearch && valueToSearch) {
      query += ` WHERE n.${propertyToSearch} ${operator} "${value}"`;  // Use dynamic operator
    }
    query += ` RETURN n`;
    
    return query;
  };

  const handleSearch = () => {
    setData([]);
    setNoResults(false);
    setSearchResult(true);

    const propertyToSearch = selectedProperty || '';
    const valueToSearch = propertyValue || '';
    setSearchedProperty(propertyToSearch);

    const cypherQuery = buildCypherQuery(selectedNoeud, propertyToSearch, valueToSearch);
    console.log("Generated Cypher Query:", cypherQuery);

    executeCypherQuery(cypherQuery)
      .then(data => {
        if (data.length === 0) {
          setNoResults(true);
        } else {
          setData(data);
        }
        setSearchResult(true);
      })
      .catch(error => {
        console.error('Error executing request:', error);
        Alert.alert('Error', 'Failed to fetch search results. Please try again.');
        setSearchResult(true);
        setNoResults(true);
      });
  };

  const handleSelectResult = (item) => {
    setSelectedResult(item);
    setModalContent(item);
    setShowModal(true);
  };

  // Rest of the component remains unchanged...


  const renderProperties = (properties) => {
    return Object.keys(properties).map((key, index) => {
      const value = properties[key];
      if (typeof value === 'object' && value !== null) {
        return (
          <Box key={index} mt={2}>
            <Text>{`${key}:`}</Text>
            {renderProperties(value)}
          </Box>
        );
      }
      return (
        <Box key={index} mt={2}>
          <HStack>
            <Text bold flex={1}>{`${key}: `}</Text>
            <Text flex={2}>{value}</Text>
          </HStack>
        </Box>
      );
    });
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedResult === item;
    const propertyToDisplay = searchedProperty || 'nom';
    const searchResultValue = item._fields[0].properties[propertyToDisplay] || 'N/A';

    return (
      <TouchableOpacity onPress={() => setSelectedResult(item)}>
        <Box
          borderWidth={1}
          borderColor={isSelected ? 'blue.500' : 'gray.300'}
          borderRadius={8}
          p={4}
          mb={2}
          backgroundColor={isSelected ? 'lightblue' : 'white'}
        >
          <HStack alignItems="center" justifyContent="space-between">
            <Text bold flex={1} flexWrap="wrap">{`${propertyToDisplay}: ${searchResultValue}`}</Text>
            <Button size="sm" onPress={() => handleSelectResult(item)}>Details</Button>
          </HStack>
        </Box>
      </TouchableOpacity>
    );
  };

  const handleValidate = () => {
    // Limite à deux nœuds
    if (listeNoeuds.length >= 2) {
      Alert.alert('Limite atteinte', 'Vous ne pouvez ajouter que deux nœuds.');
      return;
    }
  
    let itemToAdd;
    let operator = "="; // Valeur par défaut si aucun opérateur n'est fourni
    let value = propertyValue || ""; // Valeur par défaut
  
    // Si l'utilisateur a entré une valeur pour la propriété
    if (propertyValue) {
      try {
        // Extraire l'opérateur et la valeur à partir de propertyValue
        [operator, value] = getWhere(propertyValue);
      } catch (error) {
        Alert.alert('Erreur', 'Le format de la valeur saisie est incorrect. Veuillez réessayer.');
        return;
      }
    }
  
    // Si aucun résultat n'est sélectionné, générer et afficher la requête Cypher avec opérateur et valeur
    if (!selectedResult) {
      itemToAdd = {
        Results: data,  // Stocker tous les résultats de la recherche

        _fields: [{
          properties: { [selectedProperty]: value }
        }],
        selectedNoeud,
        selectedProperty: selectedProperty || '',
        operator, // Ajouter l'opérateur extrait
        value,    // Ajouter la valeur extraite
      };
    } else {
      // Si un résultat est sélectionné, ne pas stocker l'opérateur et la valeur
      itemToAdd = {
        ...selectedResult,
        Results: [selectedResult],  // Stocker uniquement le résultat sélectionné

        selectedNoeud,
        selectedProperty: selectedProperty || 'nom',
        // Ne pas ajouter operator et value ici
      };
    }
  
    // Vérifier si un élément avec le même noeud, propriété et valeur existe déjà
    const itemExists = listeNoeuds.some(
      (noeud) =>
        noeud.selectedNoeud === itemToAdd.selectedNoeud &&
        noeud.selectedProperty === itemToAdd.selectedProperty &&
        noeud.value === itemToAdd.value // Comparer la valeur également
    );
  
    if (itemExists) {
      Alert.alert('Élément dupliqué', 'Cet élément a déjà été sélectionné.');
    } else {
      const name = listeNoeuds.length === 0 ? 'nFrom' : 'nTo';
  
      // Ajouter l'élément à la liste des nœuds
      handleListeNoeud({ ...itemToAdd, name: name }, itemToAdd.selectedProperty);
  
      // Revenir à l'écran précédent
      navigation.goBack();
    }
  };
  
  
  
  
  

  const handleCancel = () => {
    setSelectedNoeud('');
    setSelectedProperty('');
    setPropertyValue('');
    setData([]);
    setNoResults(false);
    setSearchResult(false);
  };

  return (
    <NativeBaseProvider>
      <VStack space={1} flex={1} p={4}>
        <Text bold>Selectionner un noeud:</Text>
        <Select
          selectedValue={selectedNoeud}
          onValueChange={itemValue => {
            setSelectedNoeud(itemValue);
            setData([]);
            setSelectedProperty('');
            setSearchedProperty('');
          }}
          minWidth="200"
          accessibilityLabel="Choisir un noeud"
          placeholder="Choisir un noeud"
          _selectedItem={{
            bg: 'teal.600',
            endIcon: <CheckIcon size="5" />,
          }}
        >
          {labels.map((label, index) => (
            <Select.Item key={index} label={label} value={label} />
          ))}
        </Select>

        <Text bold>Selectionner propriétés:</Text>
        <Select
          selectedValue={selectedProperty}
          onValueChange={itemValue => setSelectedProperty(itemValue)}
          minWidth="200"
          accessibilityLabel="Choisir une propriété"
          placeholder="Choisir une propriété"
          _selectedItem={{
            bg: 'teal.600',
            endIcon: <CheckIcon size="5" />,
          }}
        >
          {properties.map((prop, index) => (
            <Select.Item key={index} label={prop.nom} value={prop.nom} />
          ))}
        </Select>

        <Text bold>Saisir une valeur:</Text>
        <Input
          value={propertyValue}
          onChangeText={setPropertyValue}
          placeholder="Enter operator and value (e.g., >= 100)"
        />
        <HStack space={3} mt={1} justifyContent="center">
          <Button size="sm" onPress={handleSearch}>
            Search
          </Button>
          <Button size="sm" onPress={handleCancel} variant="outline" colorScheme="red">
            Cancel
          </Button>
          <Button 
            size="sm" 
            onPress={handleValidate} 
            colorScheme="blue"
          >
            Validate
          </Button>
        </HStack>

        {searchResult && noResults && (
          <Text color="red.500" textAlign="center" mt={4}>
            No results found.
          </Text>
        )}

        {data.length > 0 && (
          <FlatList
            data={data}
            keyExtractor={(item, index) => `result-${index}`}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <Box height={1} bg="coolGray.200" />}
            style={{ flex: 1 }}
          />
        )}
      </VStack>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <Modal.Content maxWidth="90%" marginTop="10px" alignSelf="center" backgroundColor="white" borderRadius="10px">
          <Modal.CloseButton />
          <Modal.Header>Details</Modal.Header>
          <Modal.Body padding={4}>
            {modalContent && modalContent._fields.map((field, idx) => (
              <Box key={idx} mt={2}>
                {renderProperties(field.properties)}
              </Box>
            ))}
          </Modal.Body>
        </Modal.Content>
      </Modal>
    </NativeBaseProvider>
  );
};

export default EcranDeRecherche;
