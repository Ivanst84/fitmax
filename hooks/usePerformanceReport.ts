import { useState } from 'react';
import { Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function usePerformanceReport() {
  const { session } = useAuth();
  const [generando, setGenerando] = useState(false);

  const generateReport = async () => {
    if (!session?.user?.id) {
      Alert.alert('Error', 'Usuario no autenticado.');
      return;
    }

    try {
      setGenerando(true);

      // 1. OBTENER TODO EL HISTORIAL DE SESIONES (Ordenado de más viejo a más nuevo)
      const { data: historial, error } = await supabase
        .from('HISTORIAL_SESIONES')
        .select('volumen_total_kg, duracion_segundos, sets_completados, fecha')
        .eq('user_id', session.user.id)
        .order('fecha', { ascending: true });

      if (error) throw error;
      if (!historial || historial.length < 2) {
        Alert.alert('Datos Insuficientes', 'Necesitas al menos 2 sesiones registradas para generar una auditoría de rendimiento.');
        return;
      }

      // 2. MATEMÁTICAS DE RENDIMIENTO (Ciclo Inicial vs Ciclo Actual)
      // Tomamos las primeras 14 sesiones (o las que haya si son menos) como Ciclo 1
      const cicloInicial = historial.slice(0, 14);
      // Tomamos las últimas 14 sesiones como Ciclo Actual
      const cicloActual = historial.slice(-14);

      // Función helper para sumar
      const sum = (arr: any[], key: string) => arr.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);

      // Stats Ciclo Inicial
      const volInicial = sum(cicloInicial, 'volumen_total_kg');
      const tiempoInicialMin = sum(cicloInicial, 'duracion_segundos') / 60;
      const densidadInicial = tiempoInicialMin > 0 ? (volInicial / tiempoInicialMin) : 0;

      // Stats Ciclo Actual
      const volActual = sum(cicloActual, 'volumen_total_kg');
      const tiempoActualMin = sum(cicloActual, 'duracion_segundos') / 60;
      const densidadActual = tiempoActualMin > 0 ? (volActual / tiempoActualMin) : 0;

      // Deltas (Crecimiento en %)
      const deltaVolumen = volInicial > 0 ? (((volActual - volInicial) / volInicial) * 100).toFixed(1) : 0;
      const deltaDensidad = densidadInicial > 0 ? (((densidadActual - densidadInicial) / densidadInicial) * 100).toFixed(1) : 0;
      
      const totalHistorico = sum(historial, 'volumen_total_kg');
      const fechaInicio = new Date(historial[0].fecha).toLocaleDateString('es-ES');

      // 3. GENERAR EL HTML DEL REPORTE (Diseño Técnico Oscuro)
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Auditoría de Rendimiento FitMax</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0d0d0d; color: #ffffff; padding: 40px; }
            .header { border-bottom: 2px solid #34C759; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 28px; font-weight: 900; letter-spacing: 2px; margin: 0; text-transform: uppercase; color: #34C759; }
            .subtitle { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
            .grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .card { background-color: #1a1a1a; padding: 20px; border-radius: 8px; width: 45%; border: 1px solid #333; }
            .card-title { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
            .card-value { font-size: 24px; font-weight: bold; margin: 0; }
            .delta-positive { color: #34C759; font-size: 14px; font-weight: bold; }
            .delta-negative { color: #FF3B30; font-size: 14px; font-weight: bold; }
            .table-container { background-color: #1a1a1a; border-radius: 8px; padding: 20px; border: 1px solid #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { text-align: left; padding: 10px; border-bottom: 1px solid #333; color: #888; font-size: 12px; text-transform: uppercase; }
            td { padding: 10px; border-bottom: 1px solid #222; font-size: 14px; }
            .footer { margin-top: 40px; font-size: 10px; color: #666; text-align: center; border-top: 1px solid #333; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <p class="subtitle">Reporte de Auditoría de Rendimiento</p>
            <h1 class="title">FITMAX PERFORMANCE</h1>
            <p style="color: #aaa; font-size: 14px;">ID Atleta: ${session.user.id.split('-')[0]} | Inicio: ${fechaInicio}</p>
          </div>

          <h3 style="font-size: 14px; color: #888; text-transform: uppercase;">Métricas de Eficiencia (Ciclo Actual vs Ciclo 1)</h3>
          
          <div class="grid">
            <div class="card">
              <p class="card-title">Carga de Trabajo Total (Último Ciclo)</p>
              <p class="card-value">${volActual.toLocaleString()} kg</p>
              <p class="delta-positive">Δ ${deltaVolumen}% vs Ciclo Inicial</p>
            </div>
            <div class="card">
              <p class="card-title">Densidad de Entrenamiento (Eficiencia)</p>
              <p class="card-value">${densidadActual.toFixed(1)} kg/min</p>
              <p class="${Number(deltaDensidad) >= 0 ? 'delta-positive' : 'delta-negative'}">Δ ${deltaDensidad}% vs Ciclo Inicial</p>
            </div>
          </div>

          <div class="table-container">
            <h3 style="font-size: 14px; color: #888; text-transform: uppercase; margin-top: 0;">Resumen Operativo Acumulado</h3>
            <table>
              <tr>
                <th>Métrica</th>
                <th>Total Histórico</th>
              </tr>
              <tr>
                <td>Tonelaje Acumulado Total</td>
                <td>${totalHistorico.toLocaleString()} kg</td>
              </tr>
              <tr>
                <td>Sesiones Completadas</td>
                <td>${historial.length} sesiones</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            Generado automáticamente por el motor de análisis biomecánico de FitMax.<br>
            Documento de uso confidencial para el atleta.
          </div>
        </body>
        </html>
      `;

      // 4. CREAR PDF Y COMPARTIR
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: 'Exportar Reporte de Rendimiento FitMax'
      });

    } catch (e: any) {
      console.error("Error generando reporte:", e);
      Alert.alert('Error', 'No se pudo generar la auditoría de rendimiento.');
    } finally {
      setGenerando(false);
    }
  };

  return { generateReport, generando };
}