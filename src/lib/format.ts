const currencyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const priceFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const decimalFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const percentFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  style: "percent",
});

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const shortDateTimeFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatCurrency(value: number | null) {
  if (value === null) {
    return "Unlimited";
  }

  return currencyFormat.format(value);
}

export function formatPrice(value: number) {
  return priceFormat.format(value);
}

export function formatDecimal(value: number) {
  return decimalFormat.format(value);
}

export function formatPercent(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return percentFormat.format(value);
}

export function formatDateTime(date: Date) {
  return dateTimeFormat.format(date);
}

export function formatShortDateTime(date: Date) {
  return shortDateTimeFormat.format(date);
}

export function formatTitleCaseFromKebab(value: string) {
  return value
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
