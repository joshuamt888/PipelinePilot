import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm'

export const supabase = createClient(
  'https://ekdqtjvmfsqxafurjoyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZHF0anZtZnNxeGFmdXJqb3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNjY4MDMsImV4cCI6MjA3NDk0MjgwM30.7s8kXUYB6jmqIWfe2aQ0UkGqzmh4OOvBbEpvgMWyNVM'
)