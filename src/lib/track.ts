import { supabase } from '@/integrations/supabase/client';

export async function track(
  eventName: string,
  properties: Record<string, unknown> = {}
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('analytics_events' as any).insert({
      event_name: eventName,
      source_app: 'garden',
      user_id: user?.id ?? null,
      properties,
    });
  } catch (error) {
    // Fire-and-forget: don't break the app if analytics fails
    console.warn('[track] Failed to log event:', eventName, error);
  }
}
