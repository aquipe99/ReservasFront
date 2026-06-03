import { Component, effect, signal, Signal, ViewChild } from '@angular/core';
import { Auth } from '../../core/services/auth/auth';
import { Table,TableModule,TableLazyLoadEvent } from 'primeng/table';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { CourtRequest } from '../../core/models/court-request';
import { Court } from '../../core/services/court/court';
import { Breadcrumb } from 'primeng/breadcrumb';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CommonModule } from '@angular/common';
import { Textarea } from 'primeng/textarea';

@Component({
  selector: 'app-court',
  imports: [
    CommonModule
    ,TableModule
    ,ToastModule
    ,Breadcrumb
    ,FormsModule
    ,ButtonModule
    ,ToolbarModule
    ,InputIconModule
    ,InputTextModule
    ,DialogModule
    ,ConfirmDialog
    ,TagModule
    ,IconFieldModule
    ,RadioButtonModule
    ,Textarea

  ],
  templateUrl: './court.html',
  styleUrl: './court.scss',
  providers:[ConfirmationService]
})
export class CourtComponent {
    ngOnInit(){ 
        if(this.auth.token){
            this.auth.refreshPermissions().subscribe({
                next: () => {                      
                    if(this.dt){
                        this.dt.reset();
                    }
                },
                error: (err) => {
                    this.toast('Ocurrió un error al eliminar', 'error');
                }
            });
        }
    }  

    @ViewChild('dt') dt!: Table;

    breadcrumbHome = { icon: 'pi pi-home', to: '/' };
    breadcrumbItems = [
        { label: 'Dashboard' },
        { label: 'Canchas' }
    ];

    courts = signal<CourtRequest[]>([]);
    court! : CourtRequest;
    
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
      private service : Court,
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
            const menu = findMenuByLink(user.menus, '/Cancha');
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
            const sortFieldRaw = event.sortField ?? 'name'
            const sortField = Array.isArray(sortFieldRaw) ? sortFieldRaw[0] : sortFieldRaw;
            const sortOrder = event.sortOrder === 1 ? 'asc' : 'desc';
            const globalFilter = this.globalFilter;

            this.service
            .getAll(page, size, sortField, sortOrder, globalFilter)
            .subscribe({
                next: (res) => {
                this.courts.set(res.data.content);
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
            this.court = { name: '',description:'', status: true };
            this.submitted = false;    
             this.backendErrors = {};
            this.dialogVisible = true;
        }
    
     
        edit(pm: CourtRequest) {
            this.dialogMode = 'edit'; 
             this.backendErrors = {};
            this.court = { ...pm };
            this.dialogVisible = true;
        }
    
        update() {      
        /*     if (!this.paymentMethod.name?.trim()) return; */
            this.submitted = true;  
            this.service.update(this.court.id!,this.court).subscribe({
                next: (res) => {
                    this.dialogVisible = false;   
                    this.dt.reset();             
                    this.toast(res.mensaje || 'Actualizado correctamente','success');
                   
                },
                error: (err) =>{
                    if(err.status === 400){                 
                     this.backendErrors = err.error?.errores || {};             
                    }
                    else if (err.status === 403) {
                    this.toast('No tienes permisos para crear', 'error');
                    }
                    else {
                        this.toast('Ocurrió un error al crear', 'error');
                    }
                }
            });
        }
    
        save() {
            this.submitted = true;    
           /*  if (!this.paymentMethod.name?.trim()) return;   */
            this.service.create(this.court).subscribe({
                next: (res) =>{  
                    this.dialogVisible=false;  
                    this.dt.reset();  
                    this.toast(res.mensaje || 'Creado correctamente','success');   
                },
                error: (err) => {
                    if(err.status === 400 ){
                        this.backendErrors = err.error?.errores || {}; 
                    }
                    else if (err.status === 403) {
                    this.toast('No tienes permisos para crear', 'error');
                    }
                    else {
                        this.toast('Ocurrió un error al crear', 'error');
                    }
                },
            });   
        }
    
        remove(pm: CourtRequest) {
            this.confirmationService.confirm({
                message: `¿Eliminar "${pm.name}"?`,
                accept: () => {
                    this.service.delete(pm.id!).subscribe({
                        next: (res) => {       
                            this.dt.reset();
                            this.toast(res.mensaje || 'Eliminado correctamente', 'success');                 
                        },
                        error: (err) => {                                 
                            if (err.status === 403) {
                                this.toast('No tienes permisos para eliminar este método de pago', 'error');
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
    private  (
    routePath: string,
    permission: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete'
    ): boolean {
        const user = this.auth.userSignal();
        if (!user?.menus) return false;        
        const menu = findMenuByLink(user.menus, `/${routePath}`);
        return !!menu?.[permission];
    }

    toast(detail: string, severity: 'success' | 'error' | 'warn' = 'success') {
        this.messageService.add({
            severity,
            summary: severity === 'success' ? 'OK' : 'Error',
            detail,
            life: 3000
        });
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