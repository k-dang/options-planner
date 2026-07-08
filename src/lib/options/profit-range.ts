export type ProfitRange = "above" | "below" | "between";

export function profitRangeProbability(
  range: ProfitRange,
  breakevens: number[],
  probabilityBelow: (price: number) => number,
) {
  const boundaries = finiteBoundaries(breakevens);

  if (range === "above") {
    const boundary = boundaries[0];

    return boundary === undefined ? null : 1 - probabilityBelow(boundary);
  }

  if (range === "below") {
    const boundary = boundaries[0];

    return boundary === undefined ? null : probabilityBelow(boundary);
  }

  if (boundaries.length < 2) {
    return null;
  }

  const lower = boundaries[0];
  const upper = boundaries[boundaries.length - 1];

  return lower === undefined || upper === undefined
    ? null
    : probabilityBelow(upper) - probabilityBelow(lower);
}

export function signedDistanceToProfitRange(
  range: ProfitRange,
  price: number,
  breakevens: number[],
) {
  const boundaries = finiteBoundaries(breakevens);

  if (range === "above" || range === "below") {
    const boundary = nearestBoundary(price, boundaries);

    if (boundary === null) {
      return null;
    }

    return range === "above" ? price - boundary : boundary - price;
  }

  if (boundaries.length < 2) {
    return null;
  }

  const lower = boundaries[0];
  const upper = boundaries[boundaries.length - 1];

  if (lower === undefined || upper === undefined) {
    return null;
  }

  if (price < lower) {
    return price - lower;
  }

  if (price > upper) {
    return upper - price;
  }

  return Math.min(price - lower, upper - price);
}

function finiteBoundaries(breakevens: number[]) {
  return breakevens
    .filter((breakeven) => Number.isFinite(breakeven))
    .toSorted((left, right) => left - right);
}

function nearestBoundary(price: number, boundaries: number[]) {
  const first = boundaries[0];

  if (first === undefined) {
    return null;
  }

  let nearest = first;

  for (const boundary of boundaries.slice(1)) {
    if (Math.abs(price - boundary) < Math.abs(price - nearest)) {
      nearest = boundary;
    }
  }

  return nearest;
}
