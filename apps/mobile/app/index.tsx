import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Redirect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { useAuth } from "../src/auth/auth-context";
import { colors, shadows, radii } from "../src/theme";
import {
  BookOpen,
  MessageSquare,
  GraduationCap,
  Users,
} from "lucide-react-native";

// ─── Animation wrappers ──────────────────────────────────────────────────────

function FadeSlideIn({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }),
    );
    translateY.value = withDelay(
      delay,
      withSpring(0, { damping: 14, stiffness: 90 }),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

// ─── Logo animé ───────────────────────────────────────────────────────────────

function AnimatedLogo() {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(-15);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600 });
    scale.value = withSpring(1, { damping: 12, stiffness: 100 });
    rotate.value = withSpring(0, { damping: 10, stiffness: 80 });
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.View style={style}>
      <View style={styles.logoRing}>
        <View style={styles.logoInner}>
          <Text style={styles.logoText}>SL</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Tab selector ─────────────────────────────────────────────────────────────

type AuthTab = "phone" | "email" | "sso";

const TAB_LABELS: Record<AuthTab, string> = {
  phone: "Téléphone",
  email: "Email",
  sso: "SSO",
};

function TabBar({
  active,
  onSelect,
}: {
  active: AuthTab;
  onSelect: (t: AuthTab) => void;
}) {
  return (
    <View style={styles.tabBar}>
      {(["phone", "email", "sso"] as AuthTab[]).map((tab) => (
        <TouchableOpacity
          key={tab}
          onPress={() => onSelect(tab)}
          style={[styles.tabItem, active === tab && styles.tabItemActive]}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.tabLabel, active === tab && styles.tabLabelActive]}
          >
            {TAB_LABELS[tab]}
          </Text>
          {active === tab && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Champ texte stylé ────────────────────────────────────────────────────────

function StyledInput({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  error,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: TextInput["props"]["keyboardType"];
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          focused && styles.inputWrapperFocused,
          !!error && styles.inputWrapperError,
        ]}
      >
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary + "88"}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {!!error && <Text style={styles.inputError}>{error}</Text>}
    </View>
  );
}

// ─── Bouton principal ─────────────────────────────────────────────────────────

function PrimaryButton({
  label,
  onPress,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryBtnGradient}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.primaryBtnText}>{label}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Formulaire Phone + PIN ───────────────────────────────────────────────────

function PhoneForm({
  schoolSlug,
  onSelectSchool,
}: {
  schoolSlug: string | null;
  onSelectSchool: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [errors, setErrors] = useState<{ phone?: string; pin?: string }>({});
  const [loading, setLoading] = useState(false);
  const { signInWithCredentials } = useAuth();

  const validate = () => {
    const e: typeof errors = {};
    if (!phone || phone.replace(/\D/g, "").length < 9)
      e.phone = "Numéro invalide (9 chiffres min.)";
    if (!pin || pin.length !== 6) e.pin = "Le PIN doit faire 6 chiffres";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signInWithCredentials({ email: phone, password: pin });
    } catch {
      setErrors({ phone: "Identifiants incorrects" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      <StyledInput
        label="Numéro de téléphone"
        placeholder="Ex : 0612345678"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        error={errors.phone}
      />
      <StyledInput
        label="Code PIN (6 chiffres)"
        placeholder="● ● ● ● ● ●"
        value={pin}
        onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, 6))}
        secureTextEntry
        keyboardType="number-pad"
        error={errors.pin}
      />
      {!schoolSlug && (
        <TouchableOpacity onPress={onSelectSchool} style={styles.linkRow}>
          <Text style={styles.linkText}>Choisir une école d'abord →</Text>
        </TouchableOpacity>
      )}
      <PrimaryButton
        label="Se connecter"
        onPress={handleSubmit}
        loading={loading}
      />
    </View>
  );
}

// ─── Formulaire Email + Mot de passe ─────────────────────────────────────────

function EmailForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const { signInWithCredentials } = useAuth();

  const validate = () => {
    const e: typeof errors = {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "Adresse email invalide";
    if (!password || password.length < 6)
      e.password = "Mot de passe trop court";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signInWithCredentials({ email, password });
    } catch {
      setErrors({ email: "Identifiants incorrects" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      <StyledInput
        label="Adresse email"
        placeholder="vous@exemple.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        error={errors.email}
      />
      <StyledInput
        label="Mot de passe"
        placeholder="••••••••"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={errors.password}
      />
      <PrimaryButton
        label="Se connecter"
        onPress={handleSubmit}
        loading={loading}
      />
      <TouchableOpacity style={styles.forgotLink}>
        <Text style={styles.linkText}>Mot de passe oublié ?</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── SSO ─────────────────────────────────────────────────────────────────────

function SsoForm() {
  return (
    <View style={styles.formContainer}>
      <Text style={styles.ssoHint}>
        Connectez-vous avec le compte fourni par votre école.
      </Text>
      <TouchableOpacity style={styles.ssoButton} activeOpacity={0.8}>
        <View style={styles.ssoIconCircle}>
          <Text style={styles.ssoIconText}>G</Text>
        </View>
        <Text style={styles.ssoButtonText}>Continuer avec Google</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.ssoButton, styles.ssoButtonApple]}
        activeOpacity={0.8}
      >
        <View style={[styles.ssoIconCircle, styles.ssoIconCircleApple]}>
          <Text style={[styles.ssoIconText, styles.ssoIconTextApple]}>⌘</Text>
        </View>
        <Text style={[styles.ssoButtonText, styles.ssoButtonTextApple]}>
          Continuer avec Apple
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIcon}>{icon}</View>
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

// ─── Écran principal ─────────────────────────────────────────────────────────

export default function LandingScreen() {
  const { isBootstrapping, signedIn, schoolSlug, selectSchool } = useAuth();
  const [activeTab, setActiveTab] = useState<AuthTab>("email");
  const [schoolInput, setSchoolInput] = useState("");
  const [showSchoolInput, setShowSchoolInput] = useState(false);

  if (isBootstrapping) {
    return (
      <LinearGradient
        colors={[colors.primaryDark, colors.primary]}
        style={styles.bootScreen}
      >
        <AnimatedLogo />
        <ActivityIndicator
          color={colors.white}
          size="large"
          style={{ marginTop: 32 }}
        />
      </LinearGradient>
    );
  }

  if (signedIn) {
    return <Redirect href="/(tabs)" />;
  }

  const handleSelectSchool = async () => {
    if (schoolInput.trim()) {
      await selectSchool(schoolInput.trim());
      setShowSchoolInput(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Hero ────────────────────────────────────────── */}
        <LinearGradient
          colors={[colors.primaryDark, colors.primary, "#2480D0"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1.2 }}
          style={styles.hero}
        >
          <FadeSlideIn delay={0}>
            <AnimatedLogo />
          </FadeSlideIn>

          <FadeSlideIn delay={200}>
            <Text style={styles.heroTitle}>Scolive</Text>
            <Text style={styles.heroSubtitle}>
              La vie scolaire, simplifiée.
            </Text>
          </FadeSlideIn>

          {/* Features chips */}
          <FadeSlideIn delay={400}>
            <View style={styles.featuresRow}>
              <FeatureCard
                icon={<GraduationCap size={18} color={colors.warmAccent} />}
                label="Notes"
              />
              <FeatureCard
                icon={<MessageSquare size={18} color={colors.warmAccent} />}
                label="Messagerie"
              />
              <FeatureCard
                icon={<BookOpen size={18} color={colors.warmAccent} />}
                label="Cahier de vie"
              />
              <FeatureCard
                icon={<Users size={18} color={colors.warmAccent} />}
                label="Famille"
              />
            </View>
          </FadeSlideIn>
        </LinearGradient>

        {/* ── Carte de connexion ──────────────────────────── */}
        <FadeSlideIn delay={300}>
          <View style={styles.card}>
            {/* Sélection école */}
            {schoolSlug ? (
              <View style={styles.schoolBadge}>
                <Text style={styles.schoolBadgeText}>🏫 {schoolSlug}</Text>
                <TouchableOpacity onPress={() => setShowSchoolInput(true)}>
                  <Text style={styles.schoolBadgeChange}>Changer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.schoolPrompt}>
                <Text style={styles.schoolPromptTitle}>
                  Identifiant de votre école
                </Text>
                <View style={styles.schoolInputRow}>
                  <TextInput
                    style={styles.schoolInput}
                    placeholder="ex : lycee-victor-hugo"
                    placeholderTextColor={colors.textSecondary + "88"}
                    value={schoolInput}
                    onChangeText={setSchoolInput}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={handleSelectSchool}
                    style={styles.schoolConfirmBtn}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.schoolConfirmText}>OK</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {showSchoolInput && (
              <View style={styles.schoolPrompt}>
                <View style={styles.schoolInputRow}>
                  <TextInput
                    style={styles.schoolInput}
                    placeholder="Nouvel identifiant école"
                    placeholderTextColor={colors.textSecondary + "88"}
                    value={schoolInput}
                    onChangeText={setSchoolInput}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={handleSelectSchool}
                    style={styles.schoolConfirmBtn}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.schoolConfirmText}>OK</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={styles.cardTitle}>Connexion</Text>
            <Text style={styles.cardSubtitle}>
              Choisissez la méthode fournie par votre école
            </Text>

            <TabBar active={activeTab} onSelect={setActiveTab} />

            {activeTab === "phone" && (
              <PhoneForm
                schoolSlug={schoolSlug}
                onSelectSchool={() => setShowSchoolInput(true)}
              />
            )}
            {activeTab === "email" && <EmailForm />}
            {activeTab === "sso" && <SsoForm />}
          </View>
        </FadeSlideIn>

        {/* ── Footer ──────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2026 Scolive — Tous droits réservés
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Boot
  bootScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Logo
  logoRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  logoInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: colors.white,
    letterSpacing: 1,
  },

  // Hero
  hero: {
    paddingTop: 72,
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  heroTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 36,
    color: colors.white,
    textAlign: "center",
    marginTop: 16,
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontFamily: "Roboto_400Regular",
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginTop: 6,
  },

  // Features
  featuresRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 28,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  featureIcon: {},
  featureLabel: {
    fontFamily: "Roboto_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: radii.xl,
    padding: 24,
    ...shadows.cardStrong,
  },
  cardTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: 4,
    marginTop: 16,
  },
  cardSubtitle: {
    fontFamily: "Roboto_400Regular",
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },

  // School
  schoolBadge: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.warmHighlight,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.warmBorder,
  },
  schoolBadgeText: {
    fontFamily: "Roboto_500Medium",
    fontSize: 14,
    color: colors.textPrimary,
  },
  schoolBadgeChange: {
    fontFamily: "Roboto_400Regular",
    fontSize: 13,
    color: colors.primary,
  },
  schoolPrompt: {
    marginBottom: 12,
  },
  schoolPromptTitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  schoolInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  schoolInput: {
    flex: 1,
    backgroundColor: colors.warmSurface,
    borderWidth: 1,
    borderColor: colors.warmBorder,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Roboto_400Regular",
    fontSize: 14,
    color: colors.textPrimary,
  },
  schoolConfirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  schoolConfirmText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: colors.white,
  },

  // Tabs
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: colors.warmBorder,
    marginBottom: 24,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    position: "relative",
  },
  tabItemActive: {},
  tabLabel: {
    fontFamily: "Roboto_400Regular",
    fontSize: 14,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    fontFamily: "Roboto_500Medium",
    color: colors.primary,
  },
  tabIndicator: {
    position: "absolute",
    bottom: -1,
    left: "15%",
    right: "15%",
    height: 2.5,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },

  // Form
  formContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: "Roboto_500Medium",
    fontSize: 13,
    color: colors.textPrimary,
  },
  inputWrapper: {
    backgroundColor: colors.warmSurface,
    borderWidth: 1.5,
    borderColor: colors.warmBorder,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  inputWrapperError: {
    borderColor: colors.notification,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontFamily: "Roboto_400Regular",
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputError: {
    fontFamily: "Roboto_400Regular",
    fontSize: 12,
    color: colors.notification,
    marginTop: 2,
  },

  // Primary button
  primaryBtn: {
    borderRadius: radii.lg,
    overflow: "hidden",
    marginTop: 4,
    ...shadows.button,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnGradient: {
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: colors.white,
    letterSpacing: 0.3,
  },

  // Links
  linkRow: {
    alignItems: "flex-end",
    marginTop: -4,
  },
  linkText: {
    fontFamily: "Roboto_400Regular",
    fontSize: 13,
    color: colors.primary,
  },
  forgotLink: {
    alignItems: "center",
    paddingVertical: 4,
  },

  // SSO
  ssoHint: {
    fontFamily: "Roboto_400Regular",
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 20,
  },
  ssoButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    ...shadows.card,
  },
  ssoButtonApple: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  ssoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.warmHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  ssoIconCircleApple: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  ssoIconText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    color: colors.primary,
  },
  ssoIconTextApple: {
    color: colors.white,
  },
  ssoButtonText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
    color: colors.textPrimary,
    flex: 1,
    textAlign: "center",
  },
  ssoButtonTextApple: {
    color: colors.white,
  },

  // Footer
  footer: {
    paddingVertical: 28,
    alignItems: "center",
  },
  footerText: {
    fontFamily: "Roboto_400Regular",
    fontSize: 12,
    color: colors.textSecondary,
  },
});
