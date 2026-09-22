-- ============================================================
-- 아울네컷 (S.OWL PHOTO BOOTH) - Supabase / Postgres 스키마
-- Supabase 프로젝트의 SQL Editor에서 실행.
-- ============================================================

-- ---------- 테이블 ----------
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'created', -- created|capturing|captured|editing|composed|qr_issued|printed|expired
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '2 hours')
);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  image_url text not null,
  order_index int not null,
  created_at timestamptz default now()
);

create table if not exists designs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  mode text not null,            -- manual|ai
  prompt text,
  frame text,
  stickers jsonb,
  text_layers jsonb,
  filter text,
  final_image_url text,
  created_at timestamptz default now()
);

create table if not exists prints (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  printer text,
  status text not null default 'waiting', -- waiting|printing|completed|failed
  created_at timestamptz default now()
);

create index if not exists idx_photos_session on photos(session_id);
create index if not exists idx_designs_session on designs(session_id);
create index if not exists idx_sessions_expires on sessions(expires_at);

-- ---------- Storage 버킷 ----------
-- 최종 합성 이미지 + 원본 사진 저장용. public 읽기 허용(오브젝트 경로가 UUID라 사실상 비공개).
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- ---------- RLS ----------
-- 서버 라우트는 SERVICE_ROLE_KEY 사용 → RLS 우회. 클라이언트(anon)에는 테이블 직접 접근 미허용.
alter table sessions enable row level security;
alter table photos   enable row level security;
alter table designs  enable row level security;
alter table prints   enable row level security;
-- (정책을 추가하지 않으면 anon 키로는 접근 불가. 모든 접근은 서버 라우트 경유.)

-- ---------- TTL 정리 (선택: Supabase Cron / Edge Function에서 주기 실행) ----------
-- 만료 세션과 연결된 스토리지 파일까지 삭제하는 로직은 Edge Function으로 별도 구현 권장.
-- 아래는 만료 세션 행만 삭제하는 예시 (cascade로 photos/designs/prints 함께 삭제됨):
--   delete from sessions where expires_at < now();
