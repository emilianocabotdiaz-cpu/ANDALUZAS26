import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { API_URL, isSupabaseConfigured } from "./src/config";
import { supabase } from "./src/supabase";

type Message = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
};

const welcomeMessage: Message = {
  id: "welcome",
  role: "assistant",
  text: "Bienvenido companero. Estoy para ayudarte a ser Policia. Preguntame una duda, pideme un test o prepara un repaso.",
};

function shortTitle(text: string) {
  const cleaned = text.trim().replace(/\s+/g, " ");
  return cleaned.length > 34 ? `${cleaned.slice(0, 34)}...` : cleaned || "Nuevo chat";
}

function newConversation(): Conversation {
  return {
    id: `${Date.now()}`,
    title: "Nuevo chat",
    messages: [welcomeMessage],
    createdAt: new Date().toISOString(),
  };
}

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [paidAccess, setPaidAccess] = useState(false);
  const [activeId, setActiveId] = useState("initial");
  const [conversations, setConversations] = useState<Conversation[]>([
    { ...newConversation(), id: "initial" },
  ]);
  const drawerX = useRef(new Animated.Value(-310)).current;
  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeId) ?? conversations[0],
    [activeId, conversations]
  );

  useEffect(() => {
    Animated.timing(drawerX, {
      toValue: drawerOpen ? 0 : -310,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [drawerOpen, drawerX]);

  useEffect(() => {
    async function loadSession() {
      if (!supabase) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      setUserEmail(session.user.email ?? "");
      await refreshMembership(session.access_token);
    }

    async function handleUrl(url: string | null) {
      if (!url || !supabase) return;
      const parsed = Linking.parse(url);
      const code = typeof parsed.queryParams?.code === "string" ? parsed.queryParams.code : "";

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setNotice(`No se pudo iniciar sesion: ${error.message}`);
          return;
        }
        setUserEmail(data.session?.user.email ?? "");
        if (data.session?.access_token) {
          await refreshMembership(data.session.access_token);
        }
        setNotice("Sesion iniciada. Seguimos, compi.");
      }
    }

    loadSession();
    Linking.getInitialURL().then(handleUrl);

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url);
    });

    return () => subscription.remove();
  }, []);

  async function refreshMembership(token: string) {
    try {
      const response = await fetch(`${API_URL}/api/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const profile = await response.json();
      setPaidAccess(Boolean(profile.hasAccess));
    } catch {
      setNotice("No pude comprobar tu membresia ahora.");
    }
  }

  function updateActiveConversation(messages: Message[], title?: string) {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeId
          ? { ...conversation, messages, title: title ?? conversation.title }
          : conversation
      )
    );
  }

  function startNewChat() {
    const conversation = newConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    setDrawerOpen(false);
  }

  async function signIn() {
    if (!supabase || !isSupabaseConfigured) {
      setNotice("Configura Supabase en mobile/.env para activar el login.");
      return;
    }

    if (!loginEmail.trim()) {
      setNotice("Escribe tu email.");
      return;
    }

    const redirectTo = Linking.createURL("auth/callback");
    const { error } = await supabase.auth.signInWithOtp({
      email: loginEmail.trim(),
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    setNotice(error ? `Supabase: ${error.message}` : "Te he enviado un enlace de acceso al email.");
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setUserEmail("");
    setPaidAccess(false);
    setNotice("Sesion cerrada.");
  }

  async function openMembership() {
    if (!userEmail) {
      setNotice("Primero inicia sesion para vincular la membresia.");
      setDrawerOpen(true);
      return;
    }

    const {
      data: { session },
    } = supabase ? await supabase.auth.getSession() : { data: { session: null } };

    try {
      const response = await fetch(`${API_URL}/api/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ plan: "monthly", email: userEmail }),
      });
      const checkout = await response.json();

      if (checkout.url) {
        await WebBrowser.openBrowserAsync(checkout.url);
        return;
      }

      setNotice(checkout.error ?? "No se pudo abrir la membresia.");
    } catch {
      setNotice("No se pudo conectar con Stripe.");
    }
  }

  async function sendMessage() {
    const text = prompt.trim();
    if (!text || busy) return;

    const userMessage: Message = { id: `${Date.now()}-user`, role: "user", text };
    const nextMessages = [...activeConversation.messages, userMessage];
    updateActiveConversation(nextMessages, activeConversation.title === "Nuevo chat" ? shortTitle(text) : undefined);
    setPrompt("");
    setBusy(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text, mode: "dudas" }),
      });
      const data = await response.json();
      const assistantMessage: Message = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        text: data.reply ?? data.error ?? "No pude responder ahora.",
      };
      updateActiveConversation([...nextMessages, assistantMessage]);
    } catch {
      updateActiveConversation([
        ...nextMessages,
        { id: `${Date.now()}-error`, role: "assistant", text: "No pude conectar con OpoCompi ahora." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.app}>
        <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerX }] }]}>
          <View style={styles.drawerHeader}>
            <Text style={styles.logo}>OpoCompi</Text>
            <Pressable onPress={() => setDrawerOpen(false)} style={styles.iconButton}>
              <Text style={styles.iconText}>X</Text>
            </Pressable>
          </View>

          <Pressable onPress={startNewChat} style={styles.primaryItem}>
            <Text style={styles.primaryItemText}>Nuevo chat</Text>
          </Pressable>

          <Text style={styles.drawerLabel}>Historial</Text>
          <ScrollView style={styles.history}>
            {conversations.map((conversation) => (
              <Pressable
                key={conversation.id}
                onPress={() => {
                  setActiveId(conversation.id);
                  setDrawerOpen(false);
                }}
                style={[styles.historyItem, conversation.id === activeId && styles.historyItemActive]}
              >
                <Text style={styles.historyText}>{conversation.title}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.drawerLinks}>
            <Pressable onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/actualidad`)} style={styles.drawerLink}>
              <Text>Actualidad</Text>
            </Pressable>
            <Pressable onPress={openMembership} style={styles.drawerLink}>
              <Text>{paidAccess ? "Membresia activa" : "Activar membresia"}</Text>
            </Pressable>
          </View>

          <View style={styles.account}>
            <Text style={styles.drawerLabel}>Cuenta</Text>
            {userEmail ? (
              <>
                <Text style={styles.accountEmail}>{userEmail}</Text>
                <Pressable onPress={signOut} style={styles.secondaryButton}>
                  <Text>Cerrar sesion</Text>
                </Pressable>
              </>
            ) : (
              <>
                <TextInput
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  placeholder="tu@email.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
                <Pressable onPress={signIn} style={styles.secondaryButton}>
                  <Text>Entrar con email</Text>
                </Pressable>
              </>
            )}
          </View>
        </Animated.View>

        {drawerOpen ? <Pressable onPress={() => setDrawerOpen(false)} style={styles.backdrop} /> : null}

        <View style={styles.header}>
          <Pressable onPress={() => setDrawerOpen(true)} style={styles.iconButton}>
            <Text style={styles.iconText}>☰</Text>
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>OpoCompi</Text>
            <Text style={styles.headerSubtitle}>{paidAccess ? "Membresia activa" : "Chat de oposicion"}</Text>
          </View>
        </View>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <ScrollView contentContainerStyle={styles.messages}>
          {activeConversation.messages.map((message) => (
            <View key={message.id} style={[styles.bubble, message.role === "user" ? styles.userBubble : styles.assistantBubble]}>
              <Text style={[styles.author, message.role === "user" && styles.userAuthor]}>
                {message.role === "user" ? "Tu" : "OpoCompi"}
              </Text>
              <Text style={[styles.messageText, message.role === "user" && styles.userText]}>{message.text}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Pregunta, pide un test o prepara un repaso..."
            multiline
            style={styles.composerInput}
          />
          <Pressable onPress={() => sendMessage()} style={styles.sendButton} disabled={busy}>
            <Text style={styles.sendButtonText}>{busy ? "..." : "Enviar"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  app: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    width: 310,
    padding: 18,
    backgroundColor: "#f7f8fa",
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
  },
  backdrop: {
    position: "absolute",
    zIndex: 10,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.24)",
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  logo: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0b3b82",
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  iconText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
  },
  primaryItem: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#0b3b82",
  },
  primaryItemText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  drawerLabel: {
    marginTop: 18,
    marginBottom: 8,
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
  },
  history: {
    maxHeight: 260,
  },
  historyItem: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  historyItemActive: {
    backgroundColor: "#eaf2ff",
  },
  historyText: {
    color: "#111111",
    fontWeight: "600",
  },
  drawerLinks: {
    gap: 8,
    marginTop: 12,
  },
  drawerLink: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  account: {
    marginTop: "auto",
    gap: 8,
  },
  accountEmail: {
    color: "#374151",
  },
  input: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  secondaryButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  header: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "#6b7280",
    fontSize: 13,
  },
  notice: {
    padding: 12,
    color: "#0b3b82",
    backgroundColor: "#eaf2ff",
    fontWeight: "700",
  },
  messages: {
    padding: 16,
    gap: 12,
  },
  bubble: {
    maxWidth: "88%",
    padding: 14,
    borderRadius: 16,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#f3f4f6",
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#0b3b82",
  },
  author: {
    marginBottom: 4,
    color: "#0b3b82",
    fontSize: 12,
    fontWeight: "800",
  },
  userAuthor: {
    color: "#dbeafe",
  },
  messageText: {
    color: "#111111",
    lineHeight: 21,
  },
  userText: {
    color: "#ffffff",
  },
  composer: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  composerInput: {
    flex: 1,
    maxHeight: 110,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sendButton: {
    minWidth: 82,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#0b3b82",
  },
  sendButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
});
