import test from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_URL='https://db.example.test';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-service';
process.env.SUPABASE_ANON_KEY='test-anon';
const {default:handler}=await import('../api/agents.js');
const user={id:'11111111-1111-4111-8111-111111111111',email:'member@example.test'};
function response(){return {code:200,setHeader(){},status(n){this.code=n;return this},json(data){this.data=data;return this}}}
test('an existing agent can become an influencer without resetting their membership or ledger',async()=>{
  const original=global.fetch,calls=[];
  global.fetch=async(url,options={})=>{
    calls.push({url,options});const u=new URL(url);
    if(u.pathname==='/auth/v1/user')return Response.json(user);
    if(u.pathname==='/rest/v1/agents')return Response.json([{id:user.id,referral_code:'EXISTING',kyc_status:'verified',suspended:false,is_creator:options.method==='PATCH'}]);
    throw Error(url);
  };
  try{
    const res=response();await handler({method:'POST',query:{action:'signup'},headers:{authorization:'Bearer caller'},body:{full_name:'Member',contact_value:'member@example.test',is_creator:true,social_handle:'travelstories'}},res);
    assert.equal(res.code,200);assert.equal(res.data.agent.referral_code,'EXISTING');
    const patch=JSON.parse(calls.find(c=>c.options.method==='PATCH').options.body);
    assert.deepEqual(Object.keys(patch).sort(),['is_creator','social_handle','social_platform','audience_size'].sort());
    assert.equal(calls.some(c=>c.url.includes('agent_signup')),false);
  }finally{global.fetch=original}
});
test('agent dashboard totals come from the complete ledger, independently of its recent feed',async()=>{
  const original=global.fetch;
  global.fetch=async(url)=>{
    const path=new URL(url).pathname;
    if(path==='/auth/v1/user')return Response.json(user);
    if(path==='/rest/v1/agents')return Response.json([{id:user.id,kyc_status:'verified',suspended:false}]);
    if(path==='/rest/v1/rpc/cabana_agent_totals')return Response.json({approved:5,pending:1,live_leads:150,bookings:90,earned:9000});
    return Response.json([]);
  };
  try{
    const res=response();await handler({method:'GET',query:{action:'me'},headers:{authorization:'Bearer caller'}},res);
    assert.equal(res.code,200);assert.equal(res.data.referrals.length,0);assert.equal(res.data.totals.bookings,90);assert.equal(res.data.totals.earned,9000);
  }finally{global.fetch=original}
});
