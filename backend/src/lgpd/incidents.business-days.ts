export class IncidentBusinessDayCalendar {
  static addBusinessDays(value: Date, days: number): Date {
    const current = new Date(value);
    if (days <= 0) return current;
    let added = 0;
    while (added < days) {
      current.setUTCDate(current.getUTCDate() + 1);
      const day = current.getUTCDay();
      if (day !== 0 && day !== 6) {
        added += 1;
      }
    }
    return current;
  }
}

export function addBusinessDays(value: Date, days: number): Date {
  return IncidentBusinessDayCalendar.addBusinessDays(value, days);
}
