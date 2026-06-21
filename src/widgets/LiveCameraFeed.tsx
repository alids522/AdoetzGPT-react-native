// LiveCameraFeed — port of live_camera_feed_native.dart. Captures one JPEG
// frame per second (the Gemini Live cadence) and forwards it via onFrame.
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAppTheme } from '../ui/theme';

export default function LiveCameraFeed({
  useFrontCamera,
  onFrame,
}: {
  useFrontCamera: boolean;
  onFrame: (bytes: Uint8Array, mimeType: string) => void;
}) {
  const { palette: p } = useAppTheme();
  const cameraRef = React.useRef<CameraView>(null);
  const [permission] = useCameraPermissions();
  React.useEffect(() => {
    if (!permission?.granted) return;
    const interval = setInterval(async () => {
      const cam = cameraRef.current;
      if (!cam) return;
      try {
        const photo = await cam.takePictureAsync({ base64: true, quality: 0.6 });
        if (photo?.base64) {
          const bytes = Uint8Array.from(atob(photo.base64), (c) => c.charCodeAt(0));
          onFrame(bytes, 'image/jpeg');
        }
      } catch {
        // ignore frame capture errors
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [permission, onFrame]);

  if (!permission?.granted) {
    return <View style={[styles.placeholder, { backgroundColor: p.background }]} />;
  }
  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} facing={useFrontCamera ? 'front' : 'back'} style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  placeholder: { flex: 1 },
});
