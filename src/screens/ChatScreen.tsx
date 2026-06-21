// ChatScreen — Phase 5 functional chat: target/model picker, thinking + artifact
// toggles, markdown streaming (StreamingText), and the composer. Full composer
// (attachments, voice, slash commands, context meter) lands in Phase 8.
import * as React from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brain, Sparkles, Send, Square, Mic, MicOff, Video, VideoOff, X, Paperclip } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import ThemedBackdrop from '../ui/ThemedBackdrop';
import { useAppTheme } from '../ui/theme';
import { withAlpha } from '../ui/colors';
import { useAppStore } from '../state/store';
import { useActiveChatTarget, useChatTargets, useCurrentSession } from '../state/hooks';
import { formatTargetName } from '../state/selectors';
import StreamingText from '../widgets/StreamingText';
import LiveCameraFeed from '../widgets/LiveCameraFeed';
import { AttachmentData, type ChatTarget, type Message } from '../models';

export default function ChatScreen() {
  const { palette: p } = useAppTheme();
  const session = useCurrentSession();
  const generating = useAppStore((s) => s.generatingSessionIds.includes(session.id));
  const sendMessage = useAppStore((s) => s.sendMessage);
  const stopGeneration = useAppStore((s) => s.stopGeneration);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);
  const createSessionForTarget = useAppStore((s) => s.createSessionForTarget);
  const isThinkingMode = useAppStore((s) => s.isThinkingMode);
  const isArtifactMode = useAppStore((s) => s.isArtifactMode);
  const toggleThinkingMode = useAppStore((s) => s.toggleThinkingMode);
  const toggleArtifactMode = useAppStore((s) => s.toggleArtifactMode);
  const isLiveActive = useAppStore((s) => s.isLiveActive);
  const isLiveRecording = useAppStore((s) => s.isLiveRecording);
  const liveStatus = useAppStore((s) => s.liveStatus);
  const isLiveVideoEnabled = useAppStore((s) => s.isLiveVideoEnabled);
  const startLiveConversation = useAppStore((s) => s.startLiveConversation);
  const stopLiveConversation = useAppStore((s) => s.stopLiveConversation);
  const toggleLiveRecording = useAppStore((s) => s.toggleLiveRecording);
  const toggleLiveVideo = useAppStore((s) => s.toggleLiveVideo);
  const sendLiveVideoFrame = useAppStore((s) => s.sendLiveVideoFrame);

  const targets = useChatTargets();
  const activeTarget = useActiveChatTarget();
  const [text, setText] = React.useState('');
  const [attachments, setAttachments] = React.useState<AttachmentData[]>([]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.7,
    });
    if (result.canceled) return;
    const a = result.assets?.[0];
    if (!a?.base64) return;
    const base64 = a.base64;
    setAttachments((list) => [
      ...list,
      new AttachmentData(a.fileName ?? 'image.jpg', a.mimeType ?? 'image/jpeg', base64, null),
    ]);
  };

  const lastBotId = React.useMemo(() => {
    for (let i = session.messages.length - 1; i >= 0; i--) {
      if (session.messages[i].sender === 'bot') return session.messages[i].id;
    }
    return null;
  }, [session.messages]);

  const send = () => {
    const t = text.trim();
    if ((t.length === 0 && attachments.length === 0) || generating) return;
    setText('');
    const atts = attachments;
    setAttachments([]);
    void sendMessage(t, atts);
  };

  const pickTarget = (target: ChatTarget) => {
    if (target.id === activeTarget.id) return;
    if (target.isModel) setSelectedModel(target.modelId ?? target.displayName);
    else createSessionForTarget(target);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.isSystem) {
      return (
        <View style={styles.systemRow}>
          <Text style={[styles.systemText, { color: p.onSurfaceVariant }]}>{item.text}</Text>
        </View>
      );
    }
    const isUser = item.isUser;
    const streaming = generating && item.id === lastBotId;
    return (
      <View style={[styles.msgRow, { justifyContent: isUser ? 'flex-end' : 'flex-start' }]}>
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: isUser ? p.primary : p.surface,
              borderColor: p.outline,
              borderRadius: p.cardRadius,
            },
          ]}
        >
          {isUser ? (
            <Text style={{ color: '#FFFFFF', fontSize: 15, lineHeight: 21 }}>{item.text}</Text>
          ) : (
            <StreamingText text={item.text} isStreaming={streaming} />
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <ThemedBackdrop />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Target picker */}
        <View style={[styles.targetBar, { borderBottomColor: withAlpha(p.outline, 0.5) }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, alignItems: 'center' }}>
            {targets.map((t) => {
              const active = t.id === activeTarget.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => pickTarget(t)}
                  style={[
                    styles.targetChip,
                    {
                      borderColor: active ? p.primary : p.outline,
                      backgroundColor: active ? withAlpha(p.primary, 0.16) : 'transparent',
                      borderRadius: p.controlRadius,
                    },
                  ]}
                >
                  <Text style={{ color: active ? p.primary : p.onSurfaceVariant, fontWeight: '700', fontSize: 12 }}>
                    {formatTargetName(t.displayName)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
          keyboardVerticalOffset={80}
        >
          <FlatList
            data={session.messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            inverted={false}
            contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={[styles.emptyTitle, { color: p.onSurface }]}>Start chatting</Text>
                <Text style={[styles.emptySub, { color: p.onSurfaceVariant }]}>
                  Pick a model above and send a message. Set your Gemini API key or an OpenAI-compatible endpoint in Settings.
                </Text>
              </View>
            }
          />

          <View style={[styles.composerWrap]}>
            {attachments.length > 0 ? (
              <ScrollView horizontal style={{ marginBottom: 6 }}>
                {attachments.map((a, i) => (
                  <View key={i} style={[styles.attChip, { backgroundColor: p.surfaceDim, borderColor: p.outline, borderRadius: p.controlRadius }]}>
                    <Text style={{ color: p.onSurface, fontSize: 11 }} numberOfLines={1}>{a.name}</Text>
                    <Pressable onPress={() => setAttachments((l) => l.filter((_, idx) => idx !== i))}>
                      <X size={12} color={p.onSurfaceVariant} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : null}
            {isLiveActive ? (
              <View style={[styles.liveBar, { backgroundColor: withAlpha(p.error, 0.1), borderColor: withAlpha(p.error, 0.3), borderRadius: p.controlRadius }]}>
                {isLiveVideoEnabled ? (
                  <View style={styles.liveCam}>
                    <LiveCameraFeed useFrontCamera onFrame={(b, m) => sendLiveVideoFrame(b, m)} />
                  </View>
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: p.error, fontWeight: '700', fontSize: 12 }}>{isLiveRecording ? '● LIVE' : 'Live (muted)'}</Text>
                  <Text style={{ color: p.onSurfaceVariant, fontSize: 11 }} numberOfLines={1}>{liveStatus}</Text>
                </View>
                <Pressable onPress={() => void toggleLiveRecording()} style={[styles.actionBtn, { backgroundColor: 'transparent' }]}>
                  {isLiveRecording ? <Mic size={16} color={p.error} /> : <MicOff size={16} color={p.onSurfaceVariant} />}
                </Pressable>
                <Pressable onPress={() => void stopLiveConversation()} style={[styles.actionBtn, { backgroundColor: 'transparent' }]}>
                  <X size={16} color={p.onSurfaceVariant} />
                </Pressable>
              </View>
            ) : null}
            <View style={[styles.actions, { borderColor: p.outline, borderRadius: p.controlRadius }]}>
              <Pressable
                onPress={toggleThinkingMode}
                style={[styles.actionBtn, { backgroundColor: isThinkingMode ? withAlpha(p.primary, 0.18) : 'transparent', borderRadius: p.controlRadius }]}
              >
                <Brain size={16} color={isThinkingMode ? p.primary : p.onSurfaceVariant} />
              </Pressable>
              <Pressable
                onPress={toggleArtifactMode}
                style={[styles.actionBtn, { backgroundColor: isArtifactMode ? withAlpha(p.primary, 0.18) : 'transparent', borderRadius: p.controlRadius }]}
              >
                <Sparkles size={16} color={isArtifactMode ? p.primary : p.onSurfaceVariant} />
              </Pressable>
              <Pressable
                onPress={pickImage}
                style={[styles.actionBtn, { backgroundColor: 'transparent', borderRadius: p.controlRadius }]}
              >
                <Paperclip size={16} color={p.onSurfaceVariant} />
              </Pressable>
              <Pressable
                onPress={() => (isLiveActive ? void stopLiveConversation() : void startLiveConversation())}
                style={[styles.actionBtn, { backgroundColor: isLiveActive ? withAlpha(p.error, 0.18) : 'transparent', borderRadius: p.controlRadius }]}
              >
                {isLiveActive ? <MicOff size={16} color={p.error} /> : <Mic size={16} color={p.onSurfaceVariant} />}
              </Pressable>
              <Pressable
                onPress={toggleLiveVideo}
                disabled={!isLiveActive}
                style={[styles.actionBtn, { backgroundColor: isLiveVideoEnabled ? withAlpha(p.primary, 0.18) : 'transparent', borderRadius: p.controlRadius, opacity: isLiveActive ? 1 : 0.4 }]}
              >
                {isLiveVideoEnabled ? <Video size={16} color={p.primary} /> : <VideoOff size={16} color={p.onSurfaceVariant} />}
              </Pressable>
            </View>

            <View style={[styles.composer, { backgroundColor: p.surface, borderColor: p.outline, borderRadius: p.controlRadius }]}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Message AdoetzGPT…"
                placeholderTextColor={p.onSurfaceVariant}
                multiline
                style={[styles.input, { color: p.onSurface }]}
              />
              <Pressable
                onPress={generating ? () => stopGeneration(session.id) : send}
                style={[styles.sendBtn, { backgroundColor: generating ? p.error : p.primary, borderRadius: p.controlRadius }]}
              >
                {generating ? <Square size={18} color="#FFFFFF" /> : <Send size={18} color="#FFFFFF" />}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  targetBar: { height: 48, borderBottomWidth: 1, justifyContent: 'center' },
  targetChip: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  msgRow: { width: '100%', paddingHorizontal: 12, marginVertical: 4 },
  bubble: { maxWidth: '86%', borderWidth: 1, paddingVertical: 10, paddingHorizontal: 14 },
  systemRow: { alignItems: 'center', marginVertical: 6 },
  systemText: { fontSize: 12, fontStyle: 'italic' },
  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  composerWrap: { paddingHorizontal: 12, paddingBottom: 6 },
  liveBar: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6, marginBottom: 8 },
  liveCam: { width: 72, height: 96, borderRadius: 8, overflow: 'hidden', marginRight: 4 },
  attChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6 },
  actions: { flexDirection: 'row', gap: 6, alignSelf: 'flex-start', borderWidth: 1, padding: 4, marginBottom: 8 },
  actionBtn: { width: 38, height: 34, alignItems: 'center', justifyContent: 'center' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  input: { flex: 1, minHeight: 40, maxHeight: 120, fontSize: 15, paddingVertical: 8 },
  sendBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
