-- Run with Supabase CLI after linking the approved cafela-listens project.
-- These assertions are intentionally Lakers-scoped and should be expanded with
-- real test user UUIDs before applying the migration to a shared environment.
begin;

select plan(8);
select has_table('public', 'lakers_seasons', 'Lakers seasons table exists');
select has_table('public', 'lakers_season_members', 'Lakers members table exists');
select has_table('public', 'lakers_games', 'Lakers games table exists');
select has_table('public', 'lakers_draft_runs', 'Lakers runs table exists');
select has_table('public', 'lakers_draft_order_entries', 'Lakers order table exists');
select has_table('public', 'lakers_draft_picks', 'Lakers picks table exists');
select has_function('public', 'lakers_make_pick', array['uuid', 'uuid'], 'Atomic pick function exists');
select has_function('public', 'lakers_reset_draft', array['uuid', 'text'], 'Protected reset function exists');

select * from finish();
rollback;
