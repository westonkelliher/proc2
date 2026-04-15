-- migrate:up
create table tasks (
    id serial primary key,
    title text not null,
    description text not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

-- migrate:down
drop table tasks;