-- ==============================================================================
-- NOTASEGURA - ESQUEMA DE BASE DE DATOS PARA SUPABASE (PostgreSQL + RLS)
-- ==============================================================================

-- 1. Habilitar extensión UUID
create extension if not exists "uuid-ossp";

-- ==============================================================================
-- 2. TABLA DE PERFILES DE USUARIO (Sincronizada con auth.users)
-- ==============================================================================
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    email text unique not null,
    full_name text,
    avatar_url text,
    institution text,
    major text,
    bio text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger para crear perfil automáticamente al registrar usuario en Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, full_name)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', '')
    );
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ==============================================================================
-- 3. TABLA DE MATERIAS (SUBJECTS)
-- ==============================================================================
create table if not exists public.subjects (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    code text,
    color text default '#4F46E5', -- Color para distinguir la materia en UI
    target_grade numeric(3, 2) default 3.00 not null, -- Nota objetivo (ej: 3.0 o 4.0)
    min_passing_grade numeric(3, 2) default 3.00 not null, -- Nota mínima aprobatoria (ej: 3.0)
    scale_max numeric(3, 2) default 5.00 not null, -- Escala máxima (ej: 5.0 o 10.0)
    is_archived boolean default false, -- Soft delete
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 4. TABLA DE TAREAS Y BITÁCORAS DE CLASE (TASKS)
-- ==============================================================================
-- Prioridades válidas: 'high', 'medium', 'low'
create type task_priority as enum ('high', 'medium', 'low');

create table if not exists public.tasks (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    subject_id uuid references public.subjects(id) on delete cascade not null,
    title text not null,
    notes text,
    due_date timestamp with time zone,
    priority task_priority default 'medium' not null,
    is_completed boolean default false not null,
    is_class_log boolean default false not null, -- true si es una bitácora de clase
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 5. TABLA DE MULTIMEDIA (MEDIA - FOTOS Y AUDIOS)
-- ==============================================================================
create type media_type as enum ('image', 'audio');

create table if not exists public.media (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    task_id uuid references public.tasks(id) on delete cascade not null,
    file_url text not null, -- URL pública o firmada
    file_path text not null, -- Ruta en el bucket de Supabase Storage
    type media_type not null,
    duration_seconds integer, -- Duración para archivos de audio
    file_size_bytes bigint,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 6. TABLA DE CALIFICACIONES / CORTES (GRADES)
-- ==============================================================================
create table if not exists public.grades (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    subject_id uuid references public.subjects(id) on delete cascade not null,
    name text not null, -- ej: "Parcial 1", "Taller de Derivadas", "Proyecto Final"
    weight_percentage numeric(5, 2) not null, -- ej: 20.00 para 20%
    grade numeric(3, 2), -- Calificación obtenida (null si aún no ha sido evaluada)
    is_evaluated boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint valid_weight check (weight_percentage > 0 and weight_percentage <= 100)
);

-- ==============================================================================
-- 7. ÍNDICES PARA ALTO RENDIMIENTO
-- ==============================================================================
create index if not exists idx_subjects_user on public.subjects(user_id);
create index if not exists idx_tasks_user on public.tasks(user_id);
create index if not exists idx_tasks_subject on public.tasks(subject_id);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_media_task on public.media(task_id);
create index if not exists idx_grades_subject on public.grades(subject_id);
create index if not exists idx_grades_user on public.grades(user_id);

-- ==============================================================================
-- 8. TRIGGER DE ACTUALIZACIÓN DE TIMESTAMP (updated_at)
-- ==============================================================================
create or replace function public.update_timestamp()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger update_profiles_timestamp before update on public.profiles
for each row execute function public.update_timestamp();

create trigger update_subjects_timestamp before update on public.subjects
for each row execute function public.update_timestamp();

create trigger update_tasks_timestamp before update on public.tasks
for each row execute function public.update_timestamp();

create trigger update_grades_timestamp before update on public.grades
for each row execute function public.update_timestamp();

-- ==============================================================================
-- 9. SEGURIDAD: ROW LEVEL SECURITY (RLS)
-- Cada usuario solo puede ver, crear, modificar y eliminar sus propios datos.
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.tasks enable row level security;
alter table public.media enable row level security;
alter table public.grades enable row level security;

-- Políticas para Profiles
create policy "Users can view their own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id);

-- Políticas para Subjects
create policy "Users can manage their own subjects"
    on public.subjects for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Políticas para Tasks
create policy "Users can manage their own tasks"
    on public.tasks for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Políticas para Media
create policy "Users can manage their own media"
    on public.media for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Políticas para Grades
create policy "Users can manage their own grades"
    on public.grades for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- ==============================================================================
-- 10. CONFIGURACIÓN DEL STORAGE BUCKET PARA FOTOS Y AUDIOS
-- (Ejecutar en Supabase SQL Editor para crear el bucket y políticas de almacenamiento)
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('task-media', 'task-media', false)
on conflict (id) do nothing;

-- Permitir subir archivos solo a carpetas con el propio user_id (task-media/{user_id}/*)
create policy "Users can upload media to own folder"
on storage.objects for insert
with check (
    bucket_id = 'task-media'
    and auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir leer sus propios archivos multimedia
create policy "Users can view own media files"
on storage.objects for select
using (
    bucket_id = 'task-media'
    and auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir eliminar sus propios archivos multimedia
create policy "Users can delete own media files"
on storage.objects for delete
using (
    bucket_id = 'task-media'
    and auth.uid()::text = (storage.foldername(name))[1]
);

