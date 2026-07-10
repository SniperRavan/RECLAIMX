const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const supabase = require('./config/supabase');

async function test() {
  try {
    const { data: claims, error: e1 } = await supabase
      .from('claims')
      .select('id, claimant_id, status, lost_items(item_name, user_id), found_items(id, user_id)');
    
    console.log('--- CLAIMS ---');
    for (const c of claims || []) {
      console.log(`Claim ID: ${c.id}`);
      console.log(`  Status: ${c.status}`);
      console.log(`  Claimant (Owner) User ID: ${c.claimant_id}`);
      console.log(`  Finder User ID: ${c.found_items?.user_id}`);
    }

    const { data: users, error: e2 } = await supabase.from('users').select('id, email, name');
    console.log('\n--- USERS ---');
    for (const u of users || []) {
      console.log(`User ID: ${u.id}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Name: ${u.name}`);
    }
  } catch (err) {
    console.error(err);
  }
}
test();
