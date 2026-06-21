// MUST be first: polyfills global.crypto (getRandomValues) for `uuid`, which
// Hermes on Android does not provide by default. Without this, the store crashes
// at startup (Session.empty -> uuidv4 -> ReferenceError: crypto doesn't exist).
import 'react-native-get-random-values';

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
