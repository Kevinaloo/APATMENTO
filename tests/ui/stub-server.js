/* ═══════════════════════════════════════════════════════════════════════════
   AMBASSADOR UI · STUB SERVER
   ─────────────────────────────────────────────────────────────────────────
   Serves the repo statically and answers /api/ambassadors from fixtures, so
   the gateway and dashboard can be driven end to end without a live Supabase
   or a real session.

   The scenario (which gate verdict to return) is chosen by a `scenario`
   cookie the test sets before navigating, which is the only way to reach the
   refusal states without standing up four real accounts.

     node tests/ui/stub-server.js          # then open localhost:8899
   ═══════════════════════════════════════════════════════════════════════════ */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const TYPES = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};

const ME = {
  ok:true, enrolled:true,
  me:{ id:'amb-1', full_name:'Amara Otieno', email:'amara@example.com', region:'Nairobi',
       slug:'amara-otieno', referral_code:'AMB-7K2P9X', status:'active', risk_score:0,
       monthly_target:12, enrolled_at:'2026-06-02T09:00:00Z',
       leads_open:5, leads_converted:9, leads_earning:4, converted_this_month:7,
       earned_total:48250, earned_available:31400, earned_pending:16850 },
  leads:[
    {id:'1',full_name:'Wanjiru Kamau',status:'earning',lead_type:'host',city:'Nairobi',category:'stays',created_at:'2026-06-11T10:00:00Z'},
    {id:'2',full_name:'Brian Otieno',status:'listed',lead_type:'service_provider',city:'Mombasa',category:'carhire',created_at:'2026-07-02T10:00:00Z'},
    {id:'3',full_name:'Fatuma Hassan',status:'signed_up',lead_type:'host',city:'Diani',category:'stays',created_at:'2026-07-20T10:00:00Z'},
    {id:'4',full_name:'Peter Njoroge',status:'claimed',lead_type:'host',city:'Nakuru',category:'stays',created_at:'2026-08-10T10:00:00Z',claim_expires_at:'2026-08-24T10:00:00Z'},
    {id:'5',full_name:'Grace Achieng',status:'claimed',lead_type:'traveller',city:'Kisumu',category:'tours',created_at:'2026-08-15T10:00:00Z',claim_expires_at:'2026-09-29T10:00:00Z'},
    {id:'6',full_name:'Samuel Kiptoo',status:'earning',lead_type:'host',city:'Eldoret',category:'stays',created_at:'2026-06-25T10:00:00Z'}
  ],
  earnings:[
    {commission_kes:12400,status:'confirmed',available_at:'2026-07-01T00:00:00Z',service_type:'stays',referral_type:'host'},
    {commission_kes:9800, status:'confirmed',available_at:'2026-07-14T00:00:00Z',service_type:'tours',referral_type:'user'},
    {commission_kes:9200, status:'confirmed',available_at:'2026-08-02T00:00:00Z',service_type:'stays',referral_type:'host'},
    {commission_kes:16850,status:'confirmed',available_at:'2026-09-10T00:00:00Z',service_type:'stays',referral_type:'host'}
  ],
  link:'https://cabana.africa/?ref=AMB-7K2P9X'
};

const BOARD = { ok:true, board:[
  {id:'x1',rank:1,name:'Kevin M.',region:'Nairobi',onboarded:23},
  {id:'amb-1',rank:2,name:'Amara O.',region:'Nairobi',onboarded:9},
  {id:'x3',rank:3,name:'Zawadi K.',region:'Mombasa',onboarded:7},
  {id:'x4',rank:4,name:'Tunde A.',region:'Lagos',onboarded:4}
]};

const ROSTER = { ok:true, roster:[
  {email:'amara@example.com',full_name:'Amara Otieno',region:'Nairobi',invited_at:'2026-06-01T09:00:00Z',
   ambassador:{id:'amb-1',status:'active',risk_score:0,enrolled_at:'2026-06-02T09:00:00Z'}},
  {email:'kevin@example.com',full_name:'Kevin Mwangi',region:'Nairobi',invited_at:'2026-05-20T09:00:00Z',
   ambassador:{id:'amb-2',status:'active',risk_score:0,enrolled_at:'2026-05-21T09:00:00Z'}},
  {email:'newbie@example.com',full_name:'Not Yet Joined',region:'Kisumu',invited_at:'2026-08-18T09:00:00Z',ambassador:null},
  {email:'gone@example.com',full_name:'Former Person',region:'Accra',invited_at:'2026-03-02T09:00:00Z',
   revoked_at:'2026-07-01T09:00:00Z',ambassador:null}
]};

// Scenario is chosen by the ?scenario= on the page URL, relayed via a cookie
// the test sets before navigation.
function gateFor(sc){
  if (sc==='unconfirmed')  return {ok:false,reason:'email_unconfirmed',email:'ghost@example.com'};
  if (sc==='notauth')      return {ok:false,reason:'not_authorised',email:'outsider@example.com'};
  if (sc==='suspended')    return {ok:false,reason:'suspended',detail:'Two claims were flagged for review.'};
  if (sc==='enrol')        return {ok:true,enrolled:false,email:'amara@example.com',full_name:'Amara Otieno',region:'Nairobi',target:12};
  return {ok:true,enrolled:true,email:'amara@example.com'};
}

const PORT = Number(process.env.UI_TEST_PORT || 8899);

http.createServer((req,res)=>{
  const u = url.parse(req.url,true);
  if (u.pathname === '/api/ambassadors'){
    const sc = (req.headers.cookie||'').match(/scenario=([a-z]+)/);
    const scenario = sc?sc[1]:'ok';
    const a = u.query.action;
    let body = {ok:false,error:'unknown'};
    if (a==='gate')        body = gateFor(scenario);
    else if (a==='me')     body = scenario==='ok' ? ME : {ok:false,reason:'not_authorised'};
    else if (a==='leaderboard') body = BOARD;
    else if (a==='roster') body = ROSTER;
    else if (a==='enrol')  body = {ok:true,created:true,ambassador:ME.me};
    else if (a==='claim-lead') body = {ok:true,lead:{id:'new',full_name:'New Lead',status:'claimed',lead_type:'host',city:'Nairobi',category:'stays',created_at:new Date().toISOString(),claim_expires_at:new Date(Date.now()+45*864e5).toISOString()}};
    res.writeHead(200,{'Content-Type':'application/json'});
    return res.end(JSON.stringify(body));
  }
  let p = u.pathname === '/' ? '/index.html' : u.pathname;
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){
    res.writeHead(404); return res.end('nope');
  }
  res.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});
  fs.createReadStream(f).pipe(res);
}).listen(PORT, ()=>console.log('serving on ' + PORT));
