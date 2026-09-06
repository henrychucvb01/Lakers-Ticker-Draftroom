-- Lakers Draft Room objects only. This migration does not alter CafeLA tables.
create extension if not exists pgcrypto;
create schema if not exists lakers_private;

create table if not exists public.lakers_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) > 0),
  role text not null default 'member' check (role in ('member', 'commissioner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lakers_seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.lakers_season_members (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.lakers_seasons(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null check (length(trim(name)) > 0),
  status text not null default 'pending' check (status in ('active', 'pending', 'inactive')),
  games_allowed integer not null default 5 check (games_allowed >= 0),
  created_at timestamptz not null default now(),
  unique (season_id, name),
  unique (season_id, user_id)
);

create table if not exists public.lakers_games (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.lakers_seasons(id) on delete cascade,
  opponent text not null check (length(trim(opponent)) > 0),
  game_date date not null,
  game_time text not null,
  status text not null default 'draft' check (status in ('draft', 'keep', 'not-owned')),
  preseason boolean not null default false,
  cup boolean not null default false,
  created_at timestamptz not null default now(),
  unique (season_id, opponent, game_date)
);

create table if not exists public.lakers_draft_runs (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.lakers_seasons(id) on delete cascade,
  mode text not null check (mode in ('real', 'test')),
  status text not null default 'setup' check (status in ('setup', 'live', 'paused', 'completed')),
  order_generated_at timestamptz,
  reveal_started_at timestamptz,
  reveal_completed_at timestamptz,
  current_member_id uuid references public.lakers_season_members(id) on delete set null,
  current_round integer not null default 0 check (current_round >= 0),
  overall_pick integer not null default 0 check (overall_pick >= 0),
  pick_clock_seconds integer not null default 90 check (pick_clock_seconds between 15 and 600),
  check_in_open boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, mode)
);

create table if not exists public.lakers_draft_order_entries (
  id uuid primary key default gen_random_uuid(),
  draft_run_id uuid not null references public.lakers_draft_runs(id) on delete cascade,
  member_id uuid not null references public.lakers_season_members(id) on delete cascade,
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  unique (draft_run_id, member_id),
  unique (draft_run_id, position)
);

create table if not exists public.lakers_draft_picks (
  id uuid primary key default gen_random_uuid(),
  draft_run_id uuid not null references public.lakers_draft_runs(id) on delete cascade,
  game_id uuid not null references public.lakers_games(id) on delete restrict,
  member_id uuid not null references public.lakers_season_members(id) on delete restrict,
  selected_by uuid not null references auth.users(id) on delete restrict,
  round integer not null check (round > 0),
  overall_pick integer not null check (overall_pick > 0),
  created_at timestamptz not null default now(),
  unique (draft_run_id, game_id),
  unique (draft_run_id, overall_pick)
);

create table if not exists public.lakers_check_ins (
  draft_run_id uuid not null references public.lakers_draft_runs(id) on delete cascade,
  member_id uuid not null references public.lakers_season_members(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  primary key (draft_run_id, member_id)
);

create index if not exists lakers_members_user_idx on public.lakers_season_members(user_id);
create index if not exists lakers_games_season_status_idx on public.lakers_games(season_id, status);
create index if not exists lakers_picks_member_idx on public.lakers_draft_picks(draft_run_id, member_id);

create or replace function lakers_private.is_commissioner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.lakers_profiles
    where user_id = (select auth.uid()) and role = 'commissioner'
  );
$$;

create or replace function lakers_private.is_season_member(requested_season_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.lakers_season_members
    where season_id = requested_season_id
      and user_id = (select auth.uid())
      and status = 'active'
  ) or lakers_private.is_commissioner();
$$;

alter table public.lakers_profiles enable row level security;
alter table public.lakers_seasons enable row level security;
alter table public.lakers_season_members enable row level security;
alter table public.lakers_games enable row level security;
alter table public.lakers_draft_runs enable row level security;
alter table public.lakers_draft_order_entries enable row level security;
alter table public.lakers_draft_picks enable row level security;
alter table public.lakers_check_ins enable row level security;

