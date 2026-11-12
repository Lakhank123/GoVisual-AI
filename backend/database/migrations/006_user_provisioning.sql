-- ==========================================
-- 006: Automatic User Provisioning
-- ==========================================

-- Function to handle new user provisioning
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into user_profiles
  INSERT INTO public.user_profiles (id, account_type, plan, credits_remaining, created_at, updated_at)
  VALUES (new.id, 'personal', 'free', 10, now(), now())
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert into brand_core_identity
  INSERT INTO public.brand_core_identity (business_id, brand_name, created_at, updated_at)
  VALUES (new.id, 'My Brand', now(), now())
  ON CONFLICT (business_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
