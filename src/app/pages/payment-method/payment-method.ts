import { Component, effect, signal, ViewChild } from '@angular/core';
import { ConfirmationService, LazyLoadEvent, MessageService } from 'primeng/api';
import { Table, TableLazyLoadEvent, TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { RatingModule } from 'primeng/rating';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { PaymentMethodRequest } from '../../core/models/paymentmethod-request';
import { PaymentMethod } from '../../core/services/payment-method/payment-method';
import { Auth } from '../../core/services/auth/auth';

@Component({
  selector: 'app-payment-method',
  imports: [
     CommonModule,
        TableModule,
        FormsModule,
        ButtonModule,
        RippleModule,
        ToastModule,
        ToolbarModule,
        RatingModule,
        InputTextModule,
        TextareaModule,
        SelectModule,
        RadioButtonModule,
        InputNumberModule,
        DialogModule,
        TagModule,
        InputIconModule,
        IconFieldModule,
        ConfirmDialogModule,
        BreadcrumbModule
  ],
  templateUrl: './payment-method.html',
  styleUrl: './payment-method.scss',
  providers: [ PaymentMethod, ConfirmationService]
})


export class PaymentMethodComponent {
    
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

    breadcrumbHome = { icon: 'pi pi-home', to: '/' };
    breadcrumbItems = [
        { label: 'Dashboard' },
        { label: 'Métodos de Pago' }
    ];

    @ViewChild('dt') dt!: Table;

    paymentMethods = signal<PaymentMethodRequest[]>([]);
    paymentMethod!: PaymentMethodRequest;

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
        private service: PaymentMethod,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {
        effect(() => {
            const user = this.auth.userSignal();
            if (!user?.menus) {
                this.canCreateSignal.set(false);
                this.canUpdateSignal.set(false);
                this.canDeleteSignal.set(false);
                return;
            }          
            const menu = findMenuByLink(user.menus, '/MetodoPago');
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

    private  (
    routePath: string,
    permission: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete'
    ): boolean {
        const user = this.auth.userSignal();
        if (!user?.menus) return false;        
        const menu = findMenuByLink(user.menus, `/${routePath}`);
        return !!menu?.[permission];
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
            this.paymentMethods.set(res.data.content);
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
        this.paymentMethod = { name: '', status: true };
        this.submitted = false;    
         this.backendErrors = {};
        this.dialogVisible = true;
    }

 
    edit(pm: PaymentMethodRequest) {
        this.dialogMode = 'edit'; 
         this.backendErrors = {};
        this.paymentMethod = { ...pm };
        this.dialogVisible = true;
    }

    update() {      
    /*     if (!this.paymentMethod.name?.trim()) return; */
        this.submitted = true;  
        this.service.update(this.paymentMethod.id!,this.paymentMethod).subscribe({
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
        this.service.create(this.paymentMethod).subscribe({
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

    remove(pm: PaymentMethodRequest) {
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

   

