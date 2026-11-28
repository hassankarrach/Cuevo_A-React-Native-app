import { useThemedStyles } from '../../theme/useThemedStyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, Pressable, Text, View } from 'react-native';
import type { ComponentProps, ReactNode } from 'react';
import type { LocalProfile } from '../../state/ProfileContext';
import AccountBadges from '../../components/AccountBadges';
import { profileStyles as baseStyles } from './profileStyles';

function AvatarContainer({ onPress, children, ...props }: Omit<ComponentProps<typeof Pressable>, 'children' | 'style'> & { children: ReactNode; style: ComponentProps<typeof View>['style'] }) {
  return onPress ? <Pressable onPress={onPress} {...props}>{children}</Pressable> : <View style={props.style} accessible accessibilityLabel={props.accessibilityLabel}>{children}</View>;
}

export default function ProfileHeader({ profile, verified, subscriptionActive, avatarColor, onPickPhoto, picking = false, subtitle, nameAction }: {
  profile: LocalProfile; verified?: boolean; subscriptionActive?: boolean; avatarColor?: string; onPickPhoto?: () => void; picking?: boolean; subtitle?: string; nameAction?: ReactNode;
}) {
  const styles = useThemedStyles(baseStyles);

  const editable = !!onPickPhoto;
  return <>
            <View style={styles.cover} accessible={false}>
              <View style={styles.coverGlow} />
              <View style={styles.orbit} />
              <View style={styles.orbitSmall} />
            </View>
    <View>
              <View style={styles.photoRow}>
                <AvatarContainer onPress={onPickPhoto} disabled={!onPickPhoto || picking} accessibilityRole="button" accessibilityLabel={editable ? "Change profile photo" : `${profile.displayName} profile photo`} style={styles.avatarButton}>
                  {profile.avatarUri || editable ? <Image source={profile.avatarUri ? { uri: profile.avatarUri } : require('../../../assets/avatars/cuevo-mascot.png')} style={styles.avatar} /> : <View style={[styles.avatar, styles.initialAvatar, { backgroundColor: avatarColor }]}><Text style={styles.initial}>{profile.displayName.charAt(0)}</Text></View>}
                  {editable && <View style={styles.camera}><Ionicons name="camera" size={13} color="#FFFFFF" accessible={false} /></View>}
                </AvatarContainer>
                <View style={styles.identity}>
                  <View style={styles.nameRow}>
                    <View style={styles.nameIdentity}>
                    <Text numberOfLines={1} style={styles.previewName}>{profile.displayName.trim() || 'Your name'}</Text>
                    <AccountBadges verified={verified} subscriptionActive={subscriptionActive} />
                    </View>
                    {nameAction}
                  </View>
                  <Text numberOfLines={2} style={styles.subtitle}>{subtitle ?? (profile.bio.trim() || 'Your music. Your people.')}</Text>
                </View>
              </View>
    </View>
  </>;
}
