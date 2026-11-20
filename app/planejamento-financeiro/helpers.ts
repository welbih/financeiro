
export { getToday, validDate } from "../lib/dates";
import { validDate } from "../lib/dates";

export function closingDate(month: string, day: number) {
  const [year, number] = month.split("-").map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][number - 1];
  return `${month}-${String(Math.min(day, days)).padStart(2, "0")}`;
}

export function validStart(date: string, day: number) {
  if (!validDate(date) || !Number.isInteger(day) || day < 1 || day > 31) return false;
  const previous = new Date(`${date}T12:00:00Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  const value = previous.toISOString().slice(0, 10);
  return value === closingDate(value.slice(0, 7), day);
}

export function maskBalance(value: string) {
  value = value.replace(/−/g, "-");
  const digits = value.replace(/\D/g, "");
  if (!digits) return value.trim().startsWith("-") ? "-" : "";
  const cents = digits.replace(/^0+/, "").padStart(3, "0");
  return `${value.trim().startsWith("-") ? "-" : ""}${cents.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${cents.slice(-2)}`;
}
