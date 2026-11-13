# Puesta en marcha de Baticueva (todo gratis)

Orden recomendado. Cada paso depende del anterior. Tiempo estimado: 45-60 minutos.

> **Seguridad:** las claves van directo en Vercel y en Supabase. No las pegues en chats, correos ni en el código.
> `.env.local` y `.env*` ya están excluidos de git.

## 0. Antes de empezar

- Cuenta de **GitHub** (gratis), **Supabase** (gratis), **Vercel** (plan Hobby, gratis) y **Meta for Developers** (gratis).
- Tu número de WhatsApp personal con código de país, por ejemplo `5215512345678`.
- Una contraseña para entrar al panel y un secreto de sesión. Genera el secreto con:
  ```
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

## 1. Subir el proyecto a GitHub

1. Crea un repositorio **privado** vacío en GitHub (por ejemplo `baticueva`).
2. En la carpeta del proyecto: `git init`, `git add .`, `git commit -m "Baticueva"`, y sigue las instrucciones de GitHub para `git remote add origin ...` y `git push -u origin main`.
3. Comprueba en GitHub que **no** aparece `.env.local`.

## 2. Supabase (base de datos)

1. Crea un proyecto nuevo (elige la región más cercana a ti). Guarda la contraseña de la base de datos.
2. **SQL Editor** → pega todo el contenido de `supabase/schema.sql` → ejecuta. Se puede volver a correr sin problema.
3. **Authentication → Users → Add user**: crea un usuario con tu correo y una contraseña, y marca que se confirme automáticamente. Copia su **UID**: será `OWNER_USER_ID`.
4. **Project Settings → API**: copia la **Project URL**, la clave **anon** y la clave **service_role**.
   La `service_role` es secreta: solo va en Vercel, nunca en una variable que empiece con `NEXT_PUBLIC_`.

## 3. Vercel (la página y los webhooks)

1. **Add New → Project** → importa el repositorio de GitHub. Framework: Next.js (se detecta solo).
2. Antes de desplegar, en **Environment Variables** agrega:

| Variable | De dónde sale |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase, Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase, clave anon |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase, clave service_role |
| `OWNER_USER_ID` | UID del usuario del paso 2.3 |
| `DASHBOARD_PASSWORD` | La que elijas para entrar al panel |
| `SESSION_SECRET` | El secreto de 64 caracteres del paso 0 |
| `WHATSAPP_VERIFY_TOKEN` | Inventa una cadena larga al azar |
| `WHATSAPP_ALLOWED_NUMBER` | Tu número, con código de país |
| `INBOUND_EMAIL_SECRET` | Otra cadena larga al azar |
| `CRON_SECRET` | Otra cadena larga al azar |
| `OWN_NAMES` | Tu nombre como aparece en tus transferencias de Revolut (varios, separados por coma) |
| `NEXT_PUBLIC_CURRENCY` / `APP_TIMEZONE` | `MXN` / `America/Mexico_City` (cámbialas si hace falta) |
| `MONTHLY_INCOME` | Opcional |

   `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID` se agregan en el paso 4.
3. **Deploy**. Anota tu URL, por ejemplo `https://baticueva.vercel.app`.
4. Ábrela: debe pedirte contraseña. Entra: verás los datos de ejemplo hasta que registres el primer gasto.

> Cada vez que cambies una variable en Vercel, hay que **redesplegar** para que se aplique.

## 4. WhatsApp (Meta Cloud API)

1. En developers.facebook.com → **My Apps → Create App** → tipo **Business** → agrega el producto **WhatsApp**.
2. **WhatsApp → API Setup**: Meta te da un **número de pruebas** (gratis). Anota su **Phone number ID**.
3. En el campo **To**, agrega **tu** número personal y verifícalo con el código que te llega. El número de pruebas solo permite hasta 5 destinatarios; con uno basta.
4. **App settings → Basic**: copia el **App Secret** → será `WHATSAPP_APP_SECRET`.
5. Token de acceso:
   - Para probar hoy: el **temporary access token** de API Setup (dura ~24 h).
   - Para dejarlo fijo: en business.facebook.com → **Users → System users** → crea uno, asígnale tu app y genera un token con los permisos `whatsapp_business_messaging` y `whatsapp_business_management`. Ese no caduca.
6. En Vercel agrega `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID`, y **redespliega**.
7. **WhatsApp → Configuration → Webhook**: Callback URL = `https://TU-URL/api/whatsapp`, Verify token = el mismo `WHATSAPP_VERIFY_TOKEN`. Pulsa **Verify and save**.
8. En la misma pantalla, en **Webhook fields**, suscríbete al campo **`messages`**.
9. Si en `WHATSAPP_API_VERSION` quieres otra versión de la API, usa la que Meta muestre como vigente en tu panel (el valor por defecto `v21.0` puede estar caducado).

## 5. Correos de Revolut (solo transferencias e ingresos)

Revolut no envía correo por compras, así que este paso solo captura transferencias recibidas. Si no lo necesitas, sáltalo.

1. Abre `scripts/gmail-forwarder.gs` y sigue las instrucciones del encabezado (Google Apps Script, gratis).
2. Propiedades del script: `BATICUEVA_URL` = `https://TU-URL/api/inbound-email` e `INBOUND_SECRET` = el mismo `INBOUND_EMAIL_SECRET`.

## 6. Verificación final

1. Desde tu WhatsApp, escribe al número de pruebas: `tacos 120`. Debe responder `✅ Tacos · $120.00 · Comida · hoy`.
2. Recarga el panel: ya no dice «DATOS DE EJEMPLO» y aparece el gasto.
3. Escribe `deshacer`: debe borrarlo.
4. En Vercel → **Settings → Cron Jobs** debe aparecer `/api/cron/keepalive` (una vez al día, mantiene Supabase activo).

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| Meta no verifica el webhook | `WHATSAPP_VERIFY_TOKEN` distinto en Vercel y en Meta, o falta redesplegar |
| El bot no responde | Tu número no está en el campo «To», `WHATSAPP_ALLOWED_NUMBER` mal escrito, token temporal vencido, o no te suscribiste al campo `messages`. Revisa Vercel → Logs |
| El bot responde «Algo falló al guardar» | Faltan o están mal las variables de Supabase, o no ejecutaste `schema.sql` |
| El panel dice «Configura DASHBOARD_PASSWORD…» | Falta `DASHBOARD_PASSWORD` o `SESSION_SECRET` (mínimo 32 caracteres) |
| El panel siempre muestra datos de ejemplo | Supabase no está configurado en Vercel |

## Límites del plan gratuito

- **WhatsApp:** el bot solo responde cuando tú escribes primero. Los mensajes que inicie el bot (resúmenes, avisos) requieren plantillas que Meta puede cobrar, por eso esas funciones van en el panel. Confirma los precios actuales en Meta.
- **Supabase gratis** se pausa tras 7 días sin actividad; el cron diario lo evita.
- **Vercel Hobby** permite un cron al día y es para uso personal no comercial.
