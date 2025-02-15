import { Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';
import { Wallet } from '@api/models/wallet.model';
import { VariablesService } from '@parts/services/variables.service';
import { BigNumber } from 'bignumber.js';
import { LOCKED_BALANCE_HELP_PAGE } from '@parts/data/constants';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IntToMoneyPipe, IntToMoneyPipeModule } from '@parts/pipes';
import { BackendService } from '@api/services/backend.service';
import { CommonModule } from '@angular/common';
import { DisablePriceFetchModule, TooltipModule } from '@parts/directives';
import { StakingSwitchComponent } from '@parts/components/staking-switch.component';
import { VisibilityBalanceDirective } from '@parts/directives/visibility-balance.directive';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-wallet-card',
    template: `
        <div class="content">
            <div class="header">
                <div class="left">
                    <div class="name text-ellipsis">
                        <span *ngIf="wallet.new_contracts" class="indicator">
                            {{ wallet.new_contracts }}
                        </span>

                        <span
                            [delay]="500"
                            [showWhenNoOverflow]="false"
                            class="name"
                            placement="top-left"
                            tooltip="{{ wallet.name }}"
                            tooltipClass="table-tooltip account-tooltip"
                        >
                            {{ !wallet.alias['name'] ? wallet.name : wallet.alias['name'] }}
                        </span>
                    </div>
                </div>
                <div class="right">
                    <button
                        (click)="eventClose.emit(wallet.wallet_id)"
                        [delay]="500"
                        [timeDelay]="500"
                        placement="top"
                        tooltip="{{ 'WALLET.TOOLTIPS.REMOVE' | translate }}"
                        tooltipClass="table-tooltip account-tooltip"
                        type="button"
                        class="close"
                    >
                        <mat-icon svgIcon="zano-close"></mat-icon>
                    </button>
                </div>
            </div>

            <h4>
                <ng-container *appVisibilityBalance>
                    <span
                        *appDisablePriceFetch
                        [delay]="500"
                        [placement]="'bottom'"
                        [timeDelay]="1000"
                        [tooltipClass]="'balance-tooltip'"
                        [tooltip]="getBalancesTooltip()"
                        class="price"
                    >
                        {{
                            wallet.getMoneyEquivalentForZano(variablesService.zanoMoneyEquivalent) | intToMoney | currency : 'USD' || '---'
                        }}
                        <span [class.red]="variablesService.zanoMoneyEquivalentPercent < 0" class="percent">
                            {{ variablesService.zanoMoneyEquivalentPercent | number : '1.2-2' }}%
                        </span>
                    </span>
                </ng-container>
            </h4>

            <ng-container *ngIf="(!wallet.is_auditable && !wallet.is_watch_only) || (wallet.is_auditable && !wallet.is_watch_only)">
                <div *ngIf="!(!wallet.loaded && variablesService.daemon_state === 2)" class="staking">
                    <span class="text">{{ 'SIDEBAR.ACCOUNT.STAKING' | translate }}</span>
                    <app-staking-switch [(staking)]="wallet.staking" [wallet_id]="wallet.wallet_id"></app-staking-switch>
                </div>
            </ng-container>

            <div *ngIf="!wallet.loaded && variablesService.daemon_state === 2" class="account-synchronization">
                <div class="progress-bar">
                    <div [style.width]="wallet.progress + '%'" class="fill"></div>
                </div>
                <div class="progress-percent">{{ wallet.progress }}%</div>
            </div>
        </div>
    `,
    standalone: true,
    imports: [
        CommonModule,
        TooltipModule,
        TranslateModule,
        IntToMoneyPipeModule,
        StakingSwitchComponent,
        DisablePriceFetchModule,
        VisibilityBalanceDirective,
        MatIconModule,
    ],
})
export class WalletCardComponent {
    @HostBinding('class') classAttr = 'wallet';

    @Input() wallet: Wallet;

    @Output() eventClose = new EventEmitter<number>();

    constructor(
        public variablesService: VariablesService,
        private intToMoneyPipe: IntToMoneyPipe,
        private translate: TranslateService,
        private backend: BackendService
    ) {}

    getBalancesTooltip(): HTMLDivElement {
        const tooltip = document.createElement('div');
        const scrollWrapper = document.createElement('div');
        if (!this.wallet || !this.wallet.balances) {
            return null;
        }
        const { balances } = this.wallet;

        scrollWrapper.classList.add('balance-scroll-list');
        balances.forEach(({ unlocked, total, asset_info: { ticker } }) => {
            const available = document.createElement('span');
            available.setAttribute('class', 'available');
            available.innerText = `${this.translate.instant('WALLET.AVAILABLE_BALANCE')} `;
            const availableB = document.createElement('b');
            availableB.innerText = `${this.intToMoneyPipe.transform(unlocked)} ${ticker || '---'}`;
            available.appendChild(availableB);
            scrollWrapper.appendChild(available);

            const locked = document.createElement('span');
            locked.setAttribute('class', 'locked');
            locked.innerText = `${this.translate.instant('WALLET.LOCKED_BALANCE')} `;
            const lockedB = document.createElement('b');
            lockedB.innerText = `${this.intToMoneyPipe.transform(new BigNumber(total).minus(unlocked))} ${ticker || '---'}`;
            locked.appendChild(lockedB);
            scrollWrapper.appendChild(locked);
        });
        tooltip.appendChild(scrollWrapper);
        const link = document.createElement('span');
        link.setAttribute('class', 'link');
        link.innerHTML = this.translate.instant('WALLET.LOCKED_BALANCE_LINK');
        link.addEventListener('click', () => {
            this.backend.openUrlInBrowser(LOCKED_BALANCE_HELP_PAGE);
        });
        tooltip.appendChild(link);
        return tooltip;
    }
}
