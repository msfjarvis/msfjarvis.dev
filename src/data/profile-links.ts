export interface ProfileLink {
  label: string;
  href: string;
  description: string;
  icon: string;
}

export const profileLinks: ProfileLink[] = [
  {
    label: "mastodon",
    href: "https://fantastic.earth/@msfjarvis",
    description: "follow me on the fediverse",
    icon: "simple-icons:mastodon",
  },
  {
    label: "git",
    href: "https://git.msfjarvis.dev/msfjarvis",
    description: "all my code",
    icon: "simple-icons:forgejo",
  },
];
