# 📱 NotaSegura (MVP)

Gestor académico inteligente diseñado para centralizar apuntes y bitácoras de clase, organizar tareas mediante alertas automáticas predictivas y simular calificaciones finales con cálculo del promedio necesario para aprobar.

---

## 🚀 Inicio Rápido

### 1. Iniciar la aplicación
Ejecuta en tu terminal:

```bash
npx expo start
```

- Presiona `a` para abrir en emulador de Android.
- Presiona `w` para abrir en el navegador Web.
- O escanea el código QR desde la app móvil **Expo Go** (Android / iOS).

---

## 🗄️ Configuración de Supabase (Base de Datos)

El proyecto incluye el script completo con PostgreSQL y seguridad RLS en [`supabase_schema.sql`](./supabase_schema.sql).

### Pasos para configurar tu backend:
1. Entra a tu consola en [Supabase](https://supabase.com) y crea un nuevo proyecto.
2. Ve al menú lateral **SQL Editor**.
3. Copia y pega el contenido de [`supabase_schema.sql`](./supabase_schema.sql) y pulsa **Run**.
   - Esto creará las tablas: `profiles`, `subjects`, `tasks`, `media`, `grades`.
   - Configurará las políticas de seguridad **Row Level Security (RLS)**.
   - Creará el bucket de almacenamiento seguro `task-media` para audios y fotos de pizarrón.
4. En **Project Settings > API**, copia tu `Project URL` y tu `anon public key`.
5. Crea un archivo `.env` en la raíz del proyecto (basado en `.env.example`):

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
```

> **Nota:** La aplicación cuenta con un modo de demostración/local activo de forma predeterminada, por lo que puedes probarla inmediatamente sin necesidad de configurar Supabase antes.

---

## 🧩 Casos de Uso Implementados

### 📖 CU-01: Registro de Bitácora de Clase
- **Ubicación:** Pestaña **Tareas & Bitácora** (`app/(tabs)/tasks.tsx`).
- Permite registrar el apunte justo al terminar la clase seleccionando la materia.
- Captura de foto del pizarrón mediante cámara o galería (`expo-image-picker`).

### ⏰ CU-02: Gestión de Tareas con Prioridad y Alertas Inteligentes
- **Ubicación:** `src/services/notifications.ts` y pestaña **Tareas & Bitácora**.
- Motor de alertas predictivas automáticas según prioridad:
  - **Alta:** Recordatorios automáticos a los 7 días, 3 días y 1 día antes a las 09:00 AM.
  - **Media:** Recordatorios a los 3 días y 1 día antes.
  - **Baja:** Recordatorio 1 día antes.
- Al marcar una tarea como completada, sus notificaciones pendientes se cancelan automáticamente.

### 🧮 CU-03: Simulación y Proyección de Notas
- **Ubicación:** Pestaña **Calculadora** (`app/(tabs)/subjects.tsx`) y algoritmo en `src/services/gradesCalculator.ts`.
- Desglose por cortes (ej: Parcial 1: 4.0 al 30%).
- Algoritmo que calcula:
  - Nota acumulada actual.
  - Porcentaje faltante por evaluar del semestre.
  - Nota promedio requerida en lo que falta para aprobar la materia (ej: 2.57) o alcanzar tu meta.
  - Semáforo visual en tiempo real: Aprobada 🟢, En camino 🔵, En riesgo 🟡, Atención crítica 🔴.

---

## 📁 Estructura del Código

```text
NotaSegura/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Navegación inferior con iconos y temas
│   │   ├── index.tsx        # Dashboard principal con resumen y semáforo
│   │   ├── subjects.tsx     # CU-03: Calculadora y proyección de notas
│   │   └── tasks.tsx        # CU-01 & CU-02: Bitácoras, tareas y fotos
│   ├── modal.tsx            # Estado de conexión y resumen de la app
│   └── _layout.tsx          # Root layout de Expo Router
├── src/
│   ├── types/
│   │   └── database.ts      # Tipos TypeScript de Subjects, Tasks, Grades, Media
│   ├── services/
│   │   ├── gradesCalculator.ts # Lógica matemática pura de proyección de notas
│   │   ├── notifications.ts    # Motor de alertas según prioridad
│   │   └── supabase.ts         # Cliente Supabase con AsyncStorage
│   └── store/
│       └── useAppStore.ts   # Zustand store reactivo con datos iniciales
├── supabase_schema.sql      # Script SQL completo para Supabase + RLS
├── .env.example             # Plantilla de variables de entorno
└── package.json
```

