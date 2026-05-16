"use client";

import { FormEvent, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase-browser";

type Message = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

type ConversationSummary = {
  id: string;
  title: string;
  updated_at: string;
};

function renderMessageText(text: string) {
  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return blocks.map((block, blockIndex) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const isList = lines.length > 1 && lines.every((line) => /^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line));

    if (isList) {
      return (
        <ul className="message-list" key={`${block}-${blockIndex}`}>
          {lines.map((line) => (
            <li key={line}>{line.replace(/^[-*]\s+/, "").replace(/^\d+[.)]\s+/, "")}</li>
          ))}
        </ul>
      );
    }

    return (
      <p className="message-paragraph" key={`${block}-${blockIndex}`}>
        {lines.map((line, lineIndex) => (
          <span key={`${line}-${lineIndex}`}>
            {line}
            {lineIndex < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    );
  });
}

const paidWelcomeMessage =
  "Bienvenido compañero, estoy para ayudarte a ser Policía. Lo vas a conseguir y lo vamos a celebrar. Dime en qué te puedo ayudar, compi.";

const trialWelcomeMessage =
  "Bienvenido a OpoCompi. Puedes probar 3 mensajes gratis; preguntame una duda, pideme un test o cuentame como llevas el estudio.";

function getConversationTitle(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 48 ? `${clean.slice(0, 48)}...` : clean || "Nuevo chat";
}

export default function OpoCompiAppPage() {
  const [notice, setNotice] = useState("");
  const [paidAccess, setPaidAccess] = useState(false);
  const [demoUses, setDemoUses] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loginCooldown, setLoginCooldown] = useState(0);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: trialWelcomeMessage,
    },
  ]);

  useEffect(() => {
    const supabaseClient = supabase;
    const params = new URLSearchParams(window.location.search);
    const checkoutSuccess = params.get("checkout") === "success";
    const storedPaidAccess = !isSupabaseConfigured && localStorage.getItem("opocompi-paid-access") === "true";
    const storedUses = Number(localStorage.getItem("opocompi-demo-uses") ?? "0");
    const storedMessages = localStorage.getItem("opocompi-chat-messages");

    if (checkoutSuccess) {
      setNotice("Pago completado. Estamos comprobando tu suscripción.");
      window.history.replaceState({}, "", window.location.pathname);
    }

    setPaidAccess(storedPaidAccess);
    setDemoUses(Number.isFinite(storedUses) ? storedUses : 0);

    if (storedMessages && !storedPaidAccess) {
      try {
        const parsedMessages = JSON.parse(storedMessages) as Message[];
        if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
          setMessages(parsedMessages);
        }
      } catch {
        localStorage.removeItem("opocompi-chat-messages");
      }
    } else if (storedPaidAccess) {
      setMessages([{ id: "paid-welcome", role: "assistant", text: paidWelcomeMessage }]);
    }

    async function loadSession() {
      if (!supabaseClient || !isSupabaseConfigured) return;

      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      if (!session) {
        setUserEmail("");
        setConversations([]);
        return;
      }

      const email = session.user.email ?? "";
      setUserEmail(email);
      setLoginEmail((current) => current || email);

      try {
        const response = await fetch("/api/me", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const profile = await response.json();
        if (profile.hasAccess) {
          localStorage.setItem("opocompi-paid-access", "true");
          setPaidAccess(true);
          await loadConversations(session.access_token);
        } else {
          setPaidAccess(false);
        }
      } catch {
        setNotice("No pude comprobar la suscripción ahora. Recarga en unos segundos.");
      }
    }

    loadSession();

    if (!supabaseClient || !isSupabaseConfigured) return;

    const { data: authListener } = supabaseClient.auth.onAuthStateChange(() => {
      loadSession();
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!paidAccess) {
      localStorage.setItem("opocompi-chat-messages", JSON.stringify(messages));
    }
  }, [messages, paidAccess]);

  useEffect(() => {
    if (loginCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setLoginCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [loginCooldown]);

  async function getAccessToken() {
    if (!supabase) return "";
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? "";
  }

  async function loadConversations(token?: string) {
    const accessToken = token ?? (await getAccessToken());
    if (!accessToken) return;

    setHistoryLoading(true);
    try {
      const response = await fetch("/api/conversations", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        setNotice(data.error ?? "No pude cargar el historial.");
        return;
      }

      const nextConversations = data.conversations ?? [];
      setConversations(nextConversations);

      if (nextConversations.length > 0 && !activeConversationId) {
        await openConversation(nextConversations[0].id, accessToken);
      } else if (nextConversations.length === 0 && messages[0]?.id !== "paid-welcome") {
        setMessages([{ id: "paid-welcome", role: "assistant", text: paidWelcomeMessage }]);
      }
    } catch {
      setNotice("No pude cargar el historial. Revisa que la tabla conversations exista en Supabase.");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function openConversation(id: string, token?: string) {
    const accessToken = token ?? (await getAccessToken());
    if (!accessToken) return;

    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        setNotice(data.error ?? "No pude abrir esta conversacion.");
        return;
      }

      setActiveConversationId(data.conversation.id);
      setMessages(
        Array.isArray(data.conversation.messages) && data.conversation.messages.length > 0
          ? data.conversation.messages
          : [{ id: "paid-welcome", role: "assistant", text: paidWelcomeMessage }],
      );
    } catch {
      setNotice("No pude abrir esta conversacion.");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function saveConversation(nextMessages: Message[], firstUserText: string) {
    if (!paidAccess || !supabase || !isSupabaseConfigured) return;

    const accessToken = await getAccessToken();
    if (!accessToken) return;

    const title = getConversationTitle(firstUserText);
    const method = activeConversationId ? "PATCH" : "POST";
    const url = activeConversationId ? `/api/conversations/${activeConversationId}` : "/api/conversations";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title,
          messages: nextMessages,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setNotice(data.error ?? "No pude guardar la conversacion.");
        return;
      }

      setActiveConversationId(data.conversation.id);
      await loadConversations(accessToken);
    } catch {
      setNotice("No pude guardar la conversacion. Revisa Supabase.");
    }
  }

  function newChat() {
    setActiveConversationId("");
    setMessages([{ id: "paid-welcome", role: "assistant", text: paidAccess ? paidWelcomeMessage : trialWelcomeMessage }]);
    setPrompt("");
    setNotice(paidAccess ? "Nuevo chat listo. Dime en que avanzamos, compi." : "");
  }

  async function deleteConversation(id: string) {
    const accessToken = await getAccessToken();
    if (!accessToken) return;

    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        setNotice(data.error ?? "No pude borrar esta conversacion.");
        return;
      }

      if (activeConversationId === id) {
        newChat();
      }
      await loadConversations(accessToken);
    } catch {
      setNotice("No pude borrar esta conversacion.");
    }
  }

  async function loginWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    if (loginCooldown > 0) {
      setNotice(`Espera ${loginCooldown} segundos antes de pedir otro enlace. Revisa antes tu email.`);
      return;
    }

    if (!loginEmail.trim()) {
      setNotice("Escribe tu email para enviarte el enlace de acceso.");
      return;
    }

    setAuthLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: loginEmail, redirectTo: `${window.location.origin}/app` }),
      });
      const data = await response.json();
      setNotice(data.message ?? data.error ?? "Revisa tu email para entrar.");
      if (response.ok) {
        setLoginCooldown(60);
      }
    } catch {
      setNotice("No pude enviar el enlace de acceso.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function logout() {
    if (supabase) {
      await supabase.auth.signOut();
    }

    localStorage.removeItem("opocompi-paid-access");
    localStorage.removeItem("opocompi-chat-messages");
    setPaidAccess(false);
    setUserEmail("");
    setConversations([]);
    setActiveConversationId("");
    setMessages([{ id: "welcome", role: "assistant", text: trialWelcomeMessage }]);
    setNotice("Sesión cerrada.");
  }

  async function openBillingPortal() {
    if (!supabase) {
      setNotice("Supabase no está configurado para gestionar la suscripción.");
      return;
    }

    setPortalLoading(true);
    setNotice("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        setNotice("Inicia sesión para gestionar tu suscripción.");
        return;
      }

      const response = await fetch("/api/billing-portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await response.json();

      if (!response.ok || !data.url) {
        setNotice(data.error ?? "No pude abrir la gestión de la suscripción.");
        return;
      }

      window.location.href = data.url;
    } catch {
      setNotice("No pude abrir la gestión de la suscripción.");
    } finally {
      setPortalLoading(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = prompt.trim();
    if (!text) return;

    if (!paidAccess && demoUses >= 3) {
      setNotice("Has usado los 3 mensajes gratuitos. Activa la suscripción para seguir con OpoCompi.");
      return;
    }

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", text };
    const messagesWithUser = [...messages, userMessage];

    setMessages(messagesWithUser);
    setPrompt("");
    setBusy(true);

    if (!paidAccess) {
      const nextUses = demoUses + 1;
      setDemoUses(nextUses);
      localStorage.setItem("opocompi-demo-uses", String(nextUses));
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text, mode: text.toLowerCase().includes("test") ? "test" : "dudas" }),
      });
      const data = await response.json();
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: data.reply ?? data.error ?? "No pude responder ahora.",
      };
      const nextMessages = [...messagesWithUser, assistantMessage];
      setMessages(nextMessages);
      await saveConversation(nextMessages, text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="chat-app-page">
      <aside className="chat-app-sidebar">
        <a className="brand" href="/app" aria-label="OpoCompi app">
          <span className="brand-mark logo-mark">
            <img src="/brand/opocompi-logo.png" alt="" />
          </span>
          <span>OpoCompi</span>
        </a>

        <button className="btn btn-primary chat-new-button" type="button" onClick={newChat}>
          Nuevo chat
        </button>

        <nav className="chat-app-nav" aria-label="Navegacion de la app">
          <a className="active" href="/app">Chat</a>
        </nav>

        <section className="chat-history" aria-label="Historial de chats">
          <p className="panel-label">Historial</p>
          {historyLoading ? <p className="history-empty">Cargando...</p> : null}
          {!historyLoading && conversations.length === 0 ? (
            <p className="history-empty">Tus conversaciones apareceran aqui.</p>
          ) : null}
          {conversations.map((conversation) => (
            <div className="history-item" key={conversation.id}>
              <button
                className={conversation.id === activeConversationId ? "active" : ""}
                type="button"
                onClick={() => openConversation(conversation.id)}
              >
                {conversation.title}
              </button>
              <button type="button" aria-label="Borrar conversacion" onClick={() => deleteConversation(conversation.id)}>
                Borrar
              </button>
            </div>
          ))}
        </section>

        <section className="chat-app-account">
          <p className="panel-label">Cuenta</p>
          <strong>{paidAccess ? "Suscripción activa" : `Prueba ${Math.min(demoUses, 3)}/3`}</strong>
          {userEmail ? <span>{userEmail}</span> : null}

          {!userEmail ? (
            <form onSubmit={loginWithEmail}>
              <input
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="tu@email.com"
              />
              <button className="btn btn-secondary" type="submit" disabled={authLoading || loginCooldown > 0}>
                {authLoading ? "Enviando..." : loginCooldown > 0 ? `Reintentar en ${loginCooldown}s` : "Entrar"}
              </button>
            </form>
          ) : (
            <button className="btn btn-secondary" type="button" onClick={logout}>
              Salir
            </button>
          )}

          {paidAccess ? (
            <button className="btn btn-primary" type="button" onClick={openBillingPortal} disabled={portalLoading}>
              {portalLoading ? "Abriendo..." : "Gestionar suscripción"}
            </button>
          ) : (
            <a className="btn btn-primary" href="/#membresia">
              Activar suscripción
            </a>
          )}
        </section>
      </aside>

      <section className="chat-app-main" aria-label="Chat OpoCompi">
        <header className="chat-app-header">
          <div>
            <p className="eyebrow">Tu primer compañero en la Policía</p>
            <h1>¿Dime en que te puedo ayudar, compi?</h1>
          </div>
          <button className="btn btn-secondary" type="button" onClick={newChat}>
            Nuevo chat
          </button>
        </header>

        {notice ? <div className="chat-app-notice">{notice}</div> : null}

        <div className="chat-app-messages" aria-live="polite">
          {messages.map((message) => (
            <article className={`message ${message.role}`} key={message.id}>
              <span>{message.role === "user" ? "Tu" : "OpoCompi"}</span>
              <div className="message-body">{renderMessageText(message.text)}</div>
            </article>
          ))}
        </div>

        <form className="chat-app-form" onSubmit={sendMessage}>
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Pregunta una duda, pide un test o prepara un repaso..."
            disabled={busy}
          />
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Pensando..." : "Enviar"}
          </button>
        </form>
      </section>
    </main>
  );
}
