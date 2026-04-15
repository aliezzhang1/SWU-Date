export function formatMessageTime(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);

  if (date >= startOfToday) {
    return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(date);
  }

  if (date >= startOfYesterday) {
    return '昨天';
  }

  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(date);
}

export function formatTimeDivider(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function isMoreThanFiveMinutesApart(previous: string | undefined, current: string): boolean {
  if (!previous) return true;
  return new Date(current).getTime() - new Date(previous).getTime() > 5 * 60 * 1000;
}

export function toAvatarLabel(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, '');
  if (!trimmed) return 'SWU';
  return Array.from(trimmed).slice(0, 4).join('');
}
