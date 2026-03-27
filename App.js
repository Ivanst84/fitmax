import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

export default function App() {
  const [rutinas, setRutinas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    cargarRutinas();
  }, []);

  const cargarRutinas = async () => {
    try {
      console.log('Intentando cargar tabla RUTINAS...');
      const { data, error } = await supabase
        .from('RUTINAS')                    // ← nombre exacto (mayúsculas)
        .select('*')
        .order('dia_semana', { ascending: true });

      if (error) throw error;

      console.log('¡Rutinas cargadas!', data);
      setRutinas(data || []);
    } catch (error) {
      console.error('Error completo:', error);
      setErrorMsg(error.message);
      Alert.alert('Error de Supabase', error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FitMax 💪</Text>
      <Text style={styles.subtitle}>Tus primeras rutinas</Text>

      {cargando && <Text>Cargando...</Text>}
      {errorMsg && <Text style={{ color: 'red' }}>Error: {errorMsg}</Text>}

      <FlatList
        data={rutinas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.nombre}</Text>
            <Text style={styles.cardDesc}>{item.descripcion}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 42, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 20, textAlign: 'center', marginBottom: 20, color: '#666' },
  card: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold' },
  cardDesc: { fontSize: 14, color: '#555', marginTop: 5 },
});