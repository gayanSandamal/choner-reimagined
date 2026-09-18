import { supabase } from '@/lib/supabase';

export interface LocationRow {
  value: string;
  label: string;
  location_group: 'colombo_city' | 'greater_colombo';
  sort_order: number;
}

// The 68-location list, read straight from the reference table. Tags live in
// location_tags and are never joined onto the user record, so a correction to
// the (explicitly first-draft) tagging is a data-only migration.
export async function getLocations() {
  const { data, error } = await (supabase as any)
    .from('locations')
    .select('value,label,location_group,sort_order')
    .order('location_group')
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as LocationRow[];
}
