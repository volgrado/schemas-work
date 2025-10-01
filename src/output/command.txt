import type { IconName } from '$lib/types/iconName';

export interface Command {
  id: string;
  label: string;
  icon: IconName;
  action: () => void | Promise<void>;
  isEnabled?: () => boolean; // Opcional, por defecto es true.
  subItems?: Command[]; // Para sub-menús como "Asistente IA"
}