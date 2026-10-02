-- The organiser's door list needs a name; the checkout asks for one.
alter table public.event_tickets add column if not exists guest_name text;
do $$ begin
  alter table public.event_tickets add constraint event_tickets_guest_name_len check (guest_name is null or length(guest_name) <= 120);
exception when duplicate_object then null; end $$;
comment on column public.event_tickets.guest_name is 'Name for the organiser''s door list, typed by the buyer.';
