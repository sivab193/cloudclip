import React, { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';

type Props = Omit<TextInputProps, 'secureTextEntry' | 'style'> & {
  containerStyle?: StyleProp<ViewStyle>;
};

export default function PasswordField({ containerStyle, placeholder, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const t = useTheme();

  return <View style={[styles.container, { backgroundColor: t.surface, borderColor: t.border }, containerStyle]}>
    <TextInput
      {...props}
      accessibilityLabel={props.accessibilityLabel ?? placeholder ?? 'Password'}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={props.autoComplete ?? 'password'}
      placeholder={placeholder}
      placeholderTextColor={props.placeholderTextColor ?? t.placeholder}
      secureTextEntry={!visible}
      style={[styles.input, { color: t.text }]}
    />
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      accessibilityState={{ disabled: props.editable === false }}
      disabled={props.editable === false}
      hitSlop={4}
      onPress={() => setVisible(value => !value)}
      style={styles.toggle}
    >
      <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={t.icon} />
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  container: { minHeight: 54, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  input: { flex: 1, minWidth: 0, minHeight: 52, paddingHorizontal: 16, fontSize: 16 },
  toggle: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
