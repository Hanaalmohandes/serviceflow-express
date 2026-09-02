// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    interface Error {}
    interface Locals {
      user: { userId: string; isHost: boolean; tenantId?: string; role?: string } | null;
    }
    interface PageData {}
    interface Server {}
  }
}

export {};
