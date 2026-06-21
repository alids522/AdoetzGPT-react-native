// MainShell — the authenticated app: a React Navigation Drawer whose content is
// the sidebar (session list + nav + sign out), wrapping a single Home screen that
// switches between Chat / Settings / TokenUsage based on store.currentView
// (mirrors Flutter's AppShell Scaffold + AnimatedSwitcher over AppView).
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  createDrawerNavigator,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import {
  BarChart3,
  LogOut,
  MessageSquare,
  Pin,
  Plus,
  Settings as SettingsIcon,
} from 'lucide-react-native';
import SparkleMark from '../ui/SparkleMark';
import { useAppTheme } from '../ui/theme';
import { withAlpha } from '../ui/palettes';
import { useAppStore } from '../state/store';
import { useActiveSessions } from '../state/hooks';
import type { AppView } from '../models';
import type { LucideIcon } from 'lucide-react-native';
import ChatScreen from './ChatScreen';
import SettingsScreen from './SettingsScreen';
import TokenUsageScreen from './TokenUsageScreen';

const Drawer = createDrawerNavigator();

function HomeScreen() {
  const currentView = useAppStore((s) => s.currentView);
  if (currentView === 'settings') return <SettingsScreen />;
  if (currentView === 'tokenUsage') return <TokenUsageScreen />;
  return <ChatScreen />;
}

function NavButton({
  Icon,
  label,
  active,
  onPress,
}: {
  Icon: LucideIcon;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { palette: p } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.navBtn,
        {
          backgroundColor: active ? withAlpha(p.primary, 0.14) : 'transparent',
          borderRadius: p.controlRadius,
        },
      ]}
    >
      <Icon size={18} color={active ? p.primary : p.onSurfaceVariant} />
      <Text style={{ color: active ? p.primary : p.onSurface, fontWeight: active ? '700' : '500', fontSize: 14 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Sidebar({ navigation }: DrawerContentComponentProps) {
  const { palette: p } = useAppTheme();
  const sessions = useActiveSessions();
  const currentSessionId = useAppStore((s) => s.currentSessionId);
  const currentView = useAppStore((s) => s.currentView);
  const userName = useAppStore((s) => s.userName);
  const createSession = useAppStore((s) => s.createSession);
  const selectSession = useAppStore((s) => s.selectSession);
  const signOut = useAppStore((s) => s.signOut);

  const go = (view: AppView) => {
    useAppStore.getState().setView(view);
    navigation.closeDrawer();
  };
  const newChat = () => {
    createSession();
    navigation.closeDrawer();
  };

  return (
    <View style={styles.sidebar}>
      <View style={styles.brandRow}>
        <SparkleMark size={30} />
        <View>
          <Text style={[styles.brand, { color: p.onSurface }]}>AdoetzGPT</Text>
          <Text style={{ color: p.onSurfaceVariant, fontSize: 12 }}>{userName}</Text>
        </View>
      </View>

      <Pressable
        onPress={newChat}
        style={[styles.newBtn, { backgroundColor: p.primary, borderRadius: p.controlRadius }]}
      >
        <Plus size={18} color="#FFFFFF" />
        <Text style={styles.newBtnText}>New chat</Text>
      </Pressable>

      <ScrollView style={styles.sessionList}>
        {sessions.map((s) => {
          const active = s.id === currentSessionId;
          const last = s.messages.length > 0 ? s.messages[s.messages.length - 1].text : 'New chat';
          return (
            <Pressable
              key={s.id}
              onPress={() => {
                selectSession(s.id);
                navigation.closeDrawer();
              }}
              style={[
                styles.sessionItem,
                {
                  borderColor: active ? withAlpha(p.primary, 0.3) : p.outline,
                  backgroundColor: active ? withAlpha(p.primary, 0.1) : 'transparent',
                  borderRadius: p.controlRadius,
                },
              ]}
            >
              {s.pinned ? <Pin size={12} color={p.onSurfaceVariant} /> : null}
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: active ? p.primary : p.onSurface, fontWeight: active ? '700' : '500', fontSize: 13 }}>
                  {s.title}
                </Text>
                <Text numberOfLines={1} style={{ color: p.onSurfaceVariant, fontSize: 11 }}>
                  {last}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.navGroup}>
        <NavButton Icon={MessageSquare} label="Chat" active={currentView === 'chat'} onPress={() => go('chat')} />
        <NavButton Icon={SettingsIcon} label="Settings" active={currentView === 'settings'} onPress={() => go('settings')} />
        <NavButton Icon={BarChart3} label="Token usage" active={currentView === 'tokenUsage'} onPress={() => go('tokenUsage')} />
      </View>

      <Pressable
        onPress={() => void signOut()}
        style={[styles.signOut, { borderRadius: p.controlRadius }]}
      >
        <LogOut size={16} color={p.error} />
        <Text style={{ color: p.error, fontWeight: '600' }}>Sign out</Text>
      </Pressable>
    </View>
  );
}

export default function MainShell() {
  const { palette: p } = useAppTheme();
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        overlayColor: 'transparent',
        drawerStyle: { backgroundColor: p.surface, width: 300 },
      }}
      drawerContent={(props: DrawerContentComponentProps) => <Sidebar {...props} />}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  sidebar: { flex: 1, padding: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  brand: { fontWeight: '800', fontSize: 16 },
  newBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  newBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  sessionList: { flex: 1, marginVertical: 10 },
  sessionItem: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
  navGroup: { gap: 4, marginBottom: 8 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
});
