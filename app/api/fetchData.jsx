


// Fetch labels (Noeuds)
export const fetchLabels = async () => {
  try {
    const response = await fetch('http://192.168.1.108:9090/api/listerModels/Noeud');
    if (!response.ok) {
      throw new Error('Failed to fetch labels');
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Invalid data format');
    }
    return data;
  } catch (error) {
    console.error('Error fetching labels:', error);
    throw error;
  }
};

// Fetch properties for a selected Noeud
export const fetchProperties = async (selectedNoeud) => {
  try {
    const response = await fetch(`http://192.168.1.108:9090/api/ListAttributPourModel/${selectedNoeud}`);
    if (!response.ok) {
      throw new Error('Failed to fetch properties');
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Invalid data format');
    }
    return data;
  } catch (error) {
    console.error('Error fetching properties:', error);
    throw error;
  }
};

// Execute Cypher query
export const executeCypherQuery = async (cypherQuery) => {
  try {
    const response = await fetch('http://192.168.1.108:9090/api/executerRequete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: cypherQuery }),
    });
    if (!response.ok) {
      throw new Error('Failed to execute query');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
};



// Function to fetch data from the Neo4j API
export const fetchCypherData = async (cypherQuery) => {
  try {
    const response = await fetch('http://192.168.1.108:9090/api/executerRequete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: cypherQuery }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch data from Neo4j');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};


