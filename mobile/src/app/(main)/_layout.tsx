import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurTargetView, BlurView } from 'expo-blur';
import { useRef, useState, type ComponentRef } from 'react';
import { usePathname } from 'expo-router';
import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TabIcon from '../../components/navigation/TabIcon';
import TabBarBackdrop from '../../components/navigation/TabBarBackdrop';
import CreateMenu from '../../components/navigation/CreateMenu';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

const tabs = [
  { name: 'home' as const, href: '/home' as const, label: 'Home' },
  { name: 'rooms' as const, href: '/rooms' as const, label: 'Rooms' },
  { name: 'playlists' as const, href: '/playlists' as const, label: 'Playlists' },
];

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const blurTarget = useRef<ComponentRef<typeof View> | null>(null);
  const bottom = Math.max(insets.bottom, 16);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Tabs style={styles.layout}>
      <BlurTargetView ref={blurTarget} style={styles.content}><TabSlot style={styles.content} /></BlurTargetView>
      <TabBarBackdrop height={60 + bottom + 48} blurTarget={blurTarget} />
      <View pointerEvents="none" style={[styles.glass, { bottom }]}>
        <BlurView blurTarget={blurTarget} blurMethod="dimezisBlurViewSdk31Plus" intensity={45} tint="light" style={StyleSheet.absoluteFill} />
      </View>
      <TabList style={[styles.bar, { bottom }]}>
        {tabs.map((tab) => {
          const selected = pathname === tab.href;
          return <TabTrigger key={tab.name} name={tab.name} href={tab.href} accessibilityLabel={tab.label} style={[styles.tab, selected && styles.selectedTab]}>
            <TabIcon name={tab.name} selected={selected} />
            {selected && <Text numberOfLines={1} style={styles.tabLabel}>{tab.label}</Text>}
          </TabTrigger>;
        })}
      </TabList>
      <Pressable onPress={() => setMenuOpen(true)} accessibilityRole="button" accessibilityLabel="Create or join" style={({ pressed }) => [styles.add, { bottom: bottom + 1 }, pressed && styles.addPressed]}>
        <Ionicons name="add" size={31} color="#FFFFFF" accessible={false} />
      </Pressable>
      {menuOpen && <CreateMenu blurTarget={blurTarget} onClose={() => setMenuOpen(false)} />}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1, backgroundColor: '#FFFCF8' },
  content: { flex: 1 },
  glass: { position: 'absolute', left: 20, right: 94, height: 60, borderRadius: 30, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.2)' },
  bar: { position: 'absolute', left: 20, right: 94, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.95)', boxShadow: '0px 7px 22px rgba(71,43,26,0.08)', flexDirection: 'row', alignItems: 'center', padding: 4 },
  tab: { flex: 1, height: '100%', borderRadius: 26, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' },
  selectedTab: { flex: 1.7, backgroundColor: 'rgba(255,255,255,0.75)' },
  tabLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.text, flexShrink: 1 },
  add: { position: 'absolute', right: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, backgroundImage: 'linear-gradient(145deg, #FF8658 0%, #FF4D24 80%)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 5px 16px rgba(255,77,36,0.2)' },
  addPressed: { opacity: 0.8 },
});
