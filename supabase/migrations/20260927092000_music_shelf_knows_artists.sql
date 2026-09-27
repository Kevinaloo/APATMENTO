-- Shelving knows the artists, not only the titles.
--
-- music_refresh_standings() re-shelves every active chart row with
-- music_shelf() after each write, so this function, not the Edge Function,
-- has the last word on a record's genre. It only read titles, and titles
-- rarely say what a record sounds like: "Rema - TEA" and "Tyla - THAT GIRL"
-- both landed on Other, and the Afrobeat and Amapiano shelves stayed empty.
--
-- The patterns below are the Edge Function's CULTURES, GENRES,
-- ARTIST_CULTURES and ARTIST_GENRES lists (supabase/functions/youtube-sync),
-- in the same order and with the same precedence: a title that names a
-- culture or a genre wins, the artist decides only when the title is
-- silent. tests/cabana-live.test.mjs holds the two copies to each other.
--
-- "RemaVEVO" is Rema: the label suffix is split off before matching.

create or replace function public.music_shelf(p_title text, p_artist text)
returns table (genre text, culture text)
language plpgsql
immutable
set search_path = ''
as $$
declare
  hay text := regexp_replace(lower(coalesce(p_title, '') || ' ' || coalesce(p_artist, '')), 'vevo\M', ' vevo', 'g');
begin
  culture := case
    when hay ~ '\m(mugithi|kikuyu|gikuyu|kiuk|muthirigu)\M'     then 'Kikuyu'
    when hay ~ '\m(ohangla|luo|dholuo|nyatiti|benga)\M'         then 'Luo'
    when hay ~ '\m(kamba|kikamba|katitu|kilumi)\M'              then 'Kamba'
    when hay ~ '\m(kalenjin|kipsigis|nandi)\M'                  then 'Kalenjin'
    when hay ~ '\m(luhya|isukuti|bukusu|maragoli)\M'            then 'Luhya'
    when hay ~ '\m(mijikenda|giriama|chonyi|duruma|sengenya)\M' then 'Mijikenda'
    when hay ~ '\m(maasai|masai|olmaa)\M'                       then 'Maasai'
    when hay ~ '\m(kisii|gusii|ekegusii)\M'                     then 'Kisii'
    when hay ~ '\m(meru|kimeru)\M'                              then 'Meru'
    when hay ~ '\m(taita|dawida)\M'                             then 'Taita'
    when hay ~ '\m(somali|soomaali)\M'                          then 'Somali'
    when hay ~ '\m(turkana|ngiturkana)\M'                       then 'Turkana'
    when hay ~ '\m(taarab|mwanzele|chakacha)\M'                 then 'Swahili coast'
    else null
  end;

  if culture is null then
    culture := case
      when hay ~ '\m(samidoh|muigai wa njoroge|muigai kigutha|kamande wa kioi|ben githae|joseph kamaru|jose gatutura|karangu muraya|john de''?mathew|ruth wamuyu|mike rua|salim junior)\M' then 'Kikuyu'
      when hay ~ '\m(alex kasau|katombi|kativui|maxwell mwalimu|kithungo|ken wa maria|kalapata)\M'                                                                                         then 'Kamba'
      when hay ~ '\m(prince indah|emma jalamo|musa jakadala|odongo swagg|osogo winyo|dola kabarry|elisha toto)\M'                                                                          then 'Luo'
      when hay ~ '\m(emmy kosgei|kipchumba|kenene|msupa s)\M'                                                                                                                              then 'Kalenjin'
      else null
    end;
  end if;

  genre := case
    when culture is not null then 'tribal'
    when hay ~ '\m(gengetone|genge|sheng|mbogi|boondocks|ochungulo)\M'         then 'gengetone'
    when hay ~ '\m(drill|trapcore|plug)\M'                                     then 'drill'
    when hay ~ '\m(amapiano|log\s?drum|yanos)\M'                               then 'amapiano'
    when hay ~ '\m(bongo|singeli|tanzania|bongofleva|wasafi)\M'                then 'bongo'
    when hay ~ '\m(gospel|worship|praise|bwana|mungu|yesu|jesus|hymn|tenzi)\M' then 'gospel'
    when hay ~ '\m(reggae|dancehall|riddim|rasta|roots\s?rock)\M'              then 'reggae'
    when hay ~ '\m(hip\s?hop|rap|cypher|freestyle|bars)\M'                     then 'hiphop'
    when hay ~ '\m(r&b|rnb|soul|ballad|acoustic)\M'                            then 'rnb'
    when hay ~ '\m(afrobeat|afrobeats|afropop|afro\s?fusion|naija)\M'          then 'afrobeat'
    else 'other'
  end;

  if genre = 'other' then
    genre := case
      when hay ~ '\m(mercy masika|guardian angel|israel mbonyi|rose muhando|christina shusho|victor muthenya|size 8|daddy owen|kambua|gloria muliro|eunice njeri|paul clement|goodluck gozbert|zabron singers)\M'                                               then 'gospel'
      when hay ~ '\m(rema|asake|burna ?boy|wizkid|davido|fireboy|omah lay|joeboy|ayra starr|tems|kizz daniel|olamide|tiwa savage|ckay|victony|shallipopi|seyi vibez|bnxn|ruger|mayorkun|adekunle gold|zinoleesky|young jonn|khaid|odumodublvck|rexxie|lojay)\M' then 'afrobeat'
      when hay ~ '\m(tyla|kabza|maphorisa|uncle waffles|focalistic|young stunna|tman xpress|mellow ?(&|and) ?sleazy|kelvin momo|daliwonga|scorpion kings|nkosazana|sir trill|major league)\M'                                                                   then 'amapiano'
      when hay ~ '\m(diamond platnumz|harmonize|zuchu|rayvanny|mbosso|alikiba|marioo|jux|nandy|lava lava|konde boy|kusah|jay melody|phina)\M'                                                                                                                   then 'bongo'
      when hay ~ '\m(buruklyn boyz|dyana cods|lil maina|kushman|mad cleet|hype beast)\M'                                                                                                                                                                        then 'drill'
      when hay ~ '\m(khaligraph|octopizzo|nyashinski|wakadinali|sewersydaa|scar mkadinali|kaa la moto|juliani|king kaka|kristoff|breeder lw)\M'                                                                                                                 then 'hiphop'
      when hay ~ '\m(mejja|ethic entertainment|sailors|ochungulo|exray|trio mio|zzero sufuri|toxic lyrikali|virusi mbaya|matata|ssaru|femi one)\M'                                                                                                              then 'gengetone'
      when hay ~ '\m(sauti sol|bien|nviiri|otile brown|nadia mukami|arrow ?bwoy|jovial|sofiya nzau|savara|bensoul|bahati|willy paul|nikita kering|charisma|xenia manasseh|kaskazini)\M'                                                                         then 'afropop'
      else 'other'
    end;
  end if;

  return next;
end;
$$;

comment on function public.music_shelf(text, text) is
  'Classifies a record into a genre, and a Kenyan culture when it is sung in a mother tongue. Title first, then the artist. Mirrors shelveFor() in the youtube-sync Edge Function.';

-- Re-shelve the board that is already there.
select public.music_refresh_standings('KE');
