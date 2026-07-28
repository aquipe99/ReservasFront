import { Component, effect, signal, Signal, ViewChild } from '@angular/core';
import { Auth } from '../../core/services/auth/auth';
import { Table, TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { MenuRequest } from '../../core/models/menu-request';
import { ParentMenuResponse } from '../../core/models/parent-menu-response';
import { MenuApi } from '../../core/services/menu-api/menu-api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-menu-crud',
  imports: [
    CommonModule,
    TableModule,
    ToastModule,
    BreadcrumbModule,
    FormsModule,
    ButtonModule,
    ToolbarModule,
    InputIconModule,
    InputTextModule,
    DialogModule,
    ConfirmDialogModule,
    TagModule,
    IconFieldModule,
    RadioButtonModule,
    SelectModule
  ],
  templateUrl: './menu.html',
  styleUrl: './menu.scss',
  providers: [ConfirmationService]
})
export class MenuComponent {
    ngOnInit(){ 
        if(this.auth.isAuthenticated){
            this.auth.refreshPermissions().subscribe({
                next: () => {                      
                    if(this.dt){
                        this.dt.reset();
                    }
                    this.loadParentMenus();
                },
                error: (err) => {
                    this.toast('Ocurrió un error al obtener los permisos', 'error');
                }
            });
        }
    }  

    @ViewChild('dt') dt!: Table;

    breadcrumbHome = { icon: 'pi pi-home', to: '/' };
    breadcrumbItems = [
        { label: 'Dashboard' },
        { label: 'Menús' }
    ];

    menus = signal<MenuRequest[]>([]);
    parentMenus = signal<ParentMenuResponse[]>([]);
    menu! : MenuRequest;
    
    totalRecords = 0;
    loading = false;
    globalFilter = '';
    
    dialogVisible = false;
    submitted = false;

    dialogMode: 'create' | 'edit' = 'create';

    backendErrors: { [key: string]: string } = {};

    canCreateSignal = signal(false);
    canUpdateSignal = signal(false);
    canDeleteSignal = signal(false);

    constructor(
      private auth: Auth,
      private service: MenuApi,
      private messageService: MessageService,
      private confirmationService: ConfirmationService
    ){
           effect(() => {
            const user = this.auth.userSignal();
            if (!user?.menus) {
                this.canCreateSignal.set(false);
                this.canUpdateSignal.set(false);
                this.canDeleteSignal.set(false);
                return;
            }          
            const menuConfig = findMenuByLink(user.menus, '/Menu');
            this.canCreateSignal.set(!!menuConfig?.canCreate);
            this.canUpdateSignal.set(!!menuConfig?.canUpdate);
            this.canDeleteSignal.set(!!menuConfig?.canDelete);
        });
    }

    canCreate(): boolean {
        return this.canCreateSignal();
    }

    canUpdate(): boolean {
        return this.canUpdateSignal();
    }

    canDelete(): boolean {        
        return this.canDeleteSignal();  
    }

    loadParentMenus() {
        this.service.getParents().subscribe({
            next: (res) => {
                this.parentMenus.set(res.data);
            }
        });
    }

    getParentDescription(parentId: number | undefined | null): string {
        if (parentId === undefined || parentId === null) return '-';
        const found = this.parentMenus().find(m => m.id === parentId);
        return found ? found.description : `- (ID: ${parentId})`;
    }

    load(event: TableLazyLoadEvent) {
            this.loading = true;

            const page = (event.first ?? 0) / (event.rows ?? 10);
            const size = event.rows ?? 10;
            const sortFieldRaw = event.sortField ?? 'menuOrder';
            const sortField = Array.isArray(sortFieldRaw) ? sortFieldRaw[0] : sortFieldRaw;
            const sortOrder = event.sortOrder === 1 ? 'asc' : 'desc';
            const globalFilter = this.globalFilter;

            this.service
            .getAll(page, size, sortField, sortOrder, globalFilter)
            .subscribe({
                next: (res) => {
                    this.menus.set(res.data.content);
                    this.totalRecords = res.data.totalElements;
                    this.loading = false;
                },
                error: () => {
                    this.loading = false;
                }
            });
    }

