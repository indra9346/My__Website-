-- Portfolio favorites and their display order. TileRoom project rows also live in
-- this table; they keep the default false and are not featured on the portfolio.
alter table public.projects
  add column if not exists is_favorite boolean not null default false,
  add column if not exists favorite_order integer;

alter table public.projects drop constraint if exists projects_favorite_order_check;
alter table public.projects add constraint projects_favorite_order_check
  check (favorite_order is null or favorite_order >= 1);

-- Keep the two requested live projects featured first. Match the existing rows by
-- title or domain so this remains safe when run on a database that already has them.
with grainbazar as (
  select id
  from public.projects
  where user_id is null
    and (
      lower(coalesce(title, '')) like '%grain%bazar%'
      or lower(coalesce("Demo", '')) like '%grainbazar.com%'
    )
  order by
    case when lower(coalesce("Demo", '')) like '%grainbazar.com%' then 0 else 1 end,
    "Display_Order" nulls last,
    created_at
  limit 1
)
update public.projects p
set "Demo" = 'https://grainbazar.com',
    is_favorite = true,
    favorite_order = 1
from grainbazar g
where p.id = g.id;

insert into public.projects (title, "Description", "Image", "Tags", "Demo", "Display_Order", category, company, status, is_favorite, favorite_order)
select 'GrainBazar', null, '/projects/grain-bazar.jpg', '{}', 'https://grainbazar.com',
       coalesce((select max("Display_Order") + 1 from public.projects where user_id is null), 1),
       'Client Projects', null, 'completed', true, 1
where not exists (
  select 1 from public.projects
  where user_id is null
    and (lower(coalesce(title, '')) like '%grain%bazar%' or lower(coalesce("Demo", '')) like '%grainbazar.com%')
);

-- Use the direct live URLs already documented with the portfolio's project facts.
-- Do not manufacture URLs for projects whose live deployment is not known.
update public.projects
set "Demo" = case
  when lower(coalesce(title, '')) like '%tolet%hub%' then 'https://tolet-iota.vercel.app/'
  when lower(coalesce(title, '')) like '%dj%video%editing%' then 'https://dj-video-editing-services.vercel.app/'
  when lower(coalesce(title, '')) like '%kbk%film%' then 'https://kbk-film-studios-lake.vercel.app/'
  when lower(coalesce(title, '')) like '%stone%quarry%erp%' or lower(coalesce(title, '')) like '%stonequarryerp%' then 'https://stone-quarry-business-erp.vercel.app/'
  when lower(coalesce(title, '')) like '%sds%tile%' or lower(coalesce(title, '')) like '%tile%visualizer%' then 'https://tile-visualizer-roan.vercel.app/'
  when lower(coalesce(title, '')) like '%public%school%' and (lower(coalesce(title, '')) like '%j s%' or lower(coalesce(title, '')) like '%js%') then 'https://jspsoft.vercel.app/'
  when lower(coalesce(title, '')) like '%jobs%kolar%' then 'https://www.jobsinkolar.com/'
  when lower(coalesce(title, '')) like '%gifting%destiny%' then 'https://giftingdestiny.com/'
  when lower(coalesce(title, '')) like '%kmg%stone%' then 'https://www.kmgstones.com/'
  when lower(coalesce(title, '')) like '%sari%' then 'https://sarees.swandigitalsolutions.workers.dev/'
  when lower(coalesce(title, '')) like '%discipline%karate%' then 'https://karate-website-new.swandigitalsolutions.workers.dev/'
  when lower(coalesce(title, '')) like '%meridian%motor%heritage%' then 'https://heritage-motors-gallery.swandigitalsolutions.workers.dev/'
  when lower(coalesce(title, '')) like '%i_mall%' or lower(coalesce(title, '')) like '%i-mall%' or lower(coalesce(title, '')) like '%i mall%' then 'https://indra9346.github.io/I_Mall/'
  else "Demo"
