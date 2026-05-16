type Check = {
  label: string;
  ok: boolean;
  help: string;
};

const checks: Check[] = [
  {
    label: "URL publica de la web",
    ok: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
    help: "NEXT_PUBLIC_SITE_URL debe apuntar a tu dominio de Vercel.",
  },
  {
    label: "OpenAI",
    ok: Boolean(process.env.OPENAI_API_KEY),
    help: "Necesario para que el chat responda con IA real.",
  },
  {
    label: "Stripe pagos",
    ok: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_MONTHLY && process.env.STRIPE_PRICE_YEARLY),
    help: "Necesario para abrir Stripe Checkout con planes mensual y anual.",
  },
  {
    label: "Stripe webhook",
    ok: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    help: "Necesario para activar o desactivar la suscripción automáticamente.",
  },
];

export default function SetupPage() {
  const ready = checks.filter((check) => check.ok).length;

  return (
    <main className="setup-page">
      <section className="setup-hero">
        <a className="brand" href="/" aria-label="Volver a OpoCompi">
          <span className="brand-mark logo-mark">
            <img src="/brand/opocompi-logo.png" alt="" />
          </span>
          <span>OpoCompi</span>
        </a>
        <p className="eyebrow">Estado de produccion</p>
        <h1>Configuracion</h1>
        <p>
          Esta pagina comprueba si Vercel tiene las variables necesarias para el MVP: prueba gratuita, pago con Stripe y chat IA.
          No muestra claves, solo si existen.
        </p>
        <div className="setup-score">
          <strong>{ready}/{checks.length}</strong>
          <span>bloques configurados</span>
        </div>
      </section>

      <section className="setup-grid" aria-label="Comprobaciones de configuracion">
        {checks.map((check) => (
          <article className="setup-check" key={check.label}>
            <div className={`setup-dot ${check.ok ? "ok" : "pending"}`} />
            <div>
              <h2>{check.label}</h2>
              <p>{check.ok ? "Configurado" : check.help}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="setup-next">
        <h2>Siguiente paso</h2>
        <p>
          Cuando todos los bloques esten configurados, prueba el flujo completo: 3 mensajes gratis, pago de prueba en
          Stripe, vuelta a la web y chat desbloqueado.
        </p>
        <a className="btn btn-primary" href="/">Volver a la app</a>
      </section>
    </main>
  );
}
