import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Image } from 'react-native';
import { useEffect, useState } from 'react';
import { colors, spacing, radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

const LOGROS = [
  { id:1, icon:'🔥', titulo:'Primera sesión', desc:'Completaste tu primer entrenamiento', desbloqueado:true },
  { id:2, icon:'📅', titulo:'3 días seguidos', desc:'Entrenaste 3 días consecutivos', desbloqueado:false },
  { id:3, icon:'💪', titulo:'10 sesiones', desc:'Completaste 10 entrenamientos', desbloqueado:false },
  { id:4, icon:'⚡', titulo:'Mes completo', desc:'Entrenaste todo un mes', desbloqueado:false },
];

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ sesiones: 0, minutos: 0, calorias: 0 });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const { data } = await supabase
        .from('HISTORIAL_SESIONES')
        .select('duracion_segundos, volumen_total_kg')
        .eq('user_id', user.id);

      if (data) {
        setStats({
          sesiones: data.length,
          minutos: Math.round(data.reduce((acc, s) => acc + (s.duracion_segundos || 0), 0) / 60),
          calorias: Math.round(data.reduce((acc, s) => acc + (s.volumen_total_kg || 0), 0)),
        });
      }
    }
  };

  const nombre = user?.user_metadata?.full_name || 'Usuario';
  const foto = user?.user_metadata?.avatar_url;
  const iniciales = nombre.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={s.profileHeader}>
          {foto ? (
            <Image source={{ uri: foto }} style={s.avatarImg} />
          ) : (
            <View style={s.avatarBig}>
              <Text style={s.avatarText}>{iniciales}</Text>
            </View>
          )}
          <Text style={s.userName}>{nombre}</Text>
          <Text style={s.userEmail}>{user?.email}</Text>
          <Text style={s.userLevel}>Principiante · Semana 1</Text>
          <TouchableOpacity style={s.editBtn}>
            <Text style={s.editText}>Editar perfil</Text>
          </TouchableOpacity>
        </View>

        <View style={s.statsGrid}>
          <View style={s.statCard}>
            <Text style={s.statValue}>{stats.sesiones}</Text>
            <Text style={s.statLabel}>Sesiones</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>0</Text>
            <Text style={s.statLabel}>Racha días</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{stats.minutos}</Text>
            <Text style={s.statLabel}>Minutos</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{stats.calorias}</Text>
            <Text style={s.statLabel}>Vol. kg</Text>
          </View>
        </View>

        <View style={s.subCard}>
          <View>
            <Text style={s.subTitle}>Plan Gratuito</Text>
            <Text style={s.subDesc}>Actualiza para acceso completo</Text>
          </View>
          <TouchableOpacity style={s.upgradeBtn}>
            <Text style={s.upgradeText}>⚡ PLATINUM</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.sectionTitle}>Logros</Text>
        <View style={s.logrosGrid}>
          {LOGROS.map(logro => (
            <View key={logro.id} style={[s.logroCard, !logro.desbloqueado && s.logroLocked]}>
              <Text style={s.logroIcon}>{logro.desbloqueado ? logro.icon : '🔒'}</Text>
              <Text style={[s.logroTitulo, !logro.desbloqueado && s.lockedText]}>{logro.titulo}</Text>
              <Text style={s.logroDesc}>{logro.desc}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionTitle}>Configuración</Text>
        {[
          { label: 'Mis medidas', action: undefined },
          { label: 'Historial de sesiones', action: undefined },
          { label: 'Notificaciones', action: undefined },
          { label: 'Cerrar sesión', action: cerrarSesion },
        ].map(item => (
          <TouchableOpacity key={item.label} style={s.optionRow} onPress={item.action}>
            <Text style={[s.optionText, item.label === 'Cerrar sesión' && { color: colors.error }]}>
              {item.label}
            </Text>
            <Text style={s.optionArrow}>›</Text>
          </TouchableOpacity>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingTop: 60 },
  profileHeader: { alignItems:'center', marginBottom: spacing.lg },
  avatarBig: { width:88, height:88, borderRadius: radius.full, backgroundColor: colors.primary, justifyContent:'center', alignItems:'center', marginBottom: spacing.sm },
  avatarImg: { width:88, height:88, borderRadius: radius.full, marginBottom: spacing.sm },
  avatarText: { color:'#fff', fontWeight:'bold', fontSize:30 },
  userName: { fontSize:22, fontWeight:'bold', color: colors.textPrimary, marginBottom:2 },
  userEmail: { fontSize:13, color: colors.textMuted, marginBottom:4 },
  userLevel: { fontSize:14, color: colors.textSecondary, marginBottom: spacing.sm },
  editBtn: { borderWidth:1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical:6 },
  editText: { color: colors.textSecondary, fontSize:13 },
  statsGrid: { flexDirection:'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flex:1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, alignItems:'center' },
  statValue: { fontSize:22, fontWeight:'bold', color: colors.primary },
  statLabel: { fontSize:11, color: colors.textSecondary, marginTop:2, textAlign:'center' },
  subCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: spacing.lg, borderWidth:1, borderColor: colors.primary },
  subTitle: { fontSize:15, fontWeight:'bold', color: colors.textPrimary },
  subDesc: { fontSize:12, color: colors.textSecondary },
  upgradeBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical:8, borderRadius: radius.full },
  upgradeText: { color:'#fff', fontWeight:'bold', fontSize:13 },
  sectionTitle: { fontSize:18, fontWeight:'bold', color: colors.textPrimary, marginBottom: spacing.sm },
  logrosGrid: { flexDirection:'row', flexWrap:'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  logroCard: { width:'47%', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, alignItems:'center' },
  logroLocked: { opacity:0.4 },
  logroIcon: { fontSize:28, marginBottom:4 },
  logroTitulo: { fontSize:13, fontWeight:'bold', color: colors.textPrimary, textAlign:'center', marginBottom:2 },
  lockedText: { color: colors.textMuted },
  logroDesc: { fontSize:11, color: colors.textSecondary, textAlign:'center' },
  optionRow: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, flexDirection:'row', justifyContent:'space-between', marginBottom:8 },
  optionText: { fontSize:15, color: colors.textPrimary },
  optionArrow: { color: colors.textMuted, fontSize:18 },
});