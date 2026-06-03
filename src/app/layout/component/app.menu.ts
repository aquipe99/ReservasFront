import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { Menu } from '../../core/services/menu/menu';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
                <ng-container *ngFor="let item of model; let i = index">
                    <li app-menuitem 
                        *ngIf="!item.separator" 
                        [item]="item" 
                        [index]="i" 
                        [root]="true">
                    </li>

                    <li *ngIf="item.separator" class="menu-separator"></li>
                </ng-container>
               </ul> `
})
export class AppMenu {
    model: MenuItem[] = [];
    constructor(private menuService:Menu){}

    ngOnInit() {
        
    const backendMenu = this.menuService.getMenu();
    this.model = [
        {
            label: 'MENÚ',
               items: this.mapBackendToPrimeNg(backendMenu)
        
        }
        ];
    }

    private mapBackendToPrimeNg(nodes: any[]): MenuItem[] {
        return nodes.map(node => ({
            label: node.description,
            icon: node.icon?.startsWith('pi') ? node.icon : undefined,
            iconClass: node.icon,  
            routerLink: node.link ? [node.link] : undefined,
            items: node.items && node.items.length > 0
                ? this.mapBackendToPrimeNg(node.items)
                : undefined
        }));
    }

    
}

