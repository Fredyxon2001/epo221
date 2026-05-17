# App móvil EPO 221 — React Native (Expo)

Guía para arrancar la app móvil que comparte el backend Supabase del sistema web.

## 1. Crear repo nuevo

```bash
npx create-expo-app@latest epo221-mobile --template blank-typescript
cd epo221-mobile
```

## 2. Dependencias

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage \
  expo-secure-store expo-notifications expo-router react-native-url-polyfill
```

## 3. Cliente Supabase compartido

`src/lib/supabase.ts`:
```ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

`.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://hvycaqghrkvspkzouape.supabase.co
EXPO_PUBLIC_SUPABASE_ANON=<misma_key_que_web>
```

> **RLS:** las mismas policies que protegen el sistema web protegen la app móvil. No hay que duplicar lógica de seguridad.

## 4. Pantallas iniciales (Sprint 1 móvil)

| Pantalla | Tabla(s) | Notas |
|---|---|---|
| Login | `auth` | Email + password |
| Dashboard | `notificaciones` | Saludo + count |
| Calificaciones | `vista_historial_academico` | Solo lectura |
| Horario | `horarios` | Por día actual |
| Avisos | `avisos`, `avisos_lecturas` | Marcar leído |
| Chat | `mensajes_hilos`, `mensajes` | Realtime |
| Ficha | `alumnos` + `solicitudes_modificacion_ficha` | 2 mods libres |

## 5. Push nativas (Expo Notifications)

```bash
npx expo install expo-notifications expo-device
```

```ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export async function registerForPush() {
  if (!Device.isDevice) return null;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') return null;
  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  })).data;
  // Guardar en Supabase tabla expo_push_tokens (perfil_id, token, platform)
  return token;
}
```

Crear tabla:
```sql
CREATE TABLE expo_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id uuid NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text CHECK (platform IN ('ios','android')),
  created_at timestamptz DEFAULT now()
);
```

Y agregar caso en el trigger `trg_notificacion_push` para que también llame al Expo Push Service (`https://exp.host/--/api/v2/push/send`) cuando hay token Expo registrado.

## 6. Build/release

```bash
npm i -g eas-cli
eas login
eas build:configure
eas build --profile preview --platform android  # APK para pruebas internas
eas build --profile production --platform all   # iOS + Android stores
```

## 7. Compartir tipos TypeScript con web

Opción A — pnpm workspaces:
```
/epo221-monorepo
  /apps
    /web         (este proyecto)
    /mobile      (Expo)
  /packages
    /shared-types  (interfaces de tablas Supabase)
```

Opción B — script `npm run db:types` en web que genere `database.types.ts` y se copie a `mobile/src/types`:
```bash
npx supabase gen types typescript --project-id hvycaqghrkvspkzouape > database.types.ts
```

## 8. Roadmap móvil

**Sprint 1 (1 semana):** login + dashboard + calificaciones + horario.
**Sprint 2 (1 semana):** avisos + chat + ficha.
**Sprint 3 (1 semana):** push notifications + perfil + portafolio.
**Sprint 4 (1 semana):** beta privada en TestFlight/Internal Testing.

## 9. Decisión pendiente

¿Arrancamos esta semana o se prioriza terminar features web primero (PMI workflow, banco preguntas integrado en exámenes, multi-plantel)?
