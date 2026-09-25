/** Forward travel over a closed, normalized track. A repeated stop makes one lap. */
export function distanceToStation(position: number, target: number) {
  const distance = ((target - position) % 1 + 1) % 1;
  return distance < 0.00001 ? 1 : distance;
}

export function advanceRide(position: number, remaining: number, delta: number, playing: boolean, speed = 0.042) {
  if (!playing || delta <= 0 || remaining <= 0) return { position, remaining, arrived: remaining <= 0 };
  const step = Math.min(Math.max(delta, 0) * speed, remaining);
  return { position: (position + step) % 1, remaining: Math.max(0, remaining - step), arrived: step >= remaining };
}
