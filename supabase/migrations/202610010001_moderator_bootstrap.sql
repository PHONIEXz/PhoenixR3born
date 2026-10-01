-- Run after the numbered community migrations. This removes the earlier
-- first-visitor claim. Assign a moderator only to a known Auth user by ID.
begin;
drop function if exists private.claim_first_moderator();
commit;

-- After the owner has signed in, find the intended account in
-- Supabase Dashboard > Authentication > Users and copy its User UID.
-- Then run this separately in the SQL Editor with the exact UID:
-- insert into private.moderators(user_id)
-- values ('REPLACE_WITH_OWNER_AUTH_USER_UID'::uuid)
-- on conflict (user_id) do nothing;

-- To inspect existing moderator IDs before inviting contributors:
-- select user_id from private.moderators;
