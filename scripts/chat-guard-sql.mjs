// Prints a SQL query that checks the Postgres guard against tests/chat-guard.vectors.json.
// Usage: node scripts/chat-guard-sql.mjs | psql …   (any row returned is a disagreement)
import { readFileSync } from 'node:fs';
const v = JSON.parse(readFileSync(new URL('../tests/chat-guard.vectors.json', import.meta.url), 'utf8'));
const q = s => "'" + s.replace(/'/g, "''") + "'";
const rows = v.single.map(x => `(${q(x.text)}, ${q(x.hard.join(','))})`).join(',\n');
const seq = v.sequences.map(s => `(array[${s.messages.slice(0,-1).map(q).join(',')}]::text[], ${q(s.messages.at(-1))}, ${s.spans})`).join(',\n');
console.log(`with v(t, want) as (values ${rows}),
r as (select t, want, (select string_agg(x, ',' order by x) from jsonb_array_elements_text(cabana_private.chat_guard(t)->'hard') x) got from v)
select 'single' kind, t, want, got from r where (want = '' and coalesce(got,'') <> '') or (want <> '' and not (string_to_array(want, ',') <@ string_to_array(coalesce(got,''), ',')))
union all
select 'seq', p::text || ' + ' || t, s::text, cabana_private.chat_guard_spans(p, t)::text from (values ${seq}) s(p, t, s) where cabana_private.chat_guard_spans(p, t) <> s;`);
