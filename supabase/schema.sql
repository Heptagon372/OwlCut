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

-- 인화 용지 (4x6 · 2x6 · 5x7 · a6). 프린트 서버가 이 크기로 출력한다.
alter table prints add column if not exists paper text;

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

-- ---------- 세션 쓰기 권한 ----------
-- QR·다운로드 주소에 세션 id 가 보이므로, 사진 업로드·출력은 세션을 만든 부스만 아는 토큰으로 확인한다.
-- 토큰 원문은 저장하지 않고 SHA-256 해시만 (lib/storage/sessionAuth.ts).
alter table sessions add column if not exists upload_token_hash text;

-- ---------- 사진 경로 (비공개 버킷 + 서명 URL) ----------
-- DB에는 공개 URL 대신 저장소 경로만 둔다. 보여줄 때마다 서버가 만료되는 서명 URL을 발급.
alter table designs add column if not exists final_image_path text;
alter table prints  add column if not exists image_path text;
alter table photos  add column if not exists image_path text;
alter table photos  alter column image_url drop not null;

-- ---------- Storage 버킷 ----------
-- 최종 합성 이미지 + 원본 사진. 비공개: 방문자 사진이 URL만으로 영구히 열리지 않게 한다.
-- (예전에 public 으로 만든 버킷도 비공개로 전환)
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do update set public = false;

-- ---------- RLS ----------
-- 서버 라우트는 SERVICE_ROLE_KEY 사용 → RLS 우회. 클라이언트(anon)에는 테이블 직접 접근 미허용.
alter table sessions enable row level security;
alter table photos   enable row level security;
alter table designs  enable row level security;
alter table prints   enable row level security;
alter table devices  enable row level security;
alter table ai_requests enable row level security;
-- (정책을 추가하지 않으면 anon 키로는 접근 불가. 모든 접근은 서버 라우트 경유.)

-- ---------- 보관기간 정리 ----------
-- 만료 세션 정리는 앱의 GET /api/cron/cleanup 이 담당 (CRON_SECRET 필요):
--   저장소 파일(사진·최종본) 삭제 → designs 의 방문자 입력(prompt, text_layers) 비움
--   → 대기 중 출력은 failed('expired') → sessions.status = 'expired'.
-- 행은 지우지 않는다 (관리자 "오늘" 통계가 보관기간만큼만 남지 않도록). 남는 건 선택값·개수·이미 지운 파일 경로뿐.
-- 오래된 통계 행까지 지우려면 (파일은 이미 지워진 상태이므로 안전):
--   delete from sessions where status = 'expired' and created_at < now() - interval '90 days';
