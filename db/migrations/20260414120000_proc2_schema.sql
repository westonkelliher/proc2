-- migrate:up
drop table if exists tasks;

create table lists (
    id serial primary key,
    name text not null unique,
    created_at timestamp not null default now()
);

insert into lists (name) values ('default');

create type task_stage as enum ('todo', 'in-progress', 'done', 'cancelled', 'tabled');
create type task_priority as enum ('none', 'lo', 'md', 'hi');

create table tasks (
    id serial primary key,
    list_id int not null references lists(id) on delete cascade,
    description text not null,
    stage task_stage not null default 'todo',
    priority task_priority not null default 'none',
    project text not null default '',
    notes text not null default '',
    position int not null default 0,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create index tasks_list_position_idx on tasks (list_id, position);

-- migrate:down
drop table if exists tasks;
drop type if exists task_priority;
drop type if exists task_stage;
drop table if exists lists;
