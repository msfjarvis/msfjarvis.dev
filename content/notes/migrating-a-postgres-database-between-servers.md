+++
title = "Migrating a Postgres database between servers"
date = "2025-11-08T13:18:00+05:30"
lastmod = "2025-11-08T13:29:00+05:30"
summary = "A quick rundown of the process so future me can have an easier time"
tags = [ "postgresql", "sysadmin" ]
draft = false
+++
I'm having transitive network issues on one of my servers so I had to move out one of my services from the machine to a different one, which also involved transferring a Postgres database. The steps I followed for this are outlined below. I did this on two NixOS machines so your authentication setup and requirements may differ, please consult the documentation for the relevant commands to figure out what you need to do differently.

## On the server being migrated out of

```
# Switch to the Postgres user
sudo -i su - postgres
# Export just the roles so the imported database can have the right ownership
# I also edited this to only keep the role for the db I was moving
pg_dumpall --roles-only > roles.sql
# Export the actual database in Postres' binary format so its smaller
pg_dump -d atticd -Fc --create > atticd.dump
```

Once I had both files I used `rsync` to ship them over to the new server

## On the server being migrated to

```
sudo -i su - postgres
# Set up roles first
psql < roles.sql
# The `-d postgres` is required because pg_restore
# wants to connect to at least one existing database before
# doing anything, so we give it the one that exists by default
# at least on NixOS.
pg_restore -d postgres ./atticd.dump
```

And that's it! After this I just enabled the service on the new server and it picked up the existing database right away.
