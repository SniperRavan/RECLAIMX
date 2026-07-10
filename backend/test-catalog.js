const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const supabase = require('./config/supabase');

async function test() {
  try {
    const { data, error } = await supabase.from('pg_proc').select('proname').limit(5);
    if (error) {
      console.log('Error selecting pg_proc:', error);
    } else {
      console.log('Successfully selected pg_proc:', data);
    }
  } catch (err) {
    console.error(err);
  }
}
test();
