export function isValidStudentId(studentId: string): boolean {
  return /^\d{8,12}$/.test(studentId.trim());
}

export function isValidPassword(password: string): boolean {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d\W_]{8,}$/.test(password);
}

export function isValidNickname(nickname: string): boolean {
  const length = nickname.trim().length;
  return length >= 2 && length <= 12;
}

export function isValidBio(bio: string): boolean {
  return bio.trim().length <= 100;
}

export function isValidContactValue(value: string): boolean {
  const length = value.trim().length;
  return length >= 2 && length <= 60;
}

export function maskStudentId(studentId: string): string {
  if (studentId.length < 5) return studentId;
  return `${studentId.slice(0, 3)}${'*'.repeat(Math.max(1, studentId.length - 5))}${studentId.slice(-2)}`;
}

export function isPhoneLike(value: string): boolean {
  return /1[3-9]\d{9}/.test(value);
}
