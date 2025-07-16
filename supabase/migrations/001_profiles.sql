create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  full_name text,
  role text check (role in ('nutritionist','trainer','client')),
  created_at timestamp with time zone default now()
);
