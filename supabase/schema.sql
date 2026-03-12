-- Create the todos table
create table public.todos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  text text not null,
  description text,
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security (RLS)
alter table public.todos enable row level security;

-- Policies
create policy "Individuals can view their own todos."
  on todos for select
  using ( auth.uid() = user_id );

create policy "Individuals can create todos."
  on todos for insert
  with check ( auth.uid() = user_id );

create policy "Individuals can update their own todos."
  on todos for update
  using ( auth.uid() = user_id );

create policy "Individuals can delete their own todos."
  on todos for delete
  using ( auth.uid() = user_id );
