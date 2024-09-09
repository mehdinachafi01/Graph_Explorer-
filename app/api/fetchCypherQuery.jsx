// api/fetchCypherQuery.js

export async function fetchCypherQuery(alignedCypherQuery) {
    try {
      const response = await fetch('http://192.168.1.108:9090/cypherquery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          statements: [
            {
              statement: alignedCypherQuery,
              // title: 'Oday',
              // nfrom: {Model:'Personne',Prop:'Prenom',OP:'=',Valeur:'oday'},
              // nto: ['Ville','nom','=','taounat'],
              // ninter: [],


            },
          ],
        }),
      });
  
      if (!response.ok) {
        throw new Error('Erreur lors de l\'exécution de la requête Cypher');
      }
  
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur lors de l\'exécution de la requête Cypher', error);
      throw error;
    }
  }
  