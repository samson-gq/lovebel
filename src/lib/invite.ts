// Invitations always open the public app, never a preview or an authenticated URL.
export const INVITE_URL = "https://lovebel.lovable.app/auth";

export const getInvite = () => ({
  title: "LoveBel",
  text: "Присоединяйся ко мне в LoveBel!",
  url: INVITE_URL,
});