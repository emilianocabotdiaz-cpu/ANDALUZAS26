# Checklist de produccion

## 1. Vercel

- Framework Preset: `Next.js`.
- Build Command: `next build`.
- Output Directory: vacio.
- Install Command: `npm install`.
- Variables de entorno cargadas desde `.env.example`.
- Visita `/setup` tras cada cambio de variables.

## 2. Stripe

- Crear producto mensual de 9,90 EUR.
- Crear producto anual de 90,90 EUR.
- Copiar ambos price IDs en Vercel.
- Crear webhook:

```text
https://tu-dominio.vercel.app/api/stripe-webhook
```

- Eventos:

```text
checkout.session.completed
customer.subscription.updated
customer.subscription.deleted
```

- Copiar `STRIPE_WEBHOOK_SECRET` en Vercel.

## 3. OpenAI

- Crear API key.
- Guardar `OPENAI_API_KEY` en Vercel.
- Mantener `OPENAI_MODEL=gpt-5.4-mini` para empezar.

## 4. Prueba completa

- Probar 3 mensajes gratis en la landing.
- Contratar plan con tarjeta de prueba de Stripe.
- Volver a la web.
- Confirmar que aparece el aviso de pago completado.
- Enviar una pregunta real al asistente.

## 5. Supabase, fase posterior

- Anadir login real cuando el embudo landing -> prueba -> pago ya este validado.
- Crear pagina de cuenta para gestionar suscripcion.
- Vincular suscripciones a usuarios registrados.
