-- The MultiAcademy linktree must never point at Kommunity. Event registration
-- goes through Gathin (GATHIN.multiacademy in src/lib/site.ts); the 0007 seed
-- shipped the old Kommunity URL by mistake.
--
-- Written as a new migration rather than an edit to 0007 because 0007 is
-- already applied everywhere; a fresh database applies 0007 then this one and
-- lands on the same result.

UPDATE academy_links
SET url = 'https://gathin.com/communities/multiacademy-community-94761667282726876508',
    updated_at = unixepoch()
WHERE url LIKE '%kommunity%';

-- Same guard for the main linktree, in case a Kommunity link was ever added there.
UPDATE links
SET url = 'https://gathin.com/communities/multigroup-community-34813861558366504236',
    updated_at = unixepoch()
WHERE url LIKE '%kommunity%';
