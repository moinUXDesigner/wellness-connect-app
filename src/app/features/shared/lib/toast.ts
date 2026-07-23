import { toast } from 'sonner';

const ERROR_DURATION_MS = 8000;

export { toast };

export function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function notifySuccess(message: string) {
  toast.success(message);
}

export function notifyError(error: unknown, fallback: string) {
  toast.error(toErrorMessage(error, fallback), { duration: ERROR_DURATION_MS });
}

export function notifyWarning(message: string) {
  toast.warning(message);
}

export function notifyInfo(message: string) {
  toast.info(message);
}
