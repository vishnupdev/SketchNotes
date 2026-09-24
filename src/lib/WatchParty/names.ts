/**
 * A name to start with, so nobody meets a greyed-out button because a field
 * they never noticed is empty. It is only a starting point — the lobby shows it
 * in an ordinary text field — and two words is enough that two guests rarely
 * arrive as the same name.
 */

const ADJECTIVES = ["Happy", "Sunny", "Cosy", "Brave", "Chill", "Clever", "Lucky", "Merry", "Swift", "Witty", "Jolly", "Calm"];
const ANIMALS = ["Panda", "Otter", "Fox", "Koala", "Owl", "Tiger", "Penguin", "Dolphin", "Falcon", "Llama", "Robin", "Lynx"];

const pick = <T,>(list: readonly T[], roll: number): T => list[Math.floor(roll * list.length) % list.length];

export function friendlyName(random: () => number = Math.random): string {
  return `${pick(ADJECTIVES, random())} ${pick(ANIMALS, random())}`;
}
