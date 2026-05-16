# OpoCompi

App web para un asistente guiado por IA que acompana a opositores a Policia Nacional.

## Estado actual

Esta version ya esta preparada como app Next.js para Vercel:

- Landing publica.
- Landing publica con informacion y precios.
- Chat con 3 mensajes gratis para probar el producto.
- Stripe Checkout para plan mensual y anual.
- Stripe Checkout desbloquea el chat al volver del pago.
- Chat server-side conectado a OpenAI cuando se configure `OPENAI_API_KEY`.
- Cerebro propio de OpoCompi con instrucciones, tono, reglas y contexto inicial.
- Pagina `/tests` para miembros, con respuestas ocultas hasta pulsar resolver.

Si faltan claves de Stripe u OpenAI, la app muestra mensajes de configuracion. Supabase queda reservado para una fase posterior con cuentas completas.

## Archivos principales

- `app/page.tsx`: interfaz principal.
- `app/globals.css`: estilos.
- `app/api/chat/route.ts`: endpoint del asistente IA.
- `app/api/checkout/route.ts`: endpoint para Stripe Checkout sin login previo.
- `app/tests/page.tsx`: practica de tests solo para miembros.
- `app/api/stripe-webhook/route.ts`: webhook de Stripe.
- `lib/test-bank.ts`: banco inicial de preguntas tipo test.
- `app/api/me/route.ts`: comprueba usuario y membresia.
- `lib/opocompi-brain.ts`: instrucciones y contexto base de la IA propia.
- `docs/knowledge/`: carpeta para temario, preguntas y estilo de OpoCompi.
- `docs/knowledge-workflow.md`: proceso para alimentar la IA con contenido validado.
- `docs/supabase-schema.sql`: esquema reservado para una fase posterior con cuentas reales.
- `docs/production-checklist.md`: orden recomendado para configurar produccion.
- `.env.example`: variables necesarias.

## Variables de entorno en Vercel

Configura estas variables en Vercel, dentro de Project Settings -> Environment Variables:

```text
NEXT_PUBLIC_SITE_URL=https://tu-dominio.vercel.app

OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini

STRIPE_SECRET_KEY=
STRIPE_PRICE_MONTHLY=
STRIPE_PRICE_YEARLY=
STRIPE_WEBHOOK_SECRET=
```

## Stripe

1. Crea dos productos/precios:
   - Mensual: 9,90 EUR / mes.
   - Anual: 90,90 EUR / ano.
2. Copia los price IDs:
   - `STRIPE_PRICE_MONTHLY`
   - `STRIPE_PRICE_YEARLY`
3. Copia la secret key a `STRIPE_SECRET_KEY`.
4. Crea un webhook hacia:

```text
https://tu-dominio.vercel.app/api/stripe-webhook
```

5. Eventos recomendados:

```text
checkout.session.completed
customer.subscription.updated
customer.subscription.deleted
```

6. Copia el signing secret a `STRIPE_WEBHOOK_SECRET`.

## OpenAI

1. Crea una API key.
2. Pegala en Vercel como `OPENAI_API_KEY`.
3. Deja `OPENAI_MODEL=gpt-5.4-mini` para empezar con buena relacion coste/latencia.

La personalidad de OpoCompi esta en:

```text
lib/opocompi-brain.ts
```

El conocimiento propio que iremos validando vive en:

```text
docs/knowledge/
```

## Despliegue

Sube todos los archivos del proyecto a GitHub y deja que Vercel redepliegue. Al detectar `package.json`, Vercel lo tratara como app Next.js.

Tras desplegar, visita:

```text
https://tu-dominio.vercel.app/setup
```

Esa pagina indica que bloques de configuracion siguen pendientes sin mostrar ninguna clave.

## Siguiente fase

- Validar el embudo: landing -> 3 mensajes gratis -> pago -> chat desbloqueado.
- Alimentar `docs/knowledge/` con temario y preguntas revisadas.
- Conectar la base de conocimiento al chat con busqueda semantica.
- Guardar conversaciones.
- Generar tests con IA y respuestas correctas estructuradas.
- Crear banco de preguntas validado.
- Anadir login real y pagina de cuenta cuando el embudo de pago ya este probado.
- Anadir panel de administracion para temario y preguntas.
