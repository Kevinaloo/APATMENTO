// These are recognition records, never commission or referral entitlements.
// Accepted on-behalf transfers remain readable by their sender after the
// listing moves to its owner. Reading listings instead loses that history.
const contactKey = value => {
  const contact = String(value || '').trim().toLowerCase();
  if (contact.includes('@')) return 'email:' + contact;
  const digits = contact.replace(/\D/g, '');
  return digits.length >= 9 ? 'phone:' + digits.slice(-9) : null;
};
const earliest = (a, b) => {
  if (!Number.isFinite(Date.parse(a))) return b || null;
  if (!Number.isFinite(Date.parse(b))) return a;
  return Date.parse(a) <= Date.parse(b) ? a : b;
};

export function recognition(leads = [], referrals = [], now = new Date(), transfers = []) {
  const pipeline = leads.map(lead => ({
    ...lead, attribution_source: 'claim', listing_claims: [],
    // A legacy draft used to mark a prospect as listed before they joined.
    // A draft alone is not evidence that its owner registered or accepted it.
    status: lead.status === 'listed' && !lead.converted_user_id && !lead.converted_at ? 'claimed' : lead.status,
  }));
  const linked = new Map(pipeline.filter(l => l.converted_user_id && !['rejected', 'expired'].includes(l.status)).map(l => [l.converted_user_id, l]));
  const contacts = new Map();
  for (const lead of pipeline) {
    if (['rejected', 'expired'].includes(lead.status)) continue;
    const key = contactKey(lead.contact_raw || lead.contact_key);
    if (key && !contacts.has(key)) contacts.set(key, lead);
  }
  const listingClaims = transfers.filter(t => t.kind === 'on_behalf' && t.listing_id && t.from_user !== t.to_user);
  const acceptedListings = new Set(), acceptedPeople = new Set(), pendingListings = new Set();
  for (const transfer of listingClaims) {
    const accepted = transfer.status === 'accepted' && !!transfer.to_user && !!transfer.accepted_at;
    const pending = transfer.status === 'pending' && (!transfer.expires_at || Date.parse(transfer.expires_at) > now.getTime());
    if (accepted) {
      acceptedListings.add(transfer.listing_id);
      acceptedPeople.add(transfer.to_user);
    }
    if (pending) pendingListings.add(transfer.listing_id);
    const key = contactKey(transfer.to_contact || transfer.to_contact_norm);
    let lead = (accepted && linked.get(transfer.to_user)) || (key && contacts.get(key));
    // A contact alone must never merge two distinct, already linked accounts.
    if (accepted && lead?.converted_user_id && lead.converted_user_id !== transfer.to_user) lead = null;
    if (!lead && !accepted && !pending) continue;
    if (!lead) {
      lead = {
        id: 'transfer:' + transfer.id,
        full_name: transfer.to_name || 'Listing owner',
        contact_raw: transfer.to_contact || null,
        contact_kind: String(transfer.to_contact || '').includes('@') ? 'email' : 'phone',
        lead_type: 'host', status: accepted ? 'listed' : pending ? 'claimed' : 'expired',
        created_at: transfer.created_at, attribution_source: 'listing_transfer', listing_claims: [],
      };
      pipeline.push(lead);
      if (key) contacts.set(key, lead);
    }
    if (!lead.listing_claims.some(t => t.id === transfer.id)) lead.listing_claims.push({
      id: transfer.id, listing_id: transfer.listing_id, to_name: transfer.to_name,
      status: transfer.status === 'pending' && !pending ? 'expired' : transfer.status,
      accepted_at: transfer.accepted_at || null, created_at: transfer.created_at,
    });
    if (accepted) {
      lead.status = lead.status === 'earning' ? 'earning' : 'listed';
      lead.converted_user_id = transfer.to_user;
      lead.converted_at = earliest(lead.converted_at, transfer.accepted_at);
      lead.onboarding_stage = 'listing_claimed';
      lead.first_listing_id = transfer.listing_id;
      linked.set(transfer.to_user, lead);
    } else if (pending && lead.onboarding_stage !== 'listing_claimed') {
      lead.onboarding_stage = 'awaiting_owner';
    }
  }
  for (const ref of referrals) {
    if (!ref.referred_id) continue;
    const lead = linked.get(ref.referred_id);
    if (lead) {
      if (lead.attribution_source === 'claim') lead.attribution_source = 'claim_and_link';
      if (lead.attribution_source === 'listing_transfer') lead.attribution_source = 'listing_and_link';
      if (lead.status === 'claimed') lead.status = 'signed_up';
      lead.converted_at = earliest(lead.converted_at, ref.created_at);
    } else {
      const referred = {
        id: 'referral:' + ref.referred_id,
        full_name: 'Referred ' + ({ host: 'host', service_provider: 'service provider' }[ref.referral_type] || 'traveller'),
        lead_type: ref.referral_type === 'user' ? 'traveller' : ref.referral_type,
        status: 'signed_up', created_at: ref.created_at, converted_at: ref.created_at,
        converted_user_id: ref.referred_id, attribution_source: 'referral_link', listing_claims: [],
      };
      pipeline.push(referred);
      linked.set(ref.referred_id, referred);
    }
  }
  const people = new Map();
  for (const lead of pipeline) {
    if (!lead.onboarding_stage) lead.onboarding_stage = ({ claimed: 'contact_saved', signed_up: 'joined', listed: 'listed', earning: 'earning' })[lead.status] || lead.status;
    if (!['signed_up', 'listed', 'earning'].includes(lead.status)) continue;
    if (!lead.converted_user_id && !lead.converted_at) continue;
    const key = lead.converted_user_id || 'lead:' + lead.id;
    people.set(key, earliest(people.get(key), lead.converted_at));
  }
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  return {
    leads: pipeline,
    onboarded: people.size,
    this_month: [...people.values()].filter(date => Date.parse(date) >= monthStart && Date.parse(date) <= now.getTime()).length,
    link_registrations: new Set(referrals.map(r => r.referred_id).filter(Boolean)).size,
    listings_claimed: acceptedListings.size,
    owners_claimed: acceptedPeople.size,
    awaiting_owner: pendingListings.size,
  };
}

// PostgREST can cap each response below the requested page size.
export async function readAll(read, path) {
  const rows = [];
  for (;;) {
    const page = await read(`${path}&limit=500&offset=${rows.length}`);
    if (!Array.isArray(page)) throw new Error('Could not load recognition records.');
    if (!page.length) return rows;
    rows.push(...page);
  }
}
