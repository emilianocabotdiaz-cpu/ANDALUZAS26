import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://TU-PROYECTO.supabase.co'
const supabaseKey = 'sb_publishable_XXXXX'

export const supabase = createClient(supabaseUrl, supabaseKey)
