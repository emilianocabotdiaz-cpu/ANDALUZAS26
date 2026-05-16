# OpoCompi Mobile

App independiente de OpoCompi creada con Expo.

## Desarrollo

1. Instala dependencias:

```bash
npm install
```

2. Copia `.env.example` a `.env` y rellena:

```bash
EXPO_PUBLIC_API_URL=https://opocompi.vercel.app
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

3. Arranca Expo:

```bash
npm run start
```

## Funcionamiento

- La app abre directamente el chat.
- El menu lateral incluye nuevo chat, historial local, actualidad, membresia y cuenta.
- Los tests se piden dentro del chat, por ejemplo: `Hazme 10 preguntas tipo test sobre Constitucion`.
- El login usa enlace magico de Supabase con deep link `opocompi://auth/callback`.

## Produccion

La web de Vercel sigue siendo landing y backend. La app consume:

- `POST /api/chat`
- `GET /api/me`
- `POST /api/checkout`
