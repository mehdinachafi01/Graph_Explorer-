import React from 'react';
import { View, Text, Image, Button, StyleSheet } from 'react-native';

const WelcomeScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      {/* Image in the center */}
      <Image
        source={require('../../assets/images/Welcome.jpg')} // Your image path
        style={styles.image}
        resizeMode="contain"
      />

      {/* Welcome text */}
      <Text style={styles.title}>Welcome To Graph Explorer</Text>

      {/* Explore button */}
      <View style={styles.buttonContainer}>
        <Button
          title="Explorez ..."
          onPress={() => navigation.navigate('Accueil')}
          color="#000000" // Black button text
        />
      </View>
    </View>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Matches the white background of the image
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  image: {
    width: '80%', // Adjust the width of the image as needed
    height: '40%', // Adjust the height of the image as needed
    marginBottom: 20, // Space between the image and text
  },
  title: {
    fontSize: 24,
    color: '#000000', // Black text color to contrast with white background
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40, // Space between text and button
  },
  buttonContainer: {
    width: '60%', // Button width
    backgroundColor: '#f0f0f0', // Light gray background for the button
    borderRadius: 10,
    padding: 10,
    elevation: 3, // Slight shadow effect
  },
});
