import { Component, effect, signal, Signal, ViewChild } from '@angular/core';
import { Auth } from '../../core/services/auth/auth';
import { Table, TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { RoleRequest } from '../../core/models/role-request';
import { Role } from '../../core/services/role/role';
import { Breadcrumb } from 'primeng/breadcrumb';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-role',
  imports: [
    CommonModule,
    TableModule,
    ToastModule,
    Breadcrumb,
    FormsModule,
    ButtonModule,
    ToolbarModule,
    InputIconModule,
    InputTextModule,
    DialogModule,
    ConfirmDialog,
    IconFieldModule
  ],
  templateUrl: './role.html',
  styleUrl: './role.scss',
  providers: [ConfirmationService]
})
export class RoleComponent {
    ngOnInit(){ 
        if(this.auth.isAuthenticated){
            this.auth.refreshPermissions().subscribe({
                next: () => {                      
                    if(this.dt){
                        this.dt.reset();
                    }
                },
                error: (err) => {
                    this.toast('Ocurrió un error al obtener permisos', 'error');
                }
            });
        }
    }  

    @ViewChild('dt') dt!: Table;

    breadcrumbHome = { icon: 'pi pi-home', to: '/' };
    breadcrumbItems = [
        { label: 'Dashboard' },
        { label: 'Roles' }
    ];

    roles = signal<RoleRequest[]>([]);
    role! : RoleRequest;
    
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
      private auth:Auth,
      private service : Role,
      private messageService:MessageService,
      private confirmationService:ConfirmationService
    ){
           effect(() => {
            const user = this.auth.userSignal();
            if (!user?.menus) {
                this.canCreateSignal.set(false);
                this.canUpdateSignal.set(false);
                this.canDeleteSignal.set(false);
                return;
            }          
            const menu = findMenuByLink(user.menus, '/Rol');
            this.canCreateSignal.set(!!menu?.canCreate);
            this.canUpdateSignal.set(!!menu?.canUpdate);
            this.canDeleteSignal.set(!!menu?.canDelete);
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
    load(event: TableLazyLoadEvent) {

            this.loading = true;

            const page = (event.first ?? 0) / (event.rows ?? 10);
            const size = event.rows ?? 10;
            const sortFieldRaw = event.sortField ?? 'name';
            const sortField = Array.isArray(sortFieldRaw) ? sortFieldRaw[0] : sortFieldRaw;
            const sortOrder = event.sortOrder === 1 ? 'asc' : 'desc';
            const globalFilter = this.globalFilter;

            this.service
            .getAll(page, size, sortField, sortOrder, globalFilter)
            .subscribe({
                next: (res) => {
                this.roles.set(res.data.content);
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
            this.role = { name: '' };
            this.submitted = false;    
            this.backendErrors = {};
            this.dialogVisible = true;
        }
    
     
        edit(pm: RoleRequest) {
            this.dialogMode = 'edit'; 
            this.backendErrors = {};
            this.role = { ...pm };
            this.dialogVisible = true;
        }
    
        update() {      
            this.submitted = true;  
            this.service.update(this.role.id!, this.role).subscribe({
                next: (res) => {
                    this.dialogVisible = false;   
                    this.dt.reset();             
                    this.toast(res.message || 'Actualizado correctamente','success');
                   
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
            this.service.create(this.role).subscribe({
                next: (res) =>{  
                    this.dialogVisible=false;  
                    this.dt.reset();  
                    this.toast(res.message || 'Creado correctamente','success');   
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
    
        remove(pm: RoleRequest) {
            this.confirmationService.confirm({
                message: `¿Eliminar "${pm.name}"?`,
                accept: () => {
                    this.service.delete(pm.id!).subscribe({
                        next: (res) => {       
                            this.dt.reset();
                            this.toast(res.message || 'Eliminado correctamente', 'success');                 
                        },
                        error: (err) => {                                 
                            if (err.status === 403) {
                                this.toast('No tienes permisos para eliminar este rol', 'error');
                            }                     
                            else if (err.status === 404) {
                                this.toast('Registro no encontrado', 'warn');
                            }
                            else if (err.status === 409) {
                                this.toast(err.error?.message || 'No se puede eliminar el rol porque tiene registros relacionados', 'warn');
                            }
                            else {
                                this.toast(err.error?.message || 'Ocurrió un error al eliminar', 'error');
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
