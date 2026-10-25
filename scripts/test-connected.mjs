import assert from 'node:assert/strict';
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(base && key, 'Configure the project URL and publishable key');
async function get(path, extra = {}) {
  const response = await fetch(base + path, { headers: { apikey: key, ...extra } });
  return { status: response.status, data: await response.json() };
}
const settings = await get('/auth/v1/settings');
assert.equal(settings.status, 200);
// Application login uses Pollar; Supabase OAuth settings do not authorize app data.
assert.equal(settings.data.external.anonymous_users, false);
const venues = await get('/rest/v1/venues?select=id,source_url,checked_at');
assert.equal(venues.status, 200);
assert.ok(venues.data.length >= 15, 'Expected the sourced catalog');
assert.ok(venues.data.filter((v) => v.source_url && v.checked_at).length >= 15);
for (const table of ['hotel_reservations', 'passport_profiles']) {
  const result = await get(`/rest/v1/${table}?select=id`);
  assert.equal(result.status, 200);
  assert.deepEqual(result.data, [], `Requests without a Pollar app session must not read ${table}`);
}
const privateSchema = await get('/rest/v1/qr_credentials?select=id', {
  'Accept-Profile': 'private',
});
assert.equal(privateSchema.status, 406);
assert.equal(privateSchema.data.code, 'PGRST106');
console.log(
  'Hosted checks passed: sourced catalog readable, private guest/passport data denied, private schema hidden. No writes performed.',
);
