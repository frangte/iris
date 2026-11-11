import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorNote, Field, Section, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { MaxWidth, Space, useColors } from '@/lib/theme';

export default function SignIn() {
  const c = useColors();
  const { signIn } = useSession();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.requestOtp(email.trim());
      setDevCode(res.devCode ?? null);
      setStep('code');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value = code) => {
    if (value.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.verifyOtp(email.trim(), value);
      await signIn(res.token);
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.groupedBackground }]}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.column}>
          <View style={styles.hero}>
            <T variant="largeTitle">Floied</T>
            <T variant="body" tone="secondary">
              Sổ đơn chung cho shop hoa. Cả shop cùng thấy đơn hôm nay, đơn trễ và tiền còn thu.
            </T>
          </View>

          {step === 'email' ? (
            <>
              <Section title="Đăng nhập bằng email" footer="Chúng tôi gửi mã 6 số vào email này. Không cần mật khẩu.">
                <Field
                  value={email}
                  onChangeText={setEmail}
                  placeholder="ten@email.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  inputMode="email"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={sendCode}
                  autoFocus
                  accessibilityLabel="Email"
                />
              </Section>
              <Button title="Gửi mã" onPress={sendCode} loading={busy} disabled={!email.includes('@')} style={styles.cta} />
            </>
          ) : (
            <>
              <Section
                title={`Mã đã gửi tới ${email.trim()}`}
                footer={devCode ? `Bản dev: mã là ${devCode}` : 'Mã có hiệu lực trong 10 phút. Kiểm tra cả mục Spam.'}>
                <Field
                  value={code}
                  onChangeText={(t) => {
                    const digits = t.replace(/\D/g, '').slice(0, 6);
                    setCode(digits);
                    if (digits.length === 6) verify(digits);
                  }}
                  placeholder="6 chữ số"
                  keyboardType="number-pad"
                  inputMode="numeric"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  style={styles.code}
                  accessibilityLabel="Mã đăng nhập"
                />
              </Section>
              <Button title="Đăng nhập" onPress={() => verify()} loading={busy} disabled={code.length !== 6} style={styles.cta} />
              <Button
                title="Đổi email hoặc gửi lại mã"
                variant="plain"
                onPress={() => {
                  setStep('email');
                  setCode('');
                  setError(null);
                }}
              />
            </>
          )}
          {error ? <ErrorNote error={error} /> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: MaxWidth / 1.4, alignSelf: 'center', paddingHorizontal: Space.lg, flex: 1, justifyContent: 'center' },
  hero: { gap: Space.sm, paddingHorizontal: Space.xs, marginBottom: Space.sm },
  cta: { marginTop: Space.lg },
  code: { letterSpacing: 6, fontVariant: ['tabular-nums'] },
});
