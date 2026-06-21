// SettingsScreen (Phase 6). Sections: Profile, Appearance, AI & Generation,
// Endpoints, Sync & Data, Memory, Account. Form primitives kept inline. Full
// per-model costs / agent-connector editor / MCP editor land in Phase 8.
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BarChart3,
  Brain,
  Database,
  KeyRound,
  LogOut,
  MessageSquarePlus,
  Moon,
  Palette,
  Plus,
  Server,
  Sliders,
  Sun,
  Trash2,
  User,
} from 'lucide-react-native';
import ThemedBackdrop from '../ui/ThemedBackdrop';
import GlassPanel from '../ui/GlassPanel';
import SectionHeader from '../ui/SectionHeader';
import SegmentedPills from '../ui/SegmentedPills';
import { useAppTheme } from '../ui/theme';
import { useAppStore } from '../state/store';
import { VISUAL_THEME_OPTIONS, withAlpha } from '../ui/palettes';
import { EndpointConfig, GenerationSettings, type AppLanguage } from '../models';

// --- form primitives ---
function Field({
  label,
  value,
  onChange,
  placeholder,
  secret,
  keyboard,
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secret?: boolean;
  keyboard?: 'default' | 'numeric' | 'email-address' | 'url';
  onBlur?: () => void;
}) {
  const { palette: p } = useAppTheme();
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={[styles.label, { color: p.onSurfaceVariant }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={p.onSurfaceVariant}
        secureTextEntry={secret}
        keyboardType={keyboard ?? 'default'}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.input,
          { color: p.onSurface, borderColor: p.outline, backgroundColor: p.surfaceDim, borderRadius: p.controlRadius },
        ]}
      />
    </View>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { palette: p } = useAppTheme();
  return (
    <View style={styles.toggleRow}>
      <Text style={{ color: p.onSurface, fontSize: 15, fontWeight: '500' }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: p.surfaceDim, true: p.primary }} />
    </View>
  );
}

function SaveButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { palette: p } = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.saveBtn, { backgroundColor: p.primary, borderRadius: p.controlRadius }]}>
      <Text style={styles.saveBtnText}>{label}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { palette: p, isDark, visualTheme } = useAppTheme();
  const s = useAppStore();

  // local mirror for text-heavy fields (commit on save/blur)
  const [name, setName] = React.useState(s.userName);
  const [language, setLanguage] = React.useState<AppLanguage>(s.language);
  const [geminiKey, setGeminiKey] = React.useState(s.geminiApiKey);
  const [gen, setGen] = React.useState<GenerationSettings>(s.genSettings);
  const [endpoints, setEndpoints] = React.useState<EndpointConfig[]>(s.endpoints);
  const [sync, setSync] = React.useState(s.syncSettings);

  React.useEffect(() => {
    setName(s.userName);
    setGeminiKey(s.geminiApiKey);
    setGen(s.genSettings);
    setEndpoints(s.endpoints);
    setSync(s.syncSettings);
    setLanguage(s.language);
  }, [s.userName, s.geminiApiKey, s.genSettings, s.endpoints, s.syncSettings, s.language]);

  const updateEndpoint = (id: string, patch: Partial<EndpointConfig>) =>
    setEndpoints((list) => list.map((e) => (e.id === id ? e.copyWith(patch as any) : e)));
  const addEndpoint = () =>
    setEndpoints((list) => [
      ...list,
      new EndpointConfig(Date.now().toString(), '', '', `Endpoint ${list.length + 1}`),
    ]);
  const removeEndpoint = (id: string) => setEndpoints((list) => list.filter((e) => e.id !== id));

  return (
    <View style={styles.root}>
      <ThemedBackdrop />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, maxWidth: 680, width: '100%', alignSelf: 'center' }}>
          <Text style={[styles.pageTitle, { color: p.onSurface }]}>Settings</Text>

          {/* Profile */}
          <View style={styles.section}>
            <SectionHeader Icon={User} title="Profile" />
            <GlassPanel padding={16}>
              <Field label="Display name" value={name} onChange={setName} onBlur={() => s.updateProfile({ name })} placeholder="Your name" />
              <Text style={[styles.label, { color: p.onSurfaceVariant }]}>Language</Text>
              <SegmentedPills
                value={language}
                onChange={(v) => { setLanguage(v); s.updateProfile({ nextLanguage: v }); }}
                items={[
                  { value: 'en' as AppLanguage, label: 'English' },
                  { value: 'id' as AppLanguage, label: 'Bahasa' },
                ]}
              />
            </GlassPanel>
          </View>

          {/* Appearance */}
          <View style={styles.section}>
            <SectionHeader Icon={Palette} title="Appearance" />
            <GlassPanel padding={16}>
              <ToggleRow label="Dark mode" value={isDark} onChange={() => s.toggleTheme()} />
              <View style={styles.grid}>
                {VISUAL_THEME_OPTIONS.map((o) => {
                  const selected = o.key === visualTheme;
                  return (
                    <Pressable
                      key={o.key}
                      onPress={() => s.setVisualTheme(o.key)}
                      style={[
                        styles.themeCard,
                        { borderColor: selected ? p.primary : p.outline, backgroundColor: selected ? withAlpha(p.primary, 0.12) : p.surfaceDim, borderRadius: p.cardRadius },
                      ]}
                    >
                      <Text style={{ color: selected ? p.primary : p.onSurface, fontWeight: '700', fontSize: 13 }}>{o.label}</Text>
                      <Text style={{ color: p.onSurfaceVariant, fontSize: 11, marginTop: 2 }}>{o.description}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </GlassPanel>
          </View>

          {/* AI & Generation */}
          <View style={styles.section}>
            <SectionHeader Icon={Sliders} title="AI & Generation" />
            <GlassPanel padding={16}>
              <Field label="Gemini API key" value={geminiKey} onChange={setGeminiKey} onBlur={() => s.updateGeminiKey(geminiKey)} secret placeholder="AIza…" />
              <ToggleRow label="Memory" value={gen.memoryEnabled} onChange={(v) => setGen((g) => g.copyWith({ memoryEnabled: v }))} />
              <ToggleRow label="Thinking mode default" value={gen.hapticStreamingEnabled} onChange={() => s.toggleThinkingMode()} />
              <Field label="Temperature" value={String(gen.temperature)} onChange={(v) => setGen((g) => g.copyWith({ temperature: num(v, g.temperature) }))} keyboard="numeric" />
              <Field label="Max output tokens" value={String(gen.maxOutputTokens)} onChange={(v) => setGen((g) => g.copyWith({ maxOutputTokens: Math.max(1, Math.floor(num(v, g.maxOutputTokens))) }))} keyboard="numeric" />
              <Text style={[styles.label, { color: p.onSurfaceVariant }]}>Web search</Text>
              <SegmentedPills
                value={gen.webSearchMode}
                onChange={(v) => setGen((g) => g.copyWith({ webSearchMode: v }))}
                items={[
                  { value: 'off', label: 'Off' },
                  { value: 'auto', label: 'Auto' },
                  { value: 'on', label: 'On' },
                ]}
              />
              <View style={{ height: 8 }} />
              <SaveButton label="Save generation settings" onPress={() => { s.updateMemoryEnabled(gen.memoryEnabled); s.updateGenerationSettings(gen); }} />
            </GlassPanel>
          </View>

          {/* Endpoints */}
          <View style={styles.section}>
            <SectionHeader Icon={Server} title="OpenAI-compatible endpoints" />
            <GlassPanel padding={16}>
              {endpoints.map((e) => (
                <View key={e.id} style={[styles.subCard, { borderColor: p.outline, borderRadius: p.cardRadius }]}>
                  <Field label="Name" value={e.name} onChange={(v) => updateEndpoint(e.id, { name: v })} />
                  <Field label="Base URL" value={e.url} onChange={(v) => updateEndpoint(e.id, { url: v })} keyboard="url" placeholder="https://api.openai.com/v1" />
                  <Field label="API key" value={e.key} onChange={(v) => updateEndpoint(e.id, { key: v })} secret placeholder="sk-…" />
                  <Pressable onPress={() => removeEndpoint(e.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Trash2 size={14} color={p.error} />
                    <Text style={{ color: p.error, fontSize: 13 }}>Remove</Text>
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={addEndpoint} style={[styles.addRow, { borderColor: withAlpha(p.primary, 0.5), borderRadius: p.controlRadius }]}>
                <Plus size={16} color={p.primary} />
                <Text style={{ color: p.primary, fontWeight: '600' }}>Add endpoint</Text>
              </Pressable>
              <View style={{ height: 8 }} />
              <SaveButton label="Save endpoints" onPress={() => s.updateEndpoints(endpoints)} />
            </GlassPanel>
          </View>

          {/* Sync & Data */}
          <View style={styles.section}>
            <SectionHeader Icon={Database} title="Sync & Data" />
            <GlassPanel padding={16}>
              <ToggleRow label="Use Supabase" value={sync.useSupabase} onChange={(v) => setSync((x) => x.copyWith({ useSupabase: v }))} />
              <ToggleRow label="Sync enabled" value={sync.enabled} onChange={(v) => setSync((x) => x.copyWith({ enabled: v }))} />
              <Field label="Sync API URL (Express backend)" value={sync.apiBaseUrl} onChange={(v) => setSync((x) => x.copyWith({ apiBaseUrl: v }))} keyboard="url" placeholder="http://10.0.2.2:3000" />
              {!sync.useSupabase ? (
                <>
                  <Field label="Database URL / host" value={sync.database.databaseUrl} onChange={(v) => setSync((x) => x.copyWith({ database: x.database.copyWith({ databaseUrl: v }) }))} keyboard="url" />
                  <Field label="Database name" value={sync.database.database} onChange={(v) => setSync((x) => x.copyWith({ database: x.database.copyWith({ database: v }) }))} />
                  <Field label="Schema" value={sync.database.schemaName} onChange={(v) => setSync((x) => x.copyWith({ database: x.database.copyWith({ schemaName: v }) }))} />
                  <Field label="User" value={sync.database.user} onChange={(v) => setSync((x) => x.copyWith({ database: x.database.copyWith({ user: v }) }))} />
                  <Field label="Password" value={sync.database.password} onChange={(v) => setSync((x) => x.copyWith({ database: x.database.copyWith({ password: v }) }))} secret />
                  <Field label="Port" value={sync.database.port} onChange={(v) => setSync((x) => x.copyWith({ database: x.database.copyWith({ port: v }) }))} keyboard="numeric" />
                </>
              ) : (
                <>
                  <Field label="Supabase URL" value={sync.supabaseUrl} onChange={(v) => setSync((x) => x.copyWith({ supabaseUrl: v }))} keyboard="url" />
                  <Field label="Supabase anon key" value={sync.supabaseAnonKey} onChange={(v) => setSync((x) => x.copyWith({ supabaseAnonKey: v }))} secret />
                </>
              )}
              <View style={{ height: 8 }} />
              <SaveButton label="Save sync settings" onPress={() => s.updateSyncSettings(sync)} />
            </GlassPanel>
          </View>

          {/* Memory */}
          <View style={styles.section}>
            <SectionHeader Icon={Brain} title="Memory" />
            <GlassPanel padding={16}>
              {s.memories.filter((m) => m.deletedAt == null).length === 0 ? (
                <Text style={{ color: p.onSurfaceVariant, fontSize: 13 }}>No saved memories yet.</Text>
              ) : (
                s.memories
                  .filter((m) => m.deletedAt == null)
                  .slice(0, 20)
                  .map((m) => (
                    <View key={m.id} style={[styles.memoryChip, { backgroundColor: p.surfaceDim, borderRadius: p.controlRadius }]}>
                      <Text style={{ color: p.onSurface, fontSize: 13, flex: 1 }}>{m.content}</Text>
                      <Pressable onPress={() => s.deleteMemory(m.id)}>
                        <Trash2 size={14} color={p.error} />
                      </Pressable>
                    </View>
                  ))
              )}
            </GlassPanel>
          </View>

          {/* Account */}
          <View style={styles.section}>
            <SectionHeader Icon={LogOut} title="Account" />
            <GlassPanel padding={16}>
              <Text style={{ color: p.onSurfaceVariant, fontSize: 13 }}>Signed in as</Text>
              <Text style={{ color: p.onSurface, fontSize: 16, fontWeight: '700', marginBottom: 14 }}>{s.userName}</Text>
              <Pressable
                onPress={() => void s.signOut()}
                style={[styles.signOut, { backgroundColor: withAlpha(p.error, 0.14), borderColor: withAlpha(p.error, 0.4), borderRadius: p.controlRadius }]}
              >
                <LogOut size={18} color={p.error} />
                <Text style={{ color: p.error, fontWeight: '700' }}>Sign out</Text>
              </Pressable>
            </GlassPanel>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function num(value: string, fallback: number): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  pageTitle: { fontSize: 28, fontWeight: '800', fontFamily: 'HankenGrotesk_800ExtraBold', paddingHorizontal: 4, paddingBottom: 12 },
  section: { marginBottom: 22 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 8, letterSpacing: 0.3 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  themeCard: { borderWidth: 1, padding: 12, width: '48%', flexGrow: 1 },
  subCard: { borderWidth: 1, padding: 12, marginBottom: 10 },
  addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', paddingVertical: 11 },
  saveBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 13, marginTop: 4 },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  memoryChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderWidth: 1 },
});
