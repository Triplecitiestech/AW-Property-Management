-- ============================================================
-- Migration 003: Seed Data (Development Only)
-- Run ONLY in development/staging — not production.
-- ============================================================
-- NOTE: This seed creates sample data assuming you have already
-- created a user account via Supabase Auth. Replace the UUIDs
-- with real user IDs from your auth.users table.
--
-- To find your user ID: SELECT id FROM auth.users LIMIT 5;
-- Then replace 'OWNER_USER_ID' and 'MANAGER_USER_ID' below.
-- ============================================================

DO $$
DECLARE
  v_owner_id    UUID;
  v_manager_id  UUID;
  v_prop1_id    UUID := uuid_generate_v4();
  v_prop2_id    UUID := uuid_generate_v4();
  v_prop3_id    UUID := uuid_generate_v4();
  v_stay1_id    UUID := uuid_generate_v4();
  v_stay2_id    UUID := uuid_generate_v4();
  v_ticket1_id  UUID := uuid_generate_v4();
  v_ticket2_id  UUID := uuid_generate_v4();
  v_ticket3_id  UUID := uuid_generate_v4();
BEGIN
  -- Get the first two users (owner = first, manager = second)
  SELECT id INTO v_owner_id FROM auth.users ORDER BY created_at LIMIT 1;
  SELECT id INTO v_manager_id FROM auth.users ORDER BY created_at OFFSET 1 LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE NOTICE 'No users found. Create at least one user via Supabase Auth first.';
    RETURN;
  END IF;

  -- Default manager to owner if only one user exists
  IF v_manager_id IS NULL THEN
    v_manager_id := v_owner_id;
  END IF;

  -- Update first user to owner role
  UPDATE profiles SET role = 'owner', full_name = 'Alex Williams' WHERE id = v_owner_id;

  -- Update second user to manager role (if different)
  IF v_manager_id != v_owner_id THEN
    UPDATE profiles SET role = 'manager', full_name = 'Morgan Taylor' WHERE id = v_manager_id;
  END IF;

  -- Properties
  INSERT INTO properties (id, name, address, description, owner_id) VALUES
    (v_prop1_id, 'Lake Cabin', '123 Lakeview Drive, Lake Tahoe, CA 96150', 'Cozy 3-bed cabin with lake views and dock access.', v_owner_id),
    (v_prop2_id, 'City Loft', '456 Main Street, Apt 7B, San Francisco, CA 94105', 'Modern 1-bed loft in downtown SF, great for business travelers.', v_owner_id),
    (v_prop3_id, 'Mountain Retreat', '789 Pine Ridge Road, Big Bear Lake, CA 92315', 'Rustic 4-bed retreat with fireplace and ski access.', v_owner_id)
  ON CONFLICT DO NOTHING;

  -- Property statuses (auto-created by trigger, but let's update them)
  UPDATE property_status
  SET status = 'needs_cleaning', occupancy = 'unoccupied', updated_by = v_owner_id, notes = 'Just had guests check out'
  WHERE property_id = v_prop1_id;

  UPDATE property_status
  SET status = 'clean', occupancy = 'occupied', updated_by = v_manager_id
  WHERE property_id = v_prop2_id;

  UPDATE property_status
  SET status = 'needs_maintenance', occupancy = 'unoccupied', updated_by = v_manager_id, notes = 'Heater making noise'
  WHERE property_id = v_prop3_id;

  -- Stays
  INSERT INTO stays (id, property_id, guest_name, guest_email, start_date, end_date, notes, created_by) VALUES
    (v_stay1_id, v_prop2_id, 'Jordan Lee', 'jordan.lee@example.com',
     CURRENT_DATE - 2, CURRENT_DATE + 5,
     'Business traveler, late check-in requested', v_manager_id),
    (v_stay2_id, v_prop1_id, 'Sam Rivera', 'sam.rivera@example.com',
     CURRENT_DATE + 10, CURRENT_DATE + 17,
     'Family of 4, need extra towels', v_owner_id)
  ON CONFLICT DO NOTHING;

  -- Service Requests (Tickets)
  INSERT INTO service_requests (id, property_id, title, description, category, priority, status, assignee_id, due_date, created_by) VALUES
    (v_ticket1_id, v_prop1_id,
     'Deep clean after checkout', 'Full deep clean needed — kitchen, bathrooms, floors.',
     'cleaning', 'high', 'open', v_manager_id, CURRENT_DATE + 1, v_owner_id),
    (v_ticket2_id, v_prop3_id,
     'Heater noise — inspect and repair', 'Heater making loud rattling noise. Possible fan issue.',
     'maintenance', 'urgent', 'in_progress', v_manager_id, CURRENT_DATE + 2, v_owner_id),
    (v_ticket3_id, v_prop2_id,
     'Restock kitchen supplies', 'Coffee pods, dish soap, paper towels running low.',
     'supplies', 'low', 'open', NULL, CURRENT_DATE + 7, v_manager_id)
  ON CONFLICT DO NOTHING;

  -- Comments on ticket
  INSERT INTO service_request_comments (request_id, author_id, content) VALUES
    (v_ticket2_id, v_manager_id, 'Called HVAC company — they can come Thursday morning.'),
    (v_ticket2_id, v_owner_id, 'Confirmed. Please make sure you''re there to let them in.')
  ON CONFLICT DO NOTHING;

  -- Audit log entries
  INSERT INTO audit_log (entity_type, entity_id, action, changed_by, after_data) VALUES
    ('property', v_prop1_id, 'created', v_owner_id, jsonb_build_object('name', 'Lake Cabin')),
    ('property', v_prop2_id, 'created', v_owner_id, jsonb_build_object('name', 'City Loft')),
    ('property', v_prop3_id, 'created', v_owner_id, jsonb_build_object('name', 'Mountain Retreat')),
    ('stay', v_stay1_id, 'created', v_manager_id, jsonb_build_object('guest_name', 'Jordan Lee', 'property_id', v_prop2_id)),
    ('service_request', v_ticket2_id, 'updated', v_manager_id,
     jsonb_build_object('status', 'in_progress', 'note', 'HVAC company scheduled'))
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seed data inserted successfully.';
  RAISE NOTICE 'Owner ID: %', v_owner_id;
  RAISE NOTICE 'Manager ID: %', v_manager_id;
  RAISE NOTICE 'Prop 1 (Lake Cabin): %', v_prop1_id;
  RAISE NOTICE 'Prop 2 (City Loft): %', v_prop2_id;
  RAISE NOTICE 'Prop 3 (Mountain Retreat): %', v_prop3_id;
END $$;
