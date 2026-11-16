export function balanceColor(total: number, receitas: number) {
  if (total < 0) return "negative-balance";
  const percentage = receitas > 0 ? total / receitas * 100 : total > 0 ? 100 : 0;
  if (percentage <= 10) return "low-balance";
  if (percentage <= 30) return "summary-balance";
  if (percentage <= 50) return "high-balance";
  return "very-high-balance";
}