end
where user_id is null
  and (
    lower(coalesce(title, '')) like '%tolet%hub%'
    or lower(coalesce(title, '')) like '%dj%video%editing%'
    or lower(coalesce(title, '')) like '%kbk%film%'
    or lower(coalesce(title, '')) like '%stone%quarry%erp%'
    or lower(coalesce(title, '')) like '%stonequarryerp%'
    or lower(coalesce(title, '')) like '%sds%tile%'
    or lower(coalesce(title, '')) like '%tile%visualizer%'
    or (lower(coalesce(title, '')) like '%public%school%' and (lower(coalesce(title, '')) like '%j s%' or lower(coalesce(title, '')) like '%js%'))
    or lower(coalesce(title, '')) like '%jobs%kolar%'
    or lower(coalesce(title, '')) like '%gifting%destiny%'
    or lower(coalesce(title, '')) like '%kmg%stone%'
    or lower(coalesce(title, '')) like '%sari%'
    or lower(coalesce(title, '')) like '%discipline%karate%'
    or lower(coalesce(title, '')) like '%meridian%motor%heritage%'
    or lower(coalesce(title, '')) like '%i_mall%'
    or lower(coalesce(title, '')) like '%i-mall%'
    or lower(coalesce(title, '')) like '%i mall%'
  );

-- The student CRUD app has source code but no documented live deployment.
-- Remove the incorrect I_Mall/Google link and let admin show it as missing.
update public.projects
set "Demo" = null
where user_id is null
  and lower(coalesce(title, '')) like '%student%data%management%';

-- A Google search or redirect is not a project deployment.
update public.projects
set "Demo" = null
where user_id is null
  and lower(coalesce("Demo", '')) ~ '^https?://(www\.)?google\.[a-z.]+/(search|url)(/|\?|$)';

-- The Sanchari venture spotlight becomes an ordinary editable favorite. Keep its
-- original copy, feature list, tags and image so none of the existing detail is lost.
with sanchari as (
  select id
  from public.projects
  where user_id is null
    and (
      lower(coalesce(title, '')) like '%sanchari%'
      or lower(coalesce("Demo", '')) like '%sancharitrips.com%'
    )
  order by
    case when lower(coalesce("Demo", '')) like '%sancharitrips.com%' then 0 else 1 end,
    "Display_Order" nulls last,
    created_at
  limit 1
)
update public.projects p
set title = 'Sanchari Trips',
    "Description" = E'Co-Founder & Technical Head\n\nSmall-group road trips from Bengaluru in a six-seat car. I designed and built the whole platform, from the booking flow and payments to the admin panel the team works in.\n\nKey features:\n• Live seat map: travellers pick their own seat in the car\n• Direct UPI payments with QR code and UTR confirmation\n• Offers, coupons and a creator programme\n• Kannada and English language switch\n• Chat guide that answers from live trip data\n• Smart search across 430 places in Karnataka\n• Admin panel for bookings, payments, trips, media and staff access\n• Money and seat rules covered by automated tests',
    "Image" = '/projects/sanchari-trips.jpg',
    "Tags" = array['Next.js', 'React', 'TypeScript', 'Supabase', 'PostgreSQL', 'Tailwind CSS', 'Three.js', 'Vitest', 'Vercel'],
    "Demo" = 'https://www.sancharitrips.com',
    category = 'Co-Founded Ventures',
    company = null,
    status = 'ongoing',
    is_favorite = true,
    favorite_order = 2
from sanchari s
where p.id = s.id;

insert into public.projects (title, "Description", "Image", "Tags", "Demo", "Display_Order", category, company, status, is_favorite, favorite_order)
select 'Sanchari Trips',
       E'Co-Founder & Technical Head\n\nSmall-group road trips from Bengaluru in a six-seat car. I designed and built the whole platform, from the booking flow and payments to the admin panel the team works in.\n\nKey features:\n• Live seat map: travellers pick their own seat in the car\n• Direct UPI payments with QR code and UTR confirmation\n• Offers, coupons and a creator programme\n• Kannada and English language switch\n• Chat guide that answers from live trip data\n• Smart search across 430 places in Karnataka\n• Admin panel for bookings, payments, trips, media and staff access\n• Money and seat rules covered by automated tests',
       '/projects/sanchari-trips.jpg',
       array['Next.js', 'React', 'TypeScript', 'Supabase', 'PostgreSQL', 'Tailwind CSS', 'Three.js', 'Vitest', 'Vercel'],
       'https://www.sancharitrips.com',
       coalesce((select max("Display_Order") + 1 from public.projects where user_id is null), 1),
       'Co-Founded Ventures', null, 'ongoing', true, 2
where not exists (
  select 1 from public.projects
  where user_id is null
    and (lower(coalesce(title, '')) like '%sanchari%' or lower(coalesce("Demo", '')) like '%sancharitrips.com%')
);
