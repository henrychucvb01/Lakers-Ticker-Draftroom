-- Run only after the Lakers migration. This inserts Lakers data only.
insert into public.lakers_seasons (name, is_active)
values ('2026–27 Lakers Season', true)
on conflict (name) do update set is_active = excluded.is_active;

insert into public.lakers_season_members (season_id, name, status, games_allowed)
select season.id, member.name, member.status, 5
from public.lakers_seasons season
cross join (values
  ('Jason', 'active'), ('Huy', 'active'), ('Courtney', 'active'),
  ('Uduak', 'active'), ('Theo', 'pending')
) as member(name, status)
where season.name = '2026–27 Lakers Season'
on conflict (season_id, name) do nothing;

insert into public.lakers_games (season_id, opponent, game_date, game_time, status, preseason, cup)
select season.id, game.opponent, game.game_date::date, game.game_time, 'draft', game.preseason, game.cup
from public.lakers_seasons season
cross join (values
  ('Sacramento Kings', '2026-10-08', '7:30 PM', true, false),
  ('LA Clippers', '2026-10-23', '7:00 PM', false, false),
  ('Portland Trail Blazers', '2026-10-27', '8:00 PM', false, false),
  ('Charlotte Hornets', '2026-11-17', '7:00 PM', false, false),
  ('Sacramento Kings', '2026-11-20', '7:00 PM', false, true),
  ('Utah Jazz', '2026-11-23', '7:00 PM', false, false),
  ('New Orleans Pelicans', '2026-12-14', '7:00 PM', false, false),
  ('Philadelphia 76ers', '2026-12-25', '2:00 PM', false, false),
  ('Memphis Grizzlies', '2026-12-27', '6:00 PM', false, false),
  ('Boston Celtics', '2027-01-07', '7:00 PM', false, false),
  ('Orlando Magic', '2027-01-14', '7:00 PM', false, false),
  ('Milwaukee Bucks', '2027-01-17', '6:00 PM', false, false),
  ('Denver Nuggets', '2027-02-12', '7:30 PM', false, false),
  ('Chicago Bulls', '2027-02-16', '7:00 PM', false, false),
  ('Houston Rockets', '2027-02-18', '7:00 PM', false, false),
  ('OKC Thunder', '2027-03-06', '5:30 PM', false, false),
  ('Cleveland Cavaliers', '2027-03-12', '7:00 PM', false, false),
  ('Golden State Warriors', '2027-03-14', '7:00 PM', false, false),
  ('Dallas Mavericks', '2027-03-21', '7:00 PM', false, false),
  ('Minnesota Timberwolves', '2027-04-07', '7:00 PM', false, false),
  ('Phoenix Suns', '2027-04-11', '5:30 PM', false, false)
) as game(opponent, game_date, game_time, preseason, cup)
where season.name = '2026–27 Lakers Season'
on conflict (season_id, opponent, game_date) do nothing;

insert into public.lakers_draft_runs (season_id, mode)
select id, mode
from public.lakers_seasons
cross join (values ('real'), ('test')) as draft(mode)
where name = '2026–27 Lakers Season'
on conflict (season_id, mode) do nothing;

