import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nckgptedewobnwofkitc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ja2dwdGVkZXdvYm53b2ZraXRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NTI4MzgsImV4cCI6MjA5MjEyODgzOH0.dZLqd7mhSH0ENx-k52Wr_QF8Z8grqcLLYvZo4_KBLQE'

export const supabase = createClient(supabaseUrl, supabaseKey)