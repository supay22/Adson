export function generateRandomNumbers(count: number, max: number, min: number = 1): number[] {
  const numbers = new Set<number>();
  while (numbers.size < count) {
    const num = Math.floor(Math.random() * (max - min + 1)) + min;
    numbers.add(num);
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

export function generateSuperSete(): number[] {
  const numbers: number[] = [];
  for (let i = 0; i < 7; i++) {
    numbers.push(Math.floor(Math.random() * 10));
  }
  return numbers;
}
