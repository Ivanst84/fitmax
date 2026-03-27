import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { colors, spacing, radius } from '../../constants/theme';

const posts = [
  { id:'1', usuario:'María G.', iniciales:'MG', texto:'¡Completé mi primera semana! 💪 Ya noto diferencia en mis hombros.', likes:12, tiempo:'2h' },
  { id:'2', usuario:'Carlos R.', iniciales:'CR', texto:'¿Alguien más hace el femoral tumbado? Siento que no lo hago bien.', likes:5, tiempo:'4h' },
  { id:'3', usuario:'Ana P.', iniciales:'AP', texto:'Semana 3 completada. El jalón al pecho es mi favorito 🔥', likes:24, tiempo:'1d' },
];

export default function CommunityScreen() {
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <View style={s.header}>
        <View>
          <Text style={s.title}>Comunidad</Text>
          <Text style={s.subtitle}>Comparte tu progreso</Text>
        </View>
        <TouchableOpacity style={s.newPostBtn}>
          <Text style={s.newPostText}>+ Publicar</Text>
        </TouchableOpacity>
      </View>

      {/* Banner próximamente */}
      <View style={s.banner}>
        <Text style={s.bannerIcon}>🚀</Text>
        <Text style={s.bannerTitle}>Chat en vivo próximamente</Text>
        <Text style={s.bannerSub}>Por ahora comparte tus logros aquí</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {posts.map(post => (
          <View key={post.id} style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{post.iniciales}</Text>
              </View>
              <View style={s.userInfo}>
                <Text style={s.userName}>{post.usuario}</Text>
                <Text style={s.tiempo}>{post.tiempo}</Text>
              </View>
            </View>
            <Text style={s.postText}>{post.texto}</Text>
            <View style={s.cardFooter}>
              <TouchableOpacity style={s.likeBtn}>
                <Text style={s.likeText}>❤ {post.likes}</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text style={s.commentText}>💬 Comentar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingTop: 60 },
  header: { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom: spacing.lg },
  title: { fontSize:28, fontWeight:'bold', color: colors.textPrimary },
  subtitle: { fontSize:14, color: colors.textSecondary },
  newPostBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical:8, borderRadius: radius.full, marginTop:4 },
  newPostText: { color:'#fff', fontWeight:'bold', fontSize:13 },
  banner: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, alignItems:'center' },
  bannerIcon: { fontSize:28, marginBottom:6 },
  bannerTitle: { fontSize:15, fontWeight:'bold', color: colors.textPrimary, marginBottom:2 },
  bannerSub: { fontSize:13, color: colors.textSecondary },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom:12 },
  cardHeader: { flexDirection:'row', alignItems:'center', marginBottom: spacing.sm },
  avatar: { width:38, height:38, borderRadius: radius.full, backgroundColor: colors.primary, justifyContent:'center', alignItems:'center', marginRight: spacing.sm },
  avatarText: { color:'#fff', fontWeight:'bold', fontSize:13 },
  userInfo: { flex:1 },
  userName: { fontSize:14, fontWeight:'bold', color: colors.textPrimary },
  tiempo: { fontSize:12, color: colors.textMuted },
  postText: { fontSize:14, color: colors.textSecondary, lineHeight:20, marginBottom: spacing.sm },
  cardFooter: { flexDirection:'row', gap: spacing.md },
  likeBtn: {},
  likeText: { fontSize:13, color: colors.primary, fontWeight:'600' },
  commentText: { fontSize:13, color: colors.textSecondary },
});