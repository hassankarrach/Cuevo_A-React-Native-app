import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';

export type AuthCredentials = { email: string; password: string };

export default function LoginFields({ newAccount = false, initialEmail = '', onChange }: { newAccount?: boolean; initialEmail?: string; onChange?: (credentials: AuthCredentials) => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  return (
    <View style={styles.fields}>
      <View style={[styles.fieldBorder, focused === 'email' && styles.focusedBorder]}>
        <View style={styles.fieldSurface}>
          <Ionicons name="person" size={22} color="#92979B" accessible={false} />
          <TextInput
            accessibilityLabel="Email address"
            placeholder="Email address"
            placeholderTextColor="#91969A"
            value={email}
            onChangeText={value => { setEmail(value); onChange?.({ email: value, password }); }}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
            selectionColor={colors.primary}
            underlineColorAndroid="transparent"
            style={styles.input}
          />
        </View>
      </View>
      <View style={[styles.fieldBorder, focused === 'password' && styles.focusedBorder]}>
        <View style={styles.fieldSurface}>
          <Ionicons name="lock-closed" size={22} color="#92979B" accessible={false} />
          <TextInput
            ref={passwordRef}
            accessibilityLabel="Password"
            placeholder="Password"
            placeholderTextColor="#91969A"
            value={password}
            onChangeText={value => { setPassword(value); onChange?.({ email, password: value }); }}
            onFocus={() => setFocused('password')}
            onBlur={() => setFocused(null)}
            secureTextEntry={!passwordVisible}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={newAccount ? "new-password" : "current-password"}
            textContentType={newAccount ? "newPassword" : "password"}
            returnKeyType="done"
            selectionColor={colors.primary}
            underlineColorAndroid="transparent"
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={styles.visibilityButton}
          >
            <Ionicons
              name={passwordVisible ? 'eye-off' : 'eye'}
              size={22}
              color="#92979B"
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 20,
  },
  fieldBorder: {
    padding: 1.5,
    borderRadius: 22,
    backgroundColor: '#F0F2F3',
    backgroundImage:
      'linear-gradient(125deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.9) 22%, rgba(255, 255, 255, 0) 48%, rgba(255, 255, 255, 0) 68%, rgba(255, 255, 255, 0.85) 100%)',
    boxShadow: '5px 7px 18px rgba(116, 129, 139, 0.13), -3px -3px 12px rgba(255, 255, 255, 0.95)',
  },
  focusedBorder: {
    backgroundColor: '#D4DADE',
  },
  fieldSurface: {
    minHeight: 60,
    borderRadius: 20.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 6,
    gap: 12,
    backgroundColor: '#F3F4F5',
    backgroundImage: 'linear-gradient(135deg, #EFF2F4 0%, #F7F7F8 100%)',
    boxShadow: 'inset 0px 1px 2px rgba(255, 255, 255, 0.95)',
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 60,
    paddingVertical: 16,
    fontFamily: fonts.input, letterSpacing: 0,
    fontSize: 15,
    color: colors.text,
  },
  visibilityButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
