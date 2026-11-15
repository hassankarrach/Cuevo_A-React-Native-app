import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.label}>MUSIC ROOM</Text>
          <Text style={styles.title}>Your first screen.</Text>
          <Text style={styles.description}>
            Edit mobile/App.tsx and save to see your changes here.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setCount((value) => value + 1)}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>Try a press · {count}</Text>
          </Pressable>
        </View>
        <StatusBar style="light" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111318',
    justifyContent: 'center',
  },
  content: { width: '100%', maxWidth: 480, alignSelf: 'center', padding: 24, gap: 20 },
  label: { color: '#b8f581', fontSize: 14, fontWeight: '700', letterSpacing: 3 },
  title: { color: '#ffffff', fontSize: 36, fontWeight: '700' },
  description: { color: '#bac0cb', fontSize: 17, lineHeight: 26 },
  button: { backgroundColor: '#b8f581', padding: 18, borderRadius: 14, alignItems: 'center' },
  pressed: { opacity: 0.75 },
  buttonText: { color: '#111318', fontSize: 16, fontWeight: '700' },
});
