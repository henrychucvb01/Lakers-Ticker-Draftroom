-- Replace the placeholder UUIDs only after creating users in Supabase Authentication.
-- Do not run this file unchanged.

insert into public.lakers_profiles (user_id, display_name, role)
values
  ('COMMISSIONER_AUTH_USER_UUID', 'Commissioner', 'commissioner'),
  ('JASON_AUTH_USER_UUID', 'Jason', 'member'),
  ('HUY_AUTH_USER_UUID', 'Huy', 'member'),
  ('COURTNEY_AUTH_USER_UUID', 'Courtney', 'member'),
  ('UDUAK_AUTH_USER_UUID', 'Uduak', 'member');

update public.lakers_season_members set user_id = 'JASON_AUTH_USER_UUID' where name = 'Jason';
update public.lakers_season_members set user_id = 'HUY_AUTH_USER_UUID' where name = 'Huy';
update public.lakers_season_members set user_id = 'COURTNEY_AUTH_USER_UUID' where name = 'Courtney';
update public.lakers_season_members set user_id = 'UDUAK_AUTH_USER_UUID' where name = 'Uduak';