    onSearch(event: Event) {
        this.globalFilter = (event.target as HTMLInputElement).value;
        this.dt.reset(); 
    }

    openNew() {
        this.dialogMode = 'create';
        this.menu = {
            description: '',
            link: '',
            icon: 'pi pi-list',
            menuOrder: 1,
            active: true,
            parentMenu: undefined,
            apiPath: ''
        };
        this.submitted = false;    
        this.backendErrors = {};
        this.dialogVisible = true;
    }

    edit(item: MenuRequest) {
        this.dialogMode = 'edit'; 
        this.backendErrors = {};
        this.menu = { ...item };
        this.dialogVisible = true;
    }

    update() {      
        this.submitted = true;  
        this.service.update(this.menu.id!, this.menu).subscribe({
            next: (res) => {
                this.dialogVisible = false;   
                this.dt.reset();             
                this.toast(res.message || 'Actualizado correctamente','success');
                this.loadParentMenus();
            },
            error: (err) =>{
                if(err.status === 400){                 
                    this.backendErrors = this.mapBackendErrors(err.error?.errors);

                    if (!err.error?.errors) {
                        this.toast(err.error?.message || 'Ocurrió un error', 'error');
                    }           
                }
                else if (err.status === 403) {
                    this.toast(err.error?.message || 'No autorizado', 'error');
                }
                else {
                    this.toast(err.error?.message || 'Ocurrió un error', 'error');
                }
            }
        });
    }

    save() {
        this.submitted = true;    
        this.service.create(this.menu).subscribe({
            next: (res) =>{  
                this.dialogVisible=false;  
                this.dt.reset();  
                this.toast(res.message || 'Creado correctamente','success');   
                this.loadParentMenus();
            },
            error: (err) => {
                if(err.status === 400 ){
                    this.backendErrors = this.mapBackendErrors(err.error?.errors);

                    if (!err.error?.errors) {
                        this.toast(err.error?.message || 'Ocurrió un error', 'error');
                    }
                }
                else if (err.status === 403) {
                    this.toast(err.error?.message || 'No autorizado', 'error');
                }
                else {
                    this.toast(err.error?.message || 'Ocurrió un error', 'error');
                }
            },
        });   
    }

    remove(item: MenuRequest) {
        this.confirmationService.confirm({
            message: `¿Eliminar "${item.description}"?`,
            accept: () => {
                this.service.delete(item.id!).subscribe({
                    next: (res) => {       
                        this.dt.reset();
                        this.toast(res.message || 'Eliminado correctamente', 'success');                 
                        this.loadParentMenus();
                    },
                    error: (err) => {                                 
                        if (err.status === 403) {
                            this.toast('No tienes permisos para eliminar este menú', 'error');
                        }                     
                        else if (err.status === 404) {
                            this.toast('Registro no encontrado', 'warn');
                        } 
                        else {
                            this.toast('Ocurrió un error al eliminar', 'error');
                        }
                    }
                });
            }
        });
    }

    toast(detail: string, severity: 'success' | 'error' | 'warn' = 'success') {
        this.messageService.add({
            severity,
            summary: severity === 'success' ? 'OK' : 'Error',
            detail,
            life: 3000
        });
    }
    
    private mapBackendErrors(errors: any[] | null): { [key: string]: string } {
        const result: { [key: string]: string } = {};

        if (!errors) {
            return result;
        }

        for (const error of errors) {
            result[error.field] = error.message;
        }

        return result;
    }
}

function findMenuByLink(menus: any[], link: string): any | null {
  for (const menu of menus) {
    if (menu.link?.toLowerCase() === link.toLowerCase()) {
      return menu;
    }

    if (menu.items?.length) {
      const found = findMenuByLink(menu.items, link);
      if (found) return found;
    }
  }
  return null;
}
