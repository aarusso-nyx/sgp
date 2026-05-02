import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export interface MenuItem {
  id: string;
  codigo: string;
  nome: string;
  rota: string;
  ativo: boolean;
}

@Injectable()
export class AdminMenusService {
  private readonly menus = new Map<string, MenuItem>();

  listMenus() {
    return {
      items: [...this.menus.values()],
      total: this.menus.size,
    };
  }

  createMenu(input: {
    codigo: string;
    nome: string;
    rota: string;
    ativo?: boolean;
  }) {
    const menu: MenuItem = {
      id: randomUUID(),
      codigo: input.codigo,
      nome: input.nome,
      rota: input.rota,
      ativo: input.ativo ?? true,
    };
    this.menus.set(menu.id, menu);
    return menu;
  }

  updateMenu(
    id: string,
    input: {
      codigo?: string;
      nome?: string;
      rota?: string;
      ativo?: boolean;
    },
  ) {
    const current = this.menus.get(id) ?? {
      id,
      codigo: input.codigo ?? `menu-${id.slice(0, 8)}`,
      nome: input.nome ?? 'Menu',
      rota: input.rota ?? '/',
      ativo: input.ativo ?? true,
    };

    const next: MenuItem = {
      ...current,
      ...input,
    };
    this.menus.set(id, next);
    return next;
  }

  deleteMenu(id: string) {
    this.menus.delete(id);
    return {
      id,
      deleted: true,
      deletedAt: new Date().toISOString(),
    };
  }
}
