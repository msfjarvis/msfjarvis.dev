import { GIT_SERVER_URL, MASTODON_URL } from '../consts';

export interface ProfileLink {
  label: string;
  href: string;
  description: string;
  icon: string;
}

export const profileLinks: ProfileLink[] = [
  {
    label: 'mastodon',
    href: MASTODON_URL,
    description: 'follow along on the fediverse',
    icon: 'simple-icons:mastodon',
  },
  {
    label: 'git',
    href: GIT_SERVER_URL,
    description: 'self-hosted source and mirrors',
    icon: 'simple-icons:forgejo',
  },
];
