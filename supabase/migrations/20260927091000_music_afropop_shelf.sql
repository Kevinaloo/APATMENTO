-- Cabana Live · the Afropop shelf
-- East African pop (Sauti Sol, Nviiri, Otile Brown, Nadia Mukami…) is its
-- own sound and was being filed under "other". The sync function now
-- shelves by artist as well as by title, and needs somewhere to put it.
alter table public.music_chart_tracks drop constraint if exists music_chart_tracks_genre_ck;
alter table public.music_chart_tracks add constraint music_chart_tracks_genre_ck
  check (genre = any (array['gengetone', 'afrobeat', 'afropop', 'bongo', 'drill', 'amapiano',
                            'gospel', 'rnb', 'hiphop', 'reggae', 'tribal', 'other']));
