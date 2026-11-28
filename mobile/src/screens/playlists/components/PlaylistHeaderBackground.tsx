import { useId, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { PlaylistPalette } from '../../../theme/playlistThemes';

const definitions = `
<filter id="filter0_f_53_12302" x="-653" y="-1622" width="2850" height="2850" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="200" result="effect1_foregroundBlur_53_12302"/>
</filter>
<filter id="filter1_f_53_12302" x="-631" y="-1931" width="2357" height="2911" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="180" result="effect1_foregroundBlur_53_12302"/>
</filter>
<filter id="filter2_f_53_12302" x="-3" y="-1061" width="1927" height="1927" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="180" result="effect1_foregroundBlur_53_12302"/>
</filter>
<filter id="filter3_f_53_12302" x="780" y="-1101" width="1315" height="2007" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="200" result="effect1_foregroundBlur_53_12302"/>
</filter>
<filter id="filter4_f_53_12302" x="245.789" y="-1144.07" width="1822.34" height="1822.34" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="180" result="effect1_foregroundBlur_53_12302"/>
</filter>



`;
const createLayers = (palette: PlaylistPalette) => [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="none"><g>
<rect width="1920" height="1080" fill="${palette.base}"/>
<g filter="url(#filter0_f_53_12302)">
<circle cx="772" cy="-197" r="1025" fill="${palette.shadow}"/>
</g>
<g filter="url(#filter1_f_53_12302)">
<ellipse cx="547.5" cy="-475.5" rx="818.5" ry="1095.5" fill="${palette.forest}"/>
</g>
<g filter="url(#filter2_f_53_12302)">
<circle cx="960.5" cy="-97.5" r="603.5" fill="${palette.leaf}"/>
</g>
<g filter="url(#filter3_f_53_12302)">
<ellipse cx="1437.5" cy="-97.5" rx="257.5" ry="603.5" fill="${palette.shadow}"/>
</g>
<g filter="url(#filter4_f_53_12302)">
<circle cx="1156.96" cy="-232.898" r="551.142" fill="${palette.base}"/>
</g>

</g>
<defs>${definitions}</defs></svg>`];

export default function PlaylistHeaderBackground({ palette }: { palette: PlaylistPalette }) {
  const layers = createLayers(palette);
  const id = useId().replace(/:/g, '');
  const [size, setSize] = useState({ width: 0, height: 0 });
  // Native SVG blur radii use screen units rather than the SVG viewBox units.
  const nativeXml = (xml: string) => Platform.OS === 'web' ? xml : xml.replace(/stdDeviation="([0-9.]+)"/g, (_, value) => `stdDeviation="${Number(value) * size.width / 1920} ${Number(value) * size.height / 1080}"`);
  return <View onLayout={({ nativeEvent }) => setSize(nativeEvent.layout)} pointerEvents="none" accessible={false} style={styles.background}>
    {size.width > 0 && layers.map((xml, index) => <View key={index} style={[StyleSheet.absoluteFill]}>
      <SvgXml xml={nativeXml(xml).replaceAll('53_12302', `${id}-${index}`)} width="100%" height="100%" />
    </View>)}
    <View style={styles.grain}>
      <Image source={require('../../../../assets/decorations/playlist-header-figma-grain.jpeg')} resizeMode="stretch" style={styles.grainImage} />
    </View>
  </View>;
}
const styles = StyleSheet.create({
  background: { ...StyleSheet.absoluteFill, overflow: 'hidden', isolation: 'isolate' },
  grain: { ...StyleSheet.absoluteFill, opacity: 0.448, mixBlendMode: 'color-dodge' },
  // Figma’s pattern matrix scales its 4096×2304 noise image to 144.47% and centers it.
  grainImage: { position: 'absolute', width: '144.468%', height: '144.469%', left: '-22.2396%', top: '-22.2343%' },
});
