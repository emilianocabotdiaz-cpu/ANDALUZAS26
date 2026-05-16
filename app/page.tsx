"use client";

import { FormEvent, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase-browser";

const modes = [
  { id: "dudas", label: "Dudas de temario" },
  { id: "test", label: "Generar test" },
  { id: "animo", label: "Compañero de ánimo" },
  { id: "plan", label: "Plan semanal" },
];

type Message = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
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
  "Bienvenido compañero, estoy para ayudarte a ser Policía. Lo vas a conseguir y lo vamos a celebrar. ¿Dime en qué te puedo ayudar, compi?";

const trialWelcomeMessage =
  "Puedes probarme gratis con 3 mensajes. Pregúntame una duda, pídeme un test o dime cómo llevas la semana.";

const modeSupportMessages: Record<string, string> = {
  dudas: "Perfecto, compañero. Volvemos a dudas de temario: vamos a dejarlo claro, corto y útil para examen.",
  test: "Vamos con test. Practicar es avanzar: cada fallo corregido te acerca un poco más a tu plaza.",
  animo: "Estoy contigo. Respira, ordenamos el día y damos el siguiente paso. Esto se construye bloque a bloque.",
  plan: "Buena decisión. Vamos a organizar el estudio para que hoy salgas con trabajo hecho y cabeza tranquila.",
};

const starterPrompts = [
  "Explícame la diferencia entre detención e identificación para examen.",
  "Hazme 5 preguntas tipo test sobre Constitución Española.",
  "Ayúdame a organizar una sesión de estudio de 45 minutos.",
];

export default function Home() {
  const [pageNotice, setPageNotice] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState<"monthly" | "yearly" | null>(null);
  const [paidAccess, setPaidAccess] = useState(false);
  const [demoUses, setDemoUses] = useState(0);
  const [mode, setMode] = useState("dudas");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [loginCooldown, setLoginCooldown] = useState(0);
  const [showLoginPanel, setShowLoginPanel] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installNotice, setInstallNotice] = useState("");
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
    const checkoutCancelled = params.get("checkout") === "cancelled";
    const storedPaidAccess = !isSupabaseConfigured && localStorage.getItem("opocompi-paid-access") === "true";
    const storedUses = Number(localStorage.getItem("opocompi-demo-uses") ?? "0");

    if (checkoutSuccess) {
      if (isSupabaseConfigured) {
        setPageNotice("Pago completado. Estamos comprobando tu suscripción; si tarda unos segundos, recarga la página.");
      } else {
        localStorage.setItem("opocompi-paid-access", "true");
        setPaidAccess(true);
        setPageNotice("Pago completado. Tu chat queda desbloqueado en este dispositivo.");
        setMessages([
          {
            id: "paid-welcome",
            role: "assistant",
            text: paidWelcomeMessage,
          },
        ]);
      }
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (checkoutCancelled) {
      setPageNotice("Pago cancelado. Puedes seguir usando la prueba gratuita si te quedan mensajes.");
      window.history.replaceState({}, "", window.location.pathname);
    }

    setPaidAccess(storedPaidAccess);
    setDemoUses(Number.isFinite(storedUses) ? storedUses : 0);

    const storedMessages = localStorage.getItem("opocompi-chat-messages");
    if (storedMessages && !checkoutSuccess && !storedPaidAccess) {
      try {
        const parsedMessages = JSON.parse(storedMessages) as Message[];
        if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
          setMessages(parsedMessages);
        }
      } catch {
        localStorage.removeItem("opocompi-chat-messages");
      }
    } else if (storedPaidAccess) {
      setMessages([
        {
          id: "paid-welcome",
          role: "assistant",
          text: paidWelcomeMessage,
        },
      ]);
    }

    async function loadSession() {
      if (!supabaseClient || !isSupabaseConfigured) return;

      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      if (!session) {
        setUserEmail("");
        return;
      }

      const email = session.user.email ?? "";
      setUserEmail(email);
      setCheckoutEmail((current) => current || email);
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
          setMessages([
            {
              id: "paid-welcome",
              role: "assistant",
              text: paidWelcomeMessage,
            },
          ]);
        }
      } catch {
        setPageNotice("No pude comprobar la suscripción ahora. Si acabas de entrar, recarga en unos segundos.");
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
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        setInstallNotice("La instalacion como app no esta disponible en este navegador.");
      });
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setIsStandalone(standalone);

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setIsStandalone(true);
      setInstallPrompt(null);
      setInstallNotice("OpoCompi ya esta instalada en tu movil.");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("opocompi-chat-messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (loginCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setLoginCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [loginCooldown]);

  function changeMode(nextMode: string) {
    if (nextMode === mode) return;
    setMode(nextMode);
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: modeSupportMessages[nextMode] ?? "Seguimos, compañero. Estoy contigo para avanzar paso a paso.",
      },
    ]);
  }

  async function startCheckout(plan: "monthly" | "yearly") {
    setPageNotice("");

    if (isSupabaseConfigured && !userEmail) {
      setPageNotice("Primero inicia sesión. Así la suscripción queda guardada en tu cuenta.");
      setShowLoginPanel(true);
      return;
    }

    if (!userEmail && !checkoutEmail.trim()) {
      setPageNotice("Escribe tu email para contratar la suscripción.");
      setShowLoginPanel(true);
      return;
    }

    setCheckoutLoading(plan);

    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ plan, email: userEmail || checkoutEmail }),
      });

      const checkout = await response.json();
      if (checkout.url) {
        window.location.href = checkout.url;
        return;
      }

      setPageNotice(checkout.error ?? "No se pudo abrir Stripe Checkout. Revisa las variables STRIPE_* en Vercel.");
    } catch {
      setPageNotice("No se pudo conectar con Stripe Checkout. Revisa Vercel y vuelve a hacer redeploy.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function loginWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPageNotice("");

    if (loginCooldown > 0) {
      setPageNotice(`Espera ${loginCooldown} segundos antes de pedir otro enlace. Revisa antes tu email.`);
      return;
    }

    if (!loginEmail.trim()) {
      setPageNotice("Escribe tu email para enviarte el enlace de acceso.");
      return;
    }

    setAuthLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: loginEmail }),
      });
      const data = await response.json();
      setPageNotice(data.message ?? data.error ?? "Revisa tu email para entrar.");
      if (response.ok) {
        setLoginCooldown(60);
        setShowLoginPanel(false);
      }
    } catch {
      setPageNotice("No pude enviar el enlace de acceso. Revisa Supabase y vuelve a intentarlo.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function loginWithGoogle() {
    setPageNotice("");

    if (!supabase || !isSupabaseConfigured) {
      setPageNotice("Supabase no esta configurado todavia para login.");
      return;
    }

    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setPageNotice(`Supabase: ${error.message}`);
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
    setCheckoutEmail("");
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        text: trialWelcomeMessage,
      },
    ]);
    setPageNotice("Sesión cerrada. Puedes volver a entrar cuando quieras, compi.");
  }

  async function installApp() {
    if (isStandalone) {
      setInstallNotice("OpoCompi ya esta funcionando como app.");
      setPageNotice("OpoCompi ya esta funcionando como app.");
      return;
    }

    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);
      setInstallNotice(
        choice.outcome === "accepted"
          ? "Listo. OpoCompi se esta instalando en tu movil."
          : "Sin problema. Puedes instalarla mas tarde desde el navegador."
      );
      setPageNotice(
        choice.outcome === "accepted"
          ? "Listo. OpoCompi se esta instalando en tu movil."
          : "Sin problema. Puedes instalarla mas tarde desde el navegador."
      );
      return;
    }

    const manualInstallMessage =
      "En iPhone: pulsa el boton Compartir de Safari y despues 'Anadir a pantalla de inicio'. En Android: abre el menu del navegador y pulsa instalar app.";
    setInstallNotice(manualInstallMessage);
    setPageNotice(manualInstallMessage);
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = prompt.trim();
    if (!text) return;

    if (!paidAccess && demoUses >= 3) {
      setPageNotice("Has usado los 3 mensajes gratuitos. Contrata la suscripción para desbloquear el chat completo.");
      document.querySelector("#membresia")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text }]);
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
        body: JSON.stringify({ message: text, mode }),
      });
      const data = await response.json();
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", text: data.reply ?? data.error ?? "No pude responder ahora." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="OpoCompi inicio">
          <span className="brand-mark logo-mark">
            <img src="/brand/opocompi-logo.png" alt="" />
          </span>
          <span>OpoCompi</span>
        </a>
        <nav className="nav" aria-label="Navegacion principal">
          {!paidAccess ? <a href="#membresia">Precios</a> : null}
          <a href="/app">Abrir APP</a>
          <a href="/actualidad">Actualidad</a>
          <a href="#asistente">Probar chat</a>
          <a href="/tests">Tests</a>
        </nav>
        <div className="topbar-actions">
          {!isStandalone ? (
            <button className="btn btn-secondary install-topbar" type="button" onClick={installApp}>
              Instalar APP
            </button>
          ) : null}
          {userEmail ? <span className="session-pill">{userEmail}</span> : null}
          {userEmail || paidAccess ? (
            <button className="btn btn-secondary" type="button" onClick={logout}>Salir</button>
          ) : (
            <button className="btn btn-secondary login-trigger" type="button" onClick={() => setShowLoginPanel((current) => !current)}>
              Iniciar sesión
            </button>
          )}
          {!paidAccess ? <a className="btn btn-primary" href="#asistente">Probar gratis</a> : null}
        </div>

        {showLoginPanel && !userEmail ? (
          <div className="login-popover" role="dialog" aria-label="Iniciar sesión">
            <form className="auth-form" onSubmit={loginWithEmail}>
              <label>
                Email
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="tu@email.com"
                />
              </label>
              <button className="btn btn-primary" type="submit" disabled={authLoading || loginCooldown > 0}>
                {authLoading ? "Enviando..." : loginCooldown > 0 ? `Reintentar en ${loginCooldown}s` : "Enviar enlace"}
              </button>
            </form>
            <div className="auth-divider"><span>o</span></div>
            <button className="btn btn-secondary google-btn" type="button" onClick={loginWithGoogle} disabled={authLoading}>
              Entrar con Google
            </button>
          </div>
        ) : null}
      </header>

      <main>
        {pageNotice ? (
          <div className="page-notice" role="status">
            {pageNotice}
          </div>
        ) : null}

        <section id="inicio" className="hero">
          <div className="hero-media" aria-hidden="true">
            <img src="/brand/police-banner.jpg" alt="" />
          </div>
          <div className="hero-content">
            <img className="hero-logo" src="/brand/opocompi-logo.png" alt="Logotipo de OpoCompi" />
            <p className="eyebrow">Tu primer compañero en la Policía</p>
            <h1>OpoCompi</h1>
            <p className="hero-copy">
              El primer asistente para opositores de policía basado en IA generativa propia y totalmente enfocada a Policía Nacional.
            </p>
            <div className="hero-actions">
              {paidAccess ? (
                <a className="btn btn-primary" href="#asistente">
                  Ir al chat
                </a>
              ) : (
                <button className="btn btn-primary" type="button" onClick={() => setShowLoginPanel(true)}>
                  Entrar o crear cuenta
                </button>
              )}
              {!paidAccess ? <a className="btn btn-secondary" href="#asistente">Probar chat</a> : null}
            </div>
          </div>
        </section>

        {!paidAccess ? (
          <section id="membresia" className="pricing">
            <div className="section-heading compact">
              <p className="eyebrow">Suscripción</p>
              <h2>Acceso completo al chat</h2>
              <p>Inicia sesión, elige plan y paga con Stripe. Al volver del pago, el chat y los tests quedan vinculados a tu cuenta.</p>
            </div>
            <div className="purchase-form">
              {userEmail ? (
                <p className="purchase-session">Vas a contratar con la cuenta <strong>{userEmail}</strong>.</p>
              ) : (
                <label>
                  Email para la suscripción
                  <input
                    type="email"
                    value={checkoutEmail}
                    onChange={(event) => setCheckoutEmail(event.target.value)}
                    placeholder="tu@email.com"
                  />
                </label>
              )}
            </div>
            <div className="pricing-grid two">
              <article className="price-card">
                <h3>Mensual</h3>
                <p className="price">9,90 EUR<span>/mes</span></p>
                <ul>
                  <li>Chat IA privado</li>
                  <li>Tests por bloque</li>
                  <li>Acompañamiento motivacional</li>
                </ul>
                <button className="btn btn-secondary" type="button" onClick={() => startCheckout("monthly")}>
                  {checkoutLoading === "monthly" ? "Abriendo pago..." : "Contratar mensual"}
                </button>
              </article>
              <article className="price-card featured">
                <div className="tag">Ahorro anual</div>
                <h3>Oposición completa</h3>
                <p className="price">90,90 EUR<span>/ano</span></p>
                <ul>
                  <li>Todo lo del plan mensual</li>
                  <li>Mejor precio para preparacion completa</li>
                  <li>Acceso continuado al chat</li>
                </ul>
                <button className="btn btn-primary" type="button" onClick={() => startCheckout("yearly")}>
                  {checkoutLoading === "yearly" ? "Abriendo pago..." : "Contratar anual"}
                </button>
              </article>
            </div>
          </section>
        ) : null}

        {!paidAccess ? (
          <section className="conversion-section">
            <div className="section-heading compact">
              <p className="eyebrow">Hecho para opositores</p>
              <h2>Menos bloqueo, mas practica</h2>
              <p>
                OpoCompi no sustituye tu temario: te acompaña para entenderlo, repasarlo y convertir dudas en entrenamiento.
              </p>
            </div>
            <div className="benefit-grid">
              <article>
                <strong>Respuesta inmediata</strong>
                <p>Pregunta una duda y recibe una explicación corta, ordenada y adaptada a oposición.</p>
              </article>
              <article>
                <strong>Tests para fijar</strong>
                <p>Practica con opciones A/B/C/D, corrige fallos y repasa los puntos debiles.</p>
              </article>
              <article>
                <strong>Ritmo de estudio</strong>
                <p>Recibe apoyo, planes breves y empuje cuando cuesta sentarse a estudiar.</p>
              </article>
            </div>
          </section>
        ) : null}

        {!paidAccess ? (
          <section className="how-section">
            <div className="how-copy">
              <p className="eyebrow">Como funciona</p>
              <h2>Pruebalo antes de pagar</h2>
              <p>Empieza con 3 mensajes gratis. Si te ayuda, desbloqueas el chat completo y la zona de tests.</p>
            </div>
            <div className="steps-list">
              <article>
                <span>1</span>
                <p>Haz una pregunta real de tu oposición.</p>
              </article>
              <article>
                <span>2</span>
                <p>Comprueba si la explicacion te ayuda a avanzar.</p>
              </article>
              <article>
                <span>3</span>
                <p>Activa la suscripción y sigue practicando cada día.</p>
              </article>
            </div>
          </section>
        ) : null}

        {!paidAccess ? (
          <section className="examples-section" aria-labelledby="examples-title">
            <div className="section-heading compact">
              <p className="eyebrow">Usalo en tu estudio diario</p>
              <h2 id="examples-title">Preguntas que puedes hacerle</h2>
              <p>OpoCompi esta pensado para convertir una duda, un bloqueo o un repaso en una respuesta practica.</p>
            </div>

            <div className="examples-grid">
              <article>
                <span>Temario</span>
                <p>Explícame la diferencia entre detención, identificación y cacheo como si fuera para examen.</p>
              </article>
              <article>
                <span>Test</span>
                <p>Hazme 10 preguntas tipo A/B/C/D sobre Constitución Española y corrige mis fallos.</p>
              </article>
              <article>
                <span>Repaso</span>
                <p>Resume este tema en puntos clave y dime qué suele caer más en preguntas tipo test.</p>
              </article>
              <article>
                <span>Ánimo</span>
                <p>Hoy estoy bloqueado con el estudio. Ayúdame a organizar una sesión corta de 45 minutos.</p>
              </article>
            </div>
          </section>
        ) : null}

        <section id="asistente" className="workspace">
          <div className="section-heading">
            <p className="eyebrow">{paidAccess ? "Zona de miembros" : "Prueba gratuita"}</p>
            <h2>{paidAccess ? "Tu chat privado de oposición" : "Habla con tu nuevo compañero"}</h2>
            <p>
              {paidAccess
                ? "Dime que tema llevas entre manos y avanzamos juntos, compi."
                : "Usa 3 mensajes gratis. Al contratar la suscripción, el chat queda desbloqueado para seguir estudiando."}
            </p>
          </div>

          <div className="app-shell">
            <aside className="side-panel">
              <div>
                <p className="panel-label">Estado</p>
                <div className={`member-badge ${paidAccess ? "active" : "locked"}`}>
                  {paidAccess ? "Suscripción activa" : `Prueba ${Math.min(demoUses, 3)}/3`}
                </div>
              </div>

              <div className="focus-card">
                <p className="panel-label">Acompañamiento</p>
                <p className="side-note">Pregunta lo que necesites y OpoCompi adaptará la respuesta a tu oposición.</p>
              </div>
            </aside>

            <section className="chat-card" aria-label="Chat con el asistente">
              <div className="chat-messages" aria-live="polite">
                {messages.map((message) => (
                  <article className={`message ${message.role}`} key={message.id}>
                    <span>{message.role === "user" ? "Tu" : "OpoCompi"}</span>
                    <div className="message-body">{renderMessageText(message.text)}</div>
                  </article>
                ))}
              </div>
              <form className="chat-form" onSubmit={sendMessage}>
                <div className="starter-prompts" aria-label="Ejemplos rapidos">
                  {starterPrompts.map((starter) => (
                    <button key={starter} type="button" onClick={() => setPrompt(starter)} disabled={busy}>
                      {starter}
                    </button>
                  ))}
                </div>
                <input
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  type="text"
                  placeholder="Ej.: Hazme 5 preguntas sobre Constitución Española"
                  disabled={busy}
                />
                <button className="btn btn-primary" type="submit" disabled={busy}>
                  {busy ? "Pensando..." : paidAccess ? "Enviar" : `Enviar (${Math.max(0, 3 - demoUses)} gratis)`}
                </button>
              </form>
            </section>
          </div>
        </section>

        {!paidAccess ? (
          <section className="cta-band">
            <div>
              <p className="eyebrow">Empieza hoy</p>
              <h2>Tu oposición no se prepara sola y nosotros te vamos a acompañar.</h2>
              <p className="install-copy">
                Instala OpoCompi en tu movil y llevalo siempre en la pantalla de inicio.
              </p>
              {installNotice ? <p className="install-notice">{installNotice}</p> : null}
            </div>
            <div className="cta-actions">
              <button className="btn btn-primary" type="button" onClick={installApp}>
                {isStandalone ? "APP instalada" : "Instalar APP"}
              </button>
              <a className="btn btn-secondary" href="#membresia">Ver suscripción</a>
            </div>
          </section>
        ) : null}

        {!paidAccess ? (
          <section className="faq-section" aria-labelledby="faq-title">
            <div className="section-heading compact">
              <p className="eyebrow">Antes de empezar</p>
              <h2 id="faq-title">Preguntas frecuentes</h2>
              <p>Lo importante, claro y sin letra pequena innecesaria.</p>
            </div>

            <div className="faq-grid">
              <article>
                <h3>¿OpoCompi sustituye a una academia?</h3>
                <p>No. Es un asistente de apoyo para resolver dudas, practicar tests y mantener ritmo de estudio. Tu temario y las fuentes oficiales siguen siendo la base.</p>
              </article>
              <article>
                <h3>¿Puedo probarlo antes?</h3>
                <p>Si. Puedes usar 3 mensajes gratis para comprobar si te ayuda con una duda real, un repaso o un pequeño test.</p>
              </article>
              <article>
                <h3>¿Puedo cancelar la suscripción?</h3>
                <p>Sí. Desde tu cuenta podrás gestionar la suscripción, cambiar tarjeta o cancelar desde el portal seguro de Stripe.</p>
              </article>
              <article>
                <h3>¿Las respuestas son siempre correctas?</h3>
                <p>La IA puede equivocarse. OpoCompi esta pensado para estudiar mejor, pero la normativa importante debe contrastarse con BOE, convocatoria y fuentes oficiales.</p>
              </article>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="footer">
        <p>OpoCompi debe usar contenido revisado por preparadores o fuentes oficiales antes de ponerse en produccion.</p>
        <nav aria-label="Enlaces legales">
          <a href="/aviso-legal">Aviso legal</a>
          <a href="/privacidad">Privacidad</a>
          <a href="/terminos">Terminos</a>
        </nav>
      </footer>
    </>
  );
}
