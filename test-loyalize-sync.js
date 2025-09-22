import { supabase } from '@/integrations/supabase/client';

// Test the Loyalize API integration
const testLoyalizeSync = async () => {
  try {
    console.log('Testing Loyalize API sync...');
    
    const { data, error } = await supabase.functions.invoke('loyalize-integration', {
      body: { action: 'sync_brands' }
    });
    
    if (error) {
      console.error('Sync error:', error);
      return;
    }
    
    console.log('Sync result:', data);
    
    // Check if we now have proper Uber data
    const { data: uberBrands, error: uberError } = await supabase
      .from('brands')
      .select('loyalize_id, name, website_url, commission_rate')
      .ilike('name', '%uber%')
      .order('updated_at', { ascending: false });
    
    if (uberError) {
      console.error('Error checking brands:', uberError);
      return;
    }
    
    console.log('Current Uber brands:', uberBrands);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Export for manual testing
export { testLoyalizeSync };