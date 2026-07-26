export const ATTENDANCE_STATUSES = ["present", "absent", "half_day", "leave"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
