# Actualización NotaSegura: Pantalla de Bienvenida y Opciones de Acceso

Este documento detalla la creación de la pantalla inicial (Landing/Welcome Screen) que actuará como puerta de entrada principal a la aplicación, ofreciendo al usuario tres rutas claras para comenzar a usar NotaSegura.

## 1. Interfaz de la Pantalla Inicial (Welcome Screen)

*   **Ubicación:** Esta debe ser la ruta raíz o la primera pantalla visible si el usuario no tiene una sesión activa (ej. `app/index.tsx` o `app/welcome.tsx`).
*   **Diseño Visual (UI):**
    *   Logo de NotaSegura centrado y un mensaje de bienvenida o eslogan (ej. *"Tu vida académica, bajo control"*).
    *   **Botón Primario 1:** "Iniciar Sesión" (Redirige a `app/login.tsx`).
    *   **Botón Primario 2:** "Registrarse" (Redirige a `app/signup.tsx`).
    *   **Botón Secundario/Enlace:** "Usar la app offline (Sin cuenta)". Debe tener un diseño más sutil (texto subrayado o botón sin fondo) debajo de las opciones principales.

## 2. Lógica del Modo Offline (Acceso Anónimo)

*   **Problema a resolver:** Si el usuario elige usar la app sin cuenta, la base de datos (Supabase) rechazará los datos guardados (materias, tareas) debido a las políticas de seguridad (RLS), ya que requieren un `user_id`.
*   **Solución Técnica (Supabase Auth):**
    *   Al presionar "Usar la app offline", ejecutar la función `supabase.auth.signInAnonymously()`.
    *   Esto generará un identificador de usuario temporal. La aplicación funcionará 100% igual que si estuviera registrado, guardando los datos localmente y en la nube bajo este ID anónimo.
*   **Redirección:** Una vez que la promesa de inicio de sesión anónimo se resuelva correctamente, redirigir al usuario al flujo principal (`app/(tabs)/index.tsx`).

## 3. Comportamiento en el Perfil de Usuario (Upgrading)

*   **Pantalla de Perfil (`app/(tabs)/profile.tsx`):**
    *   Si el usuario ingresó mediante el modo offline (es un usuario anónimo), la pantalla de perfil debe adaptar su interfaz.
    *   En lugar de mostrar un correo y un botón de "Cambiar contraseña", debe mostrar un mensaje: *"Estás usando una cuenta temporal/offline."*
    *   Mostrar un botón destacado: "Crear cuenta permanente" o "Registrarse para no perder datos", que lleve al usuario al flujo de registro tradicional, permitiéndole conservar las materias que ya creó en modo offline.