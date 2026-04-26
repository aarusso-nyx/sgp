import { AdminMenusService } from './admin-menus.service';

describe('AdminMenusService', () => {
  it('creates, updates, and deletes admin menus', () => {
    const service = new AdminMenusService();

    expect(service.listMenus()).toEqual({ items: [], total: 0 });
    const created = service.createMenu({
      codigo: 'rh',
      nome: 'RH',
      rota: '/rh',
    });
    expect(created).toMatchObject({
      codigo: 'rh',
      nome: 'RH',
      rota: '/rh',
      ativo: true,
    });
    expect(
      service.createMenu({ codigo: 'x', nome: 'X', rota: '/x', ativo: false }),
    ).toMatchObject({ ativo: false });
    expect(
      service.updateMenu(created.id, { nome: 'Recursos Humanos' }),
    ).toMatchObject({
      id: created.id,
      codigo: 'rh',
      nome: 'Recursos Humanos',
      rota: '/rh',
      ativo: true,
    });
    expect(service.updateMenu('missing-menu', {})).toMatchObject({
      id: 'missing-menu',
      codigo: 'menu-missing-',
      nome: 'Menu',
      rota: '/',
      ativo: true,
    });
    expect(
      service.updateMenu('other-menu', {
        codigo: 'other',
        nome: 'Other',
        rota: '/other',
        ativo: false,
      }),
    ).toMatchObject({
      id: 'other-menu',
      codigo: 'other',
      nome: 'Other',
      rota: '/other',
      ativo: false,
    });
    expect(service.deleteMenu(created.id)).toMatchObject({
      id: created.id,
      deleted: true,
    });
  });
});
