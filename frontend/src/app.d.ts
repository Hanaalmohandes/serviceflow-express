declare global {
  namespace App {
    interface Error {}
    interface Locals {
      user: { userId: string; isHost: boolean; tenantId?: string; departmentId?: string; role?: string; language?: string } | null;
    }
    interface PageData {}
    interface Server {}
  }
}

export {};
