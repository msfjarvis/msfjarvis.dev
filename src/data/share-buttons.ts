export interface ShareButtons {
  makeShareLink(title: string, url: string): string;
  title: string;
  icon: string;
}

export const shareButtons: ShareButtons[] = [
  {
    makeShareLink(title: string, url: string): string {
      return `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    },
    title: "Reddit",
    icon: "simple-icons:reddit",
  },
  {
    makeShareLink(title: string, url: string): string {
      const shareText = encodeURIComponent(`${title}\n\n${url}`);
      return `https://share.joinmastodon.org/#text=${shareText}`;
    },
    title: "Mastodon",
    icon: "simple-icons:mastodon",
  },
];
