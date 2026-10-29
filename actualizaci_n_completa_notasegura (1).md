# Actualización NotaSegura: Edición, Filtros, Seguridad y Autenticación Completa

Este documento detalla las modificaciones para hacer la aplicación más funcional, robusta y segura, cubriendo la edición de materias, el impacto global del archivo, y un flujo de autenticación completo (incluyendo modo local seguro).

## 1. Modificación de Materias Existentes

* **Objetivo:** Permitir al usuario editar el nombre (y código) de una materia previamente creada.

* **Interfaz de Usuario (UI) y Validaciones:**

  * Añadir un botón de "Editar" (ícono de lápiz) junto al botón de eliminar/archivar en la lista de materias (`app/(tabs)/subjects.tsx`).

  * Al presionar, abrir un Modal prellenado con el nombre y código actual de la materia.

  * **Validación:** Bloquear el botón de "Guardar" si el campo de nombre está vacío.

* **Lógica de Datos (Supabase):**

  * Ejecutar un `UPDATE` en la tabla `subjects` modificando las columnas `name` y `code` donde el `id` coincida.

  * Refrescar el estado local inmediatamente para reflejar el cambio en la pantalla.

## 2. Filtro de Materias Archivadas (Semáforo y Calendario)

* **Objetivo:** Evitar que las materias enviadas a la papelera (historial) afecten los cálculos o sigan mostrando tareas pendientes.

* **Lógica de Datos (Efecto Cascada):**

  * **Semáforo:** En la consulta y mapeo de materias en la pantalla principal (`app/(tabs)/index.tsx`), filtrar explícitamente `activeSubjects = subjects.filter(s => !s.is_archived)`. El cálculo de promedios debe ignorar los registros archivados.

  * **Calendario y Tareas:** Aplicar el filtro de exclusión de materias archivadas en las consultas de la tabla `tasks`. Las tareas que pertenezcan a una materia con `is_archived = true` **no deben** renderizarse en el `TaskCalendar` ni disparar notificaciones push.

## 3. Cambio de Contraseña mediante Código (OTP) en la App

* **Objetivo:** Permitir al usuario solicitar un cambio de contraseña y validarlo introduciendo un código numérico (OTP) directamente en la app, sin necesidad de enlaces externos.

* **Interfaz de Usuario (UI):**

  * **En Perfil:** Mostrar el correo actual (`supabase.auth.getUser()`) y un botón "Solicitar Cambio de Contraseña". Al presionarlo, llevar al usuario a una nueva pantalla.

  * **Pantalla de Recuperación (`app/reset-password.tsx`):** Mostrar un formulario con dos campos: "Código de Verificación (6 dígitos)" y "Nueva Contraseña".

* **Lógica de Datos (Supabase Auth - Flujo OTP):**

  * **Paso 1 (Enviar):** Al presionar el botón en el perfil, ejecutar `supabase.auth.resetPasswordForEmail(email)`. *(Nota para configuración: En el panel de Supabase > Authentication > Email Templates > Recovery, asegurarse de incluir `{{ .Token }}` en el texto del correo para que envíe el código).*

  * **Paso 2 (Verificar):** En la pantalla de recuperación, al enviar el formulario, ejecutar `supabase.auth.verifyOtp({ email, token: codigoIngresado, type: 'recovery' })`.

  * **Paso 3 (Actualizar):** Si el código es correcto (la promesa se resuelve exitosamente), ejecutar inmediatamente `supabase.auth.updateUser({ password: nuevaContrasena })` y mostrar alerta de éxito.

## 4. Implementación de Autenticación, Perfil y Modo Local Seguro

* **Objetivo:** Proveer un flujo de autenticación robusto, prevenir errores RLS y fugas de memoria al cerrar sesión.

* **Pantallas de Autenticación (`app/login.tsx` y `app/signup.tsx`):**

  * Formularios para Registrarse (`supabase.auth.signUp`) e Iniciar Sesión (`supabase.auth.signInWithPassword`).

  * **Validaciones:** Mostrar alerta de error si la contraseña de registro tiene menos de 6 caracteres.

  * **Modo Local (Anónimo):** Si el usuario elige "Continuar sin cuenta", utilizar el "Inicio de Sesión Anónimo" (`supabase.auth.signInAnonymously()`). Esto genera un `user_id` temporal para cumplir con las políticas RLS y permite escalar la cuenta a permanente después.

* **Gestión de Estado (useAppStore.ts) y Seguridad:**

  * **Upsert de Perfiles:** Incluir el campo `email: session.user.email` en las operaciones `.upsert()` de la tabla `profiles` para prevenir errores de violación `NOT NULL`.

  * **Limpieza de Sesión:** Al ejecutar `supabase.auth.signOut()`, disparar una función `clearStore()` que vacíe los arrays de `subjects`, `tasks`, `grades` y `profile` de la memoria local, evitando que otro usuario vea datos cacheados en el mismo dispositivo.