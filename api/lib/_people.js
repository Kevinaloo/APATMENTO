/* A deliberate public projection. Account, payment and identity records stay private. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_ROLES = new Set(['traveller', 'host', 'agent', 'influencer', 'ambassador']);

export function publicText(value, max) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}
function hasContact(text) {
  return /[\w.+-]+@[\w.-]+\.[a-z]{2,}|https?:\/\/|www\.|(?:\+?\d[\s().-]*){7,}|\b(?:passport|national id|mpesa|m-pesa)\s*(?:no|number|:)/i.test(text);
}
async function optionalDb(db, path, options) {
  try { return await db(path, options); } catch { return []; }
}
async function fallbackRoles(db, id) {
  const [agents, listings, ambassadors] = await Promise.all([
    optionalDb(db, `agents?id=eq.${id}&select=id,is_creator,suspended&limit=1`),
    optionalDb(db, `listings?partner_id=eq.${id}&is_active=eq.true&status=eq.active&deleted_at=is.null&select=id&limit=1`),
    optionalDb(db, `ambassadors?id=eq.${id}&status=eq.active&select=id&limit=1`),
  ]);
  const roles = ['traveller'];
  if (listings.length) roles.push('host');
  if (agents[0] && !agents[0].suspended) roles.push('agent');
  if (agents[0]?.is_creator && !agents[0].suspended) roles.push('influencer');
  if (ambassadors.length) roles.push('ambassador');
  return roles;
}
export async function people(req, res, {db, session}) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method === 'POST') {
    const {user} = await session(req);
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const display_name = publicText(b.display_name, 60);
    const bio = publicText(b.bio, 240);
    if (!display_name) return res.status(400).json({error:'Choose a public display name.'});
    if (hasContact(display_name + ' ' + bio)) return res.status(400).json({error:'Keep contact details, ID numbers and payment information out of your public profile.'});
    // No caller-supplied id, roles, verification or private account fields.
    try { await db('member_public_profiles?on_conflict=user_id', {
      method:'POST', prefer:'resolution=merge-duplicates',
      body:{user_id:user.id, display_name, bio, published:b.published === true, updated_at:new Date().toISOString()}
    }); } catch (e) {
      if (e?.status === 404 || /member_public_profiles/i.test(e?.message || '')) {
        return res.status(503).json({error:'Public profile saving is being enabled. Please try again shortly.'});
      }
      throw e;
    }
    return res.status(200).json({ok:true});
  }
  if (req.method !== 'GET') return res.status(405).json({error:'Method not allowed.'});
  const id = String(req.query.id || '');
  if (!UUID.test(id)) return res.status(400).json({error:'Choose a valid member profile.'});
  let caller = null;
  if (req.headers.authorization) caller = (await session(req)).user;
  const [cards, accounts, roleResult] = await Promise.all([
    optionalDb(db, `member_public_profiles?user_id=eq.${id}&select=display_name,bio,published`),
    db(`profiles?id=eq.${id}&select=first_name,created_at`),
    optionalDb(db, 'rpc/cabana_public_role_badges', {method:'POST', body:{p_member:id}})
  ]);
  const card = cards[0], account = accounts[0];
  const projectedRoles = (Array.isArray(roleResult) ? roleResult : []).filter(r => ALLOWED_ROLES.has(r));
  const roles = projectedRoles.length ? projectedRoles : await fallbackRoles(db, id);
  const own = caller?.id === id;
  const professional = roles.some(r => r !== 'traveller');
  let peer = false;
  if (!own && !professional && !card?.published && caller) {
    const rows = await db(`chat_conversations?or=(and(host_id.eq.${caller.id},guest_id.eq.${id}),and(guest_id.eq.${caller.id},host_id.eq.${id}))&select=id&limit=1`);
    peer = rows.length > 0;
  }
  if (!roles.length || (!own && !professional && !card?.published && !peer)) {
    return res.status(404).json({error:'This profile is not available.'});
  }
  const showCard = own || card?.published;
  const firstName = publicText(account?.first_name, 60);
  // Existing private bios, surnames, social accounts and avatars are never copied here.
  return res.status(200).json({profile:{
    id, display_name:showCard && card?.display_name || (hasContact(firstName) ? '' : firstName) || 'Cabana member',
    bio:showCard ? card?.bio || '' : '',
    roles:roles.length ? roles : ['traveller'],
    member_since:account?.created_at ? String(account.created_at).slice(0,4) : null,
    can_edit:own,
    ...(own ? {published:card?.published === true} : {})
  }});
}
