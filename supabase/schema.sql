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
  image_url text,                          -- 출력할 최종 이미지 (등록 시점에 고정)
  copies int not null default 1,
  printer text,                            -- 작업을 가져간 프린트 서버 이름
  status text not null default 'waiting', -- waiting|printing|completed|failed
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Phase 7 이전에 만든 prints 테이블 호환
alter table prints add column if not exists image_url text;
alter table prints add column if not exists copies int not null default 1;
alter table prints add column if not exists error text;
alter table prints add column if not exists updated_at timestamptz default now();

-- AI 호출 로그 (관리자 대시보드의 모델별 사용량). 저장되지 않은 시도까지 모두 기록.
create table if not exists ai_requests (
  id uuid primary key default gen_random_uuid(),
  model text,
  ok boolean not null,
  error text,
  latency_ms int,
  created_at timestamptz default now()
);

-- AI로 만든 디자인이 어떤 모델에서 왔는지
alter table designs add column if not exists ai_model text;

-- 화면 구성: 레이아웃 id + { photoOrder, slotSpacing, slotRounding, backgroundColor }
alter table designs add column if not exists layout text;
alter table designs add column if not exists layout_options jsonb;

-- 장비 상태 (프린트 서버 heartbeat). 관리자 대시보드에서 온라인 여부 표시.
create table if not exists devices (
  id text primary key,              -- 프린터/에이전트 이름
  kind text not null,               -- 'printer'
  last_seen_at timestamptz default now(),
  info jsonb
);

create index if not exists idx_photos_session on photos(session_id);
create index if not exists idx_designs_session on designs(session_id);
create index if not exists idx_sessions_expires on sessions(expires_at);
create index if not exists idx_prints_queue on prints(status, created_at);
create index if not exists idx_prints_session on prints(session_id);
create index if not exists idx_ai_requests_created on ai_requests(created_at);
create index if not exists idx_designs_created on designs(created_at);
create index if not exists idx_sessions_created on sessions(created_at);

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
alter table devices  enable row level security;
alter table ai_requests enable row level security;
-- (정책을 추가하지 않으면 anon 키로는 접근 불가. 모든 접근은 서버 라우트 경유.)

-- ---------- TTL 정리 (선택: Supabase Cron / Edge Function에서 주기 실행) ----------
-- 만료 세션과 연결된 스토리지 파일까지 삭제하는 로직은 Edge Function으로 별도 구현 권장.
-- 아래는 만료 세션 행만 삭제하는 예시 (cascade로 photos/designs/prints 함께 삭제됨):
--   delete from sessions where expires_at < now();
