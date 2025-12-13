/**
 * mengacak huruf dari sebuah kata menggunakan algoritma fisher-yates shuffle
 * @param word kata yang akan diacak hurufnya
 * @returns array huruf yang sudah diacak
 */

export function shuffleWord(word: string): string[] {
  const chars = [...word.toUpperCase()]; //memastikan selalu UPPERCASE
  let currentIndex = chars.length;
  let randomIndex: number;

  //mengacak menggunakan algoritma fisher-yates shuffle
  while (currentIndex !== 0) {
    //mengambil index acak dari elemen yang tersisa
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    //menukar elemen saat ini dengan elemen acak
    [chars[currentIndex], chars[randomIndex]] = [
      chars[randomIndex],
      chars[currentIndex],
    ];
  }

  return chars; // mengembalikan array huruf yang sudah diacak
}

/**
 * utilitas untuk mengacak array, bisa digunakan untuk mengacak urutan soal.
 */

export function shuffleArray<T>(array: T[]): T[] {
  for (let index = array.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[randomIndex]] = [array[randomIndex], array[index]];
  }

  return array;
}
