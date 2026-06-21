// RootNavigator — auth gate. Shows AuthScreen until there is a current user,
// then the MainShell (drawer + chat/settings/token-usage). Mirrors main.dart's
// `home: currentUser == null ? AuthScreen() : AppShell()`.
import * as React from 'react';
import { useAppStore } from '../state/store';
import AuthScreen from '../screens/AuthScreen';
import MainShell from '../screens/MainShell';

export default function RootNavigator() {
  const currentUser = useAppStore((s) => s.currentUser);
  return currentUser == null ? <AuthScreen /> : <MainShell />;
}
