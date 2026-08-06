export function deriveSalaryRates(params: {
  salaryType?: "daily" | "monthly";
  salaryAmount?: number;
  hourlyRate?: number;
  overtimeHourlyRate?: number;
  requiredHoursPerDay?: number;
}) {
  const salaryType = params.salaryType || "monthly";
  const requiredHours =
    params.requiredHoursPerDay && params.requiredHoursPerDay > 0
      ? params.requiredHoursPerDay
      : 8;

  let salaryAmount = params.salaryAmount;
  let hourlyRate = params.hourlyRate;

  if (salaryAmount !== undefined && salaryAmount > 0) {
    if (salaryType === "daily") {
      hourlyRate = salaryAmount / requiredHours;
    } else {
      hourlyRate = salaryAmount / (30 * requiredHours);
    }
  } else if (hourlyRate !== undefined && hourlyRate > 0) {
    if (salaryType === "daily") {
      salaryAmount = hourlyRate * requiredHours;
    } else {
      salaryAmount = hourlyRate * 30 * requiredHours;
    }
  } else {
    hourlyRate = 0;
    salaryAmount = 0;
  }

  const roundedHourlyRate = Math.round(hourlyRate * 100) / 100;
  const overtimeHourlyRate =
    params.overtimeHourlyRate !== undefined && params.overtimeHourlyRate > 0
      ? Math.round(params.overtimeHourlyRate * 100) / 100
      : roundedHourlyRate;

  return {
    salaryType,
    salaryAmount,
    hourlyRate: roundedHourlyRate,
    overtimeHourlyRate,
    requiredHoursPerDay: requiredHours,
  };
}