revoke all on public.lakers_profiles, public.lakers_seasons, public.lakers_season_members,
  public.lakers_games, public.lakers_draft_runs, public.lakers_draft_order_entries,
  public.lakers_draft_picks, public.lakers_check_ins from anon;
grant select on public.lakers_profiles, public.lakers_seasons, public.lakers_season_members,
  public.lakers_games, public.lakers_draft_runs, public.lakers_draft_order_entries,
  public.lakers_draft_picks, public.lakers_check_ins to authenticated;
grant insert, update, delete on public.lakers_season_members, public.lakers_games to authenticated;

create policy "lakers profiles own or commissioner read"
on public.lakers_profiles for select to authenticated
using (user_id = (select auth.uid()) or lakers_private.is_commissioner());

create policy "lakers authenticated season read"
on public.lakers_seasons for select to authenticated
using (lakers_private.is_season_member(id));

create policy "lakers season members shared read"
on public.lakers_season_members for select to authenticated
using (lakers_private.is_season_member(season_id));

create policy "lakers commissioner manages members"
on public.lakers_season_members for all to authenticated
using (lakers_private.is_commissioner())
with check (lakers_private.is_commissioner());

create policy "lakers games shared read"
on public.lakers_games for select to authenticated
using (lakers_private.is_season_member(season_id));

create policy "lakers commissioner manages games"
on public.lakers_games for all to authenticated
using (lakers_private.is_commissioner())
with check (lakers_private.is_commissioner());

create policy "lakers runs shared read"
on public.lakers_draft_runs for select to authenticated
using (lakers_private.is_season_member(season_id));

create policy "lakers revealed order read"
on public.lakers_draft_order_entries for select to authenticated
using (
  exists (
    select 1 from public.lakers_draft_runs run
    where run.id = draft_run_id
      and lakers_private.is_season_member(run.season_id)
      and (run.reveal_started_at is not null or lakers_private.is_commissioner())
  )
);

create policy "lakers picks shared read"
on public.lakers_draft_picks for select to authenticated
using (
  exists (
    select 1 from public.lakers_draft_runs run
    where run.id = draft_run_id
      and lakers_private.is_season_member(run.season_id)
  )
);

create policy "lakers checkins own or commissioner read"
on public.lakers_check_ins for select to authenticated
using (
  member_id in (select id from public.lakers_season_members where user_id = (select auth.uid()))
  or lakers_private.is_commissioner()
);

