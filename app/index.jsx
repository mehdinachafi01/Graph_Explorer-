import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { NativeBaseProvider } from 'native-base';
import SearchScreen from './screens/SearchScreen';
import HomePage from './screens/HomePage';
import MapScreen from './screens/MapScreen';
import Resultats from './screens/GraphScreen';
import Intermédiaire from './screens/Intermédiaire';  
import WelcomeScreen from './screens/WelcomeScreen';  // Import WelcomeScreen

const Stack = createStackNavigator();

const App = () => {
  return (
    <NativeBaseProvider>
      <NavigationContainer independent={true}>
        <Stack.Navigator initialRouteName="WelcomeScreen">
          {/* Welcome screen as the initial screen */}
          <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Accueil" component={HomePage} />
          <Stack.Screen name="EcranDeRecherche" component={SearchScreen} />
          <Stack.Screen name="MapScreen" component={MapScreen} />
          <Stack.Screen name="GraphScreen" component={Resultats} />
          <Stack.Screen name="Intermédiaire" component={Intermédiaire} />  
        </Stack.Navigator>
      </NavigationContainer>
    </NativeBaseProvider>
  );
};

export default App;
