-- Creates a function that inserts a new row into public.profiles
create function public.handle_new_user()
    returns trigger
    language plpgsql
security definer set search_path = public
as $$
begin
insert into public.profiles (id, full_name, role)
values (new.id, new.raw_user_meta_data->>'full_name', null);
return new;
end;
$$;

-- Creates a trigger that calls the function when a new user is created
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();