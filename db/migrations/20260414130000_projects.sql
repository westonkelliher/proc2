-- migrate:up
alter table tasks drop column project;

create table projects (
    id serial primary key,
    name text not null unique,
    description text not null default '',
    notes text not null default '',
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

-- migrate:down
drop table if exists projects;
alter table tasks add column project text not null default '';
