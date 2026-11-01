export interface SwipeStats {
  /** Сколько анкет я лайкнул (like + superlike). */
  liked: number;
  /** Сколько из них ответили взаимным лайком. */
  responded: number;
  /** Лайки без ответа. */
  pending: number;
}

/**
 * Считает статистику откликов по моим исходящим лайкам и входящим лайкам
 * от тех же людей. Один человек считается один раз, даже если лайков было
 * несколько (например, повторный свайп после отмены).
 */
export function computeSwipeStats(
  myLikedIds: string[],
  incomingLikerIds: string[],
): SwipeStats {
  const likedSet = new Set(myLikedIds);
  const incomingSet = new Set(incomingLikerIds);
  let responded = 0;
  for (const id of likedSet) {
    if (incomingSet.has(id)) responded += 1;
  }
  const liked = likedSet.size;
  return { liked, responded, pending: liked - responded };
}
