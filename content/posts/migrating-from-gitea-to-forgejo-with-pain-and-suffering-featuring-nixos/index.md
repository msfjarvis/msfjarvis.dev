+++
title = "Migrating from Gitea to Forgejo the long way"
date = "2025-09-01T19:32:00+05:30"
lastmod = "2025-09-01T19:46:00+05:30"
summary = "With the renewed interest in Forgejo I decided to finally pull the plug on moving out of Gitea, and this is how it went."
categories = [ "nixos", "selfhosting" ]
tags = [ "gitea", "github", "forgejo", "github alternative", "forgejo migration" ]
draft = false
+++
I've had a Git server at [https://git.msfjarvis.dev](https://git.msfjarvis.dev/) for a while now, running [Gitea](https://about.gitea.com/) but my faith in the project's open core model has steadily been going down. When Codeberg announced they were forking Gitea as [Forgejo](https://forgejo.org) I quietly put down a line item to switch over in my overflowing TODO list and promptly forgot about it.

GitHub has been getting increasingly unpleasant for the past few years, but them officially announcing its demise as an independent entity and joining Microsoft's "CoreAI" division was the straw that broke the camel's back and made me want to use my own Git forge more actively. Thus the Forgejo migration shot up in my TODO list, and ended up being a rather involved process.

> This post is gonna have some rambling and going around in circles, but the TL;DR  is that I ended up having to migrate individual accounts instead of the whole instance data by using a tool that I ironically generated using GitHub Copilot (the code is available [on my Git server](https://git.msfjarvis.dev/msfjarvis/acceptable-vibes/src/branch/main/gitea-forgejo-migrator)).

# Attempt 1: The naive way

Forgejo initially used to support migrating data from Gitea pretty easily, but the increased friction of having to maintain a full fork against a moving target forced them to [drop support for these migration paths](https://forgejo.org/2024-12-gitea-compatibility/). I of course am stupid and was not aware that I had missed my window, so I had to make the unpleasant discovery that simply swapping the latest Gitea for latest Forgejo will not work anymore. The [NixOS manual's migration section](https://nixos.org/manual/nixos/stable/#module-forgejo-migration-gitea) suggested that this was possible, but it's actually missing crucial information about version requirements that was [added later](https://github.com/NixOS/nixpkgs/commit/91947bb68e8184eba4c14476a6a14873f15e9ed4).

My naive attempt _almost_ caused me to irreversibly corrupt my instance data, so I was more careful with future attempts and used a backup each time.

# Attempt 2: The `gitea dump` command

This looked like it had some potential until I realized the lack of a companion `gitea restore` functionality. The generated dump is a big ZIP file of your entire state directory, along with the SQL commands to recreate your database with whatever database engine you were using. The recommended way to use this dump is to unzip it and then replay the SQL commands into `sqlite` (my current database) to build up the state directory. This approach kind of felt like a dead-end already but I gave it a good try anyway.

I had also chosen to run Forgejo using PostgreSQL instead of SQLite, since I was already using it with a bunch of other software running on this machine and had proper backup strategies in place. This meant I had to reach out for [pgloader](https://pgloader.readthedocs.io/en/latest/) to import the SQLite-compatible dump into Postgres which worked out pretty well. Running `pgloader sqlite:///var/lib/gitea/data/gitea.db 'postgresql://forgejo:@/forgejo?host=/run/postgresql'` as root was able to successfully migrate the database to Postgres.

Unfortunately this didn't work due to the previously discussed version incompatibilities, and Forgejo rejected this database I had created for it. At this point I had lost a couple hours on this and constant electricity problems at my place had additionally caused my patience to run thin. I decided to cut my losses and re-deployed Forgejo with the same settings as my Gitea server, deciding that I would figure out a way to just copy my account data over since the instance configuration was managed by NixOS anyway (for the most part).

# Attempt 3: Vibe coding deployed somewhat effectively

> I'm not generally a big believer in the AI hype. I have yet to pay for any of these tools, between GitHub and my employer I get plenty of access to top of the line models that are supposedly reinventing my field of work every 3 months. LLMs have yet to meaningfully help me at work, and the only times I've gotten  real value out of them is by getting them to write one-off things like this that I am glad to have but would likely never invest the time to upskill into and build myself.

I hooked up the free license to GitHub Copilot that I get for [satisfying some criteria of "popular open source maintainer"](https://docs.github.com/en/copilot/get-started/plans) into [Zed](https://zed.dev) and wrote out a simple README file describing what I wanted out of the tool and had it go to town. The end result of this was an unnecessarily abstracted Go project (I doubt anybody would use that directory structure for a project this small) that looked like it would do the job.

Now onto actually running this tool. For this to work, it would require both my new Forgejo server and my old Gitea server to be up at the same time. First hurdle: conflicting ports. This was solved [pretty easily](https://git.msfjarvis.dev/msfjarvis/dotfiles/commit/9a8cdd36cdf3f0b93834c86112fd113634985587).

I screwed up here by running Forgejo on the primary domain and deploying the old Gitea server into a new Tailscale-based service. This caused multiple failures:

### Inability to log into the Gitea instance.

I could no longer sign into Gitea since I had 2FA enabled using Passkeys which require the domains to match up.

To make up for the inability to log into my Gitea server to create an access token, I just used the gitea CLI instead.

```
sudo -i su - gitea
# To get the actual path to the Gitea binary, which weirdly isn't installed for the gitea user?
systemctl cat gitea.service | grep ExecStart=
/nix/store/foo-bar-baz-gitea-1.23.1/bin/gitea admin -w $(pwd) user generate-access-token --token-name forgejo-migration --scopes "read:repository,read:user" --raw
```

On the forgejo side, a similar dance ensued but this time to actually create my account since this was a fresh start.

```
sudo -i su - forgejo
systemctl cat forgejo.service | grep ExecStart=
# yes the actual CLI seems to still be available as gitea
/nix/store/foo-bar-baz-forgejo-10.0.0/bin/gitea admin user create -w $(pwd) --username msfjarvis --email me@msfjarvis.dev --admin --access-token --access-token-name forgejo-migration --access-token-scopes "read:user,write:repository"
```

With access tokens in hand, I ran the tool and hit my second problem.

### Tailscale ACLs bite me in the ass

The way Tailscale's networking shebang works meant that the server running this isolated Gitea service couldn't connect to it via the network without some tweaks to my ACL policies. I was not feeling like I had this extra debugging in me, so I opted to just temporarily hijack another subdomain pointing to this server for the purpose and resumed from there.

### Mirrors of GitHub private repos did not work

Back when I first created mirrors of all my stuff I had also done so for my private repos and just forgot about it. When the tool tried to migrate them they obviously failed to mirror since I wasn't providing any access tokens for GitHub. I went back to Zed and had Claude add a retry for this and pull an access token from the `$GITHUB_TOKEN` environment variable.

When I ran the tool again it was able to successfully recreate all the repositories from my Gitea server.

# Conclusion

Overall this migration was worthwhile for me, both for documenting it for others in my position as well as for finally being free of Gitea. I trust the people in charge significantly more, and they continue to deliver [great work](https://forgejo.org/2025-07-release-v12-0/) driven in part by them actually using their own software at scale.
