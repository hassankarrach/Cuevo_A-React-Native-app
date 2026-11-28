import { useAppColors } from '../../../theme/useAppColors';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../../theme/fonts';

// Fixed campus location for this UI step, not the device's GPS position.
const CAMPUS = { latitude: 32.21864, longitude: -7.93605 };
const ZOOM = 16;
const TILE_SIZE = 256;
const n = 2 ** ZOOM;
const latitudeRadians = CAMPUS.latitude * Math.PI / 180;
const centerX = (CAMPUS.longitude + 180) / 360 * n;
const centerY = (1 - Math.asinh(Math.tan(latitudeRadians)) / Math.PI) / 2 * n;

export function NearbyMap({ anchor }: { anchor?: { x: number; y: number } }) {
  const styles = useThemedStyles(baseStyles);

  const colors = useAppColors();
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [failed, setFailed] = useState(false);
  const columns = Math.ceil(layout.width / TILE_SIZE) + 1;
  const rows = Math.ceil(layout.height / TILE_SIZE) + 1;
  const tiles = [];
  // Only request tiles intersecting the visible viewport. Image uses HTTP caching.
  for (let dx = -columns; dx <= columns; dx++) {
    for (let dy = -rows; dy <= rows; dy++) {
      const x = Math.floor(centerX) + dx;
      const y = Math.floor(centerY) + dy;
      const left = (x - centerX) * TILE_SIZE + (anchor?.x ?? layout.width / 2);
      const top = (y - centerY) * TILE_SIZE + (anchor?.y ?? layout.height / 2);
      if (left + TILE_SIZE <= 0 || left >= layout.width || top + TILE_SIZE <= 0 || top >= layout.height) continue;
      tiles.push(<Image key={`${x}/${y}`} accessible={false} onError={() => setFailed(true)} source={{
        uri: `https://tile.openstreetmap.org/${ZOOM}/${x}/${y}.png`,
        ...(Platform.OS !== 'web' ? { headers: { 'User-Agent': 'Cuevo/1.0 (nearby-campus-map)' } } : {}),
      }} style={{ position: 'absolute', left, top, width: TILE_SIZE, height: TILE_SIZE, opacity: 0.48 }} />);
    }
  }
  return <View style={styles.map} onLayout={event => setLayout(event.nativeEvent.layout)}>
    {layout.width > 0 && tiles}
    {colors.dark && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(12,13,12,0.70)' }]} />}
    {failed && <Text style={styles.error}>Map unavailable. Check your connection.</Text>}
  </View>;
}

const baseStyles = StyleSheet.create({
  map: { ...StyleSheet.absoluteFill, backgroundColor: '#F1F0E9' },
  error: { position: 'absolute', top: '42%', alignSelf: 'center', fontFamily: fonts.regular, fontSize: 11, color: '#716460', backgroundColor: '#FAF9F5', padding: 8, borderRadius: 10 },
});