create or replace function public.lakers_randomize_draft_order(requested_run_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not lakers_private.is_commissioner() then
    raise exception 'Commissioner authorization required';
  end if;

  perform 1 from public.lakers_draft_runs where id = requested_run_id for update;
  if not found then raise exception 'Draft run not found'; end if;
  if exists (select 1 from public.lakers_draft_picks where draft_run_id = requested_run_id) then
    raise exception 'Reset the draft before generating a new order';
  end if;

  delete from public.lakers_draft_order_entries where draft_run_id = requested_run_id;
  insert into public.lakers_draft_order_entries (draft_run_id, member_id, position)
  select requested_run_id, member.id, row_number() over (order by random())
  from public.lakers_season_members member
  join public.lakers_draft_runs run on run.season_id = member.season_id
  where run.id = requested_run_id and member.status = 'active' and member.games_allowed > 0;

  update public.lakers_draft_runs
  set order_generated_at = now(), reveal_started_at = null, reveal_completed_at = null,
      current_member_id = null, current_round = 0, overall_pick = 0,
      status = 'setup', updated_at = now()
  where id = requested_run_id;
end;
$$;

create or replace function public.lakers_reveal_draft_order(requested_run_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare started_at timestamptz;
declare season uuid;
begin
  select season_id into season from public.lakers_draft_runs where id = requested_run_id for update;
  if season is null or not lakers_private.is_season_member(season) then
    raise exception 'Active season membership required';
  end if;

  update public.lakers_draft_runs
  set reveal_started_at = coalesce(reveal_started_at, now()), updated_at = now()
  where id = requested_run_id and order_generated_at is not null
  returning reveal_started_at into started_at;

  if started_at is null then raise exception 'Draft order has not been generated'; end if;
  return started_at;
end;
$$;

create or replace function public.lakers_complete_draft_reveal(requested_run_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare season uuid;
begin
  select season_id into season from public.lakers_draft_runs where id = requested_run_id for update;
  if season is null or not lakers_private.is_season_member(season) then
    raise exception 'Active season membership required';
  end if;
  update public.lakers_draft_runs set reveal_completed_at = coalesce(reveal_completed_at, now()), updated_at = now()
  where id = requested_run_id and reveal_started_at is not null;
end;
$$;

create or replace function public.lakers_set_draft_control(
  requested_run_id uuid,
  requested_action text,
  requested_clock_seconds integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare first_member uuid;
begin
  if not lakers_private.is_commissioner() then raise exception 'Commissioner authorization required'; end if;
  perform 1 from public.lakers_draft_runs where id = requested_run_id for update;
  if not found then raise exception 'Draft run not found'; end if;

  if requested_action = 'start' then
    select member_id into first_member from public.lakers_draft_order_entries
    where draft_run_id = requested_run_id order by position limit 1;
    if first_member is null then raise exception 'Generate the draft order first'; end if;
    update public.lakers_draft_runs set status = 'live', current_member_id = coalesce(current_member_id, first_member),
      current_round = greatest(current_round, 1), overall_pick = greatest(overall_pick, 1), updated_at = now()
    where id = requested_run_id;
  elsif requested_action = 'pause' then
    update public.lakers_draft_runs set status = 'paused', updated_at = now() where id = requested_run_id and status = 'live';
  elsif requested_action = 'resume' then
    update public.lakers_draft_runs set status = 'live', updated_at = now() where id = requested_run_id and status = 'paused';
  elsif requested_action = 'open-check-in' then
    update public.lakers_draft_runs set check_in_open = true, updated_at = now() where id = requested_run_id;
  elsif requested_action = 'close-check-in' then
    update public.lakers_draft_runs set check_in_open = false, updated_at = now() where id = requested_run_id;
  elsif requested_action = 'clock' and requested_clock_seconds between 15 and 600 then
    update public.lakers_draft_runs set pick_clock_seconds = requested_clock_seconds, updated_at = now() where id = requested_run_id;
  else
    raise exception 'Invalid draft action';
  end if;
end;
$$;

create or replace function public.lakers_make_pick(requested_run_id uuid, requested_game_id uuid)
returns public.lakers_draft_picks
language plpgsql
security definer
set search_path = ''
as $$
declare run public.lakers_draft_runs;
declare member public.lakers_season_members;
declare result public.lakers_draft_picks;
declare next_member uuid;
declare next_round integer;
declare next_pick integer;
declare actor_is_commissioner boolean;
begin
  select * into run from public.lakers_draft_runs where id = requested_run_id for update;
  if run.id is null then raise exception 'Draft run not found'; end if;
  if run.status <> 'live' then raise exception 'Draft is not live'; end if;
  if run.current_member_id is null then raise exception 'Draft has no current picker'; end if;

  actor_is_commissioner := lakers_private.is_commissioner();
  select * into member from public.lakers_season_members where id = run.current_member_id;
  if member.id is null or member.status <> 'active' then raise exception 'Current member is not eligible'; end if;
  if not (member.user_id = (select auth.uid()) or (run.mode = 'test' and actor_is_commissioner)) then
    raise exception 'It is not your turn';
  end if;
  if (select count(*) from public.lakers_draft_picks where draft_run_id = run.id and member_id = member.id) >= member.games_allowed then
    raise exception 'Member game allowance reached';
  end if;
  if not exists (select 1 from public.lakers_games where id = requested_game_id and season_id = run.season_id and status = 'draft') then
    raise exception 'Game is not available';
  end if;

  insert into public.lakers_draft_picks (draft_run_id, game_id, member_id, selected_by, round, overall_pick)
  values (run.id, requested_game_id, member.id, (select auth.uid()), run.current_round, run.overall_pick)
  returning * into result;

  with ordered_slots as (
    select entry.member_id, rounds.round_number,
      row_number() over (
        order by rounds.round_number,
          case when rounds.round_number % 2 = 1 then entry.position else -entry.position end
      ) as calculated_pick
    from public.lakers_draft_order_entries entry
    join public.lakers_season_members sm on sm.id = entry.member_id
    cross join lateral generate_series(1, sm.games_allowed) rounds(round_number)
    where entry.draft_run_id = run.id and sm.status = 'active'
  )
  select member_id, round_number, calculated_pick into next_member, next_round, next_pick
  from ordered_slots where calculated_pick > run.overall_pick order by calculated_pick limit 1;

  update public.lakers_draft_runs
  set current_member_id = next_member,
      current_round = coalesce(next_round, current_round),
      overall_pick = coalesce(next_pick, overall_pick),
      status = case when next_member is null then 'completed' else status end,
      updated_at = now()
  where id = run.id;

  return result;
exception when unique_violation then
  raise exception 'That game or pick has already been selected';
end;
$$;

create or replace function public.lakers_reset_draft(requested_run_id uuid, requested_mode text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare actual_mode text;
begin
  if not lakers_private.is_commissioner() then raise exception 'Commissioner authorization required'; end if;
  select mode into actual_mode from public.lakers_draft_runs where id = requested_run_id for update;
  if actual_mode is null or actual_mode <> requested_mode then raise exception 'Draft mode mismatch'; end if;

  delete from public.lakers_draft_picks where draft_run_id = requested_run_id;
  delete from public.lakers_draft_order_entries where draft_run_id = requested_run_id;
  delete from public.lakers_check_ins where draft_run_id = requested_run_id;
  update public.lakers_draft_runs set status = 'setup', order_generated_at = null,
    reveal_started_at = null, reveal_completed_at = null, current_member_id = null,
    current_round = 0, overall_pick = 0, check_in_open = false, updated_at = now()
  where id = requested_run_id;
end;
$$;

create or replace function public.lakers_update_member_allowance(requested_member_id uuid, requested_allowance integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not lakers_private.is_commissioner() then raise exception 'Commissioner authorization required'; end if;
  if requested_allowance < 0 then raise exception 'Allowance cannot be negative'; end if;
  update public.lakers_season_members set games_allowed = requested_allowance where id = requested_member_id;
  if not found then raise exception 'Member not found'; end if;
end;
$$;

revoke execute on function public.lakers_randomize_draft_order(uuid) from public, anon;
revoke execute on function public.lakers_reveal_draft_order(uuid) from public, anon;
revoke execute on function public.lakers_complete_draft_reveal(uuid) from public, anon;
revoke execute on function public.lakers_set_draft_control(uuid, text, integer) from public, anon;
revoke execute on function public.lakers_make_pick(uuid, uuid) from public, anon;
revoke execute on function public.lakers_reset_draft(uuid, text) from public, anon;
revoke execute on function public.lakers_update_member_allowance(uuid, integer) from public, anon;
grant execute on function public.lakers_randomize_draft_order(uuid) to authenticated;
grant execute on function public.lakers_reveal_draft_order(uuid) to authenticated;
grant execute on function public.lakers_complete_draft_reveal(uuid) to authenticated;
grant execute on function public.lakers_set_draft_control(uuid, text, integer) to authenticated;
grant execute on function public.lakers_make_pick(uuid, uuid) to authenticated;
grant execute on function public.lakers_reset_draft(uuid, text) to authenticated;
grant execute on function public.lakers_update_member_allowance(uuid, integer) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lakers_draft_runs'
  ) then alter publication supabase_realtime add table public.lakers_draft_runs; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lakers_draft_picks'
  ) then alter publication supabase_realtime add table public.lakers_draft_picks; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lakers_draft_order_entries'
  ) then alter publication supabase_realtime add table public.lakers_draft_order_entries; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lakers_games'
  ) then alter publication supabase_realtime add table public.lakers_games; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lakers_season_members'
  ) then alter publication supabase_realtime add table public.lakers_season_members; end if;
end $$;
