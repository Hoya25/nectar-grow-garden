-- Ensure trigger exists to update portfolio lock balances when locks change
-- This trigger should fire AFTER any insert/update/delete on nctr_locks

-- First, drop existing trigger if it exists to recreate it properly
DROP TRIGGER IF EXISTS update_lock_balances_trigger ON public.nctr_locks;

-- Create/replace the trigger to fire on INSERT, UPDATE, DELETE
CREATE TRIGGER update_lock_balances_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.nctr_locks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_portfolio_lock_balances();

-- Also ensure the trigger for updating user status exists
DROP TRIGGER IF EXISTS update_user_status_on_lock_change ON public.nctr_locks;

CREATE TRIGGER update_user_status_on_lock_change
  AFTER INSERT OR UPDATE OR DELETE ON public.nctr_locks
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_user_status();