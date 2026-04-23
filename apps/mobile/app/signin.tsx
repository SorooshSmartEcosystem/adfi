import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { colors, fontSizes, radii } from "@orb/ui";
import { supabase } from "../lib/supabase";

type Stage = "email" | "code";
type Status = "idle" | "busy" | "error";

export default function SignIn() {
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSendCode() {
    setStatus("busy");
    setErrorMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
    } else {
      setStage("code");
      setStatus("idle");
    }
  }

  async function handleVerify() {
    setStatus("busy");
    setErrorMessage("");
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
    } else {
      router.replace("/home");
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.form}>
        <View style={styles.header}>
          <View style={styles.dot} />
          <Text style={styles.brand}>ADFI</Text>
        </View>

        {stage === "email" ? (
          <>
            <Text style={styles.label}>what's your email?</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.ink4}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={status !== "busy"}
            />
            <Pressable
              style={[
                styles.button,
                (!email || status === "busy") && styles.buttonDisabled,
              ]}
              onPress={handleSendCode}
              disabled={!email || status === "busy"}
            >
              <Text style={styles.buttonText}>
                {status === "busy" ? "sending..." : "send me a code"}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.label}>code sent to {email}</Text>
            <TextInput
              style={styles.input}
              placeholder="6-digit code"
              placeholderTextColor={colors.ink4}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={6}
              editable={status !== "busy"}
            />
            <Pressable
              style={[
                styles.button,
                (!code || status === "busy") && styles.buttonDisabled,
              ]}
              onPress={handleVerify}
              disabled={!code || status === "busy"}
            >
              <Text style={styles.buttonText}>
                {status === "busy" ? "one second..." : "sign in"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setStage("email");
                setCode("");
                setErrorMessage("");
              }}
            >
              <Text style={styles.secondary}>use a different email</Text>
            </Pressable>
          </>
        )}

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
  },
  form: { width: "100%", maxWidth: 400, gap: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 9999,
    backgroundColor: colors.alive,
  },
  brand: {
    fontSize: fontSizes["4xl"],
    fontWeight: "500",
    color: colors.ink,
  },
  label: {
    fontSize: fontSizes.sm,
    color: colors.ink3,
    fontFamily: "Menlo",
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    fontSize: fontSizes.md,
    color: colors.ink,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: colors.bg,
    fontSize: fontSizes.md,
    fontWeight: "500",
  },
  secondary: {
    color: colors.ink3,
    fontSize: fontSizes.sm,
    fontFamily: "Menlo",
    textAlign: "center",
    textDecorationLine: "underline",
    marginTop: 12,
  },
  error: {
    color: colors.urgent,
    fontSize: fontSizes.sm,
    fontFamily: "Menlo",
  },
});
