# Requisitos de Producción y Legales para NotaSegura

Este documento detalla la implementación de componentes de interfaz y lógicas necesarias para cumplir con las normativas de las tiendas de aplicaciones (Google Play / App Store) y la ley de protección de datos (Habeas Data).

## 1. Checkbox de Términos y Condiciones en el Registro (Habeas Data)

* **Ubicación:** Pantalla de registro (`app/signup.tsx`).
* **Interfaz de Usuario (UI):**
  * Agregar un componente de casilla de verificación (Checkbox) justo encima del botón de "Registrarse".
  * El texto adjunto debe decir: *"Acepto los Términos y Condiciones y la Política de Privacidad"*.
  * Las palabras "Términos y Condiciones" y "Política de Privacidad" deben verse como enlaces tocables (pueden abrir un `Linking.openURL` a URLs de prueba por ahora, ej: `https://tusitio.com/privacidad`).
* **Lógica y Validación:**
  * El estado de la casilla debe iniciar desmarcado (`false`).
  * El botón principal de "Registrarse" debe estar deshabilitado (`disabled={true}`) o mostrar una alerta bloqueante si el usuario intenta registrarse sin haber marcado la casilla.

## 2. Sección Legal en el Perfil de Usuario

* **Ubicación:** Pantalla de perfil (`app/(tabs)/profile.tsx`).
* **Interfaz de Usuario (UI):**
  * Crear una nueva sección en la parte inferior llamada "Legal e Información".
  * Agregar dos botones de lista o enlaces: "Ver Política de Privacidad" y "Ver Términos y Condiciones". Al presionarlos, deben abrir el navegador del dispositivo apuntando a los documentos.
  * Añadir un texto de "Disclaimer" pequeño al final de la pantalla: *"Nota: Los cálculos del semáforo académico son proyecciones de referencia. El usuario es responsable de verificar sus notas oficiales con la institución."*

## 3. Eliminación Definitiva de Cuenta (Requisito Google Play)

* **Ubicación:** Pantalla de perfil (`app/(tabs)/profile.tsx`).
* **Objetivo:** Cumplir con la política de eliminación de datos de Google Play Console, brindando al usuario un método claro para borrar su información.
* **Interfaz de Usuario (UI):**
  * Agregar un botón destacado (preferiblemente en color rojo/peligro) con el texto: "Eliminar Cuenta Definitivamente".
* **Lógica (UI y Supabase):**
  * Al presionar el botón, mostrar un `Alert` de doble confirmación muy claro: *"¿Estás seguro? Esta acción es irreversible y borrará permanentemente todas tus materias, tareas y notas registradas."*
  * **Acción de borrado:** Si el usuario confirma, el sistema debe ejecutar el borrado de sus datos (ej. un `DELETE` en la tabla `profiles`, lo cual debería eliminar en cascada el resto de sus datos si la base de datos está bien configurada) o llamar a una función RPC de Supabase para borrar el usuario.
  * Inmediatamente después, ejecutar `supabase.auth.signOut()`, limpiar el estado global (`clearStore`) y redirigir a la pantalla de Login.