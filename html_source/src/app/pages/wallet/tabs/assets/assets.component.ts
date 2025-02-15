import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { VariablesService } from '@parts/services/variables.service';
import { Subject } from 'rxjs';
import { AssetBalance, ParamsRemoveCustomAssetId } from '@api/models/assets.model';
import { PaginatePipeArgs } from 'ngx-pagination';
import { takeUntil } from 'rxjs/operators';
import { CdkOverlayOrigin } from '@angular/cdk/overlay';
import { AssetDetailsComponent } from '@parts/modals/asset-details/asset-details.component';
import { Dialog, DialogConfig } from '@angular/cdk/dialog';
import { BackendService } from '@api/services/backend.service';
import { ConfirmModalComponent, ConfirmModalData } from '@parts/modals/confirm-modal/confirm-modal.component';
import { WalletsService } from '@parts/services/wallets.service';
import { BigNumber } from 'bignumber.js';
import { LOCKED_BALANCE_HELP_PAGE } from '@parts/data/constants';
import { IntToMoneyPipe } from '@parts/pipes';
import { TranslateService } from '@ngx-translate/core';
import { defaultImgSrc, zanoAssetInfo } from '@parts/data/assets';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';

@Component({
    selector: 'app-assets',
    template: `
        <div fxFlexFill fxLayout="column">
            <div class="scrolled-content" [class.mb-2]="isShowPagination" fxFlex="1 1 auto">
                <table class="zano-table assets-table">
                    <thead>
                        <tr>
                            <th>
                                <div class="bg title">
                                    {{ 'ASSETS.TABLE.LABELS.NAME' | translate }}
                                </div>
                            </th>
                            <th>
                                <div class="bg title">
                                    {{ 'ASSETS.TABLE.LABELS.BALANCE' | translate }}
                                </div>
                            </th>
                            <th>
                                <div class="bg title">
                                    {{ 'ASSETS.TABLE.LABELS.VALUE' | translate }}
                                </div>
                            </th>
                            <th>
                                <div class="bg title">
                                    {{ 'ASSETS.TABLE.LABELS.PRICE' | translate }}
                                </div>
                            </th>
                            <th>
                                <div class="bg title">&nbsp;</div>
                            </th>
                        </tr>
                        <div class="row-divider"></div>
                    </thead>
                    <tbody>
                        <ng-container *ngIf="variablesService.currentWallet.balances$ | async as assets">
                            <ng-container *ngFor="let asset of assets | paginate : paginatePipeArgs; trackBy: trackByAssets">
                                <tr
                                    [delay]="500"
                                    [placement]="'bottom'"
                                    [timeDelay]="1000"
                                    [tooltipClass]="'balance-tooltip'"
                                    [tooltip]="getBalanceTooltip(asset)"
                                >
                                    <td>
                                        <div class="text-ellipsis" fxLayout="row" fxLayoutAlign="start center" fxLayoutGap="2rem">
                                            <div class="token-logo mr-1">
                                                <img
                                                    [src]="
                                                        asset.asset_info.asset_id === zanoAssetInfo.asset_id
                                                            ? zanoAssetInfo.logo
                                                            : defaultImgSrc
                                                    "
                                                    [alt]="asset.asset_info.ticker"
                                                    defaultImgAlt="default"
                                                    [defaultImgSrc]="defaultImgSrc"
                                                    appDefaultImg
                                                />
                                            </div>
                                            <b class="text-ellipsis">{{ asset.asset_info.full_name }}</b>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="text-ellipsis">
                                            <b *appVisibilityBalance>
                                                {{ asset.total | intToMoney : asset.asset_info.decimal_point }}
                                                {{ asset.asset_info.ticker }}
                                            </b>
                                        </div>
                                    </td>
                                    <ng-container *ngIf="asset.asset_info.asset_id === zanoAssetInfo.asset_id; else templateNotLoadPrice">
                                        <td>
                                            <div class="text-ellipsis">
                                                <b *appVisibilityBalance>{{
                                                    (asset.total | intToMoney : asset.asset_info.decimal_point) *
                                                        variablesService.zanoMoneyEquivalent | currency : 'USD'
                                                }}</b>
                                            </div>
                                        </td>
                                        <td>
                                            <div class="text-ellipsis">
                                                <b class="mr-0_5">{{ variablesService.zanoMoneyEquivalent | currency : 'USD' }}</b>
                                                <span
                                                    [class.color-aqua]="variablesService.zanoMoneyEquivalentPercent > 0"
                                                    [class.color-red]="variablesService.zanoMoneyEquivalentPercent < 0"
                                                >
                                                    {{ variablesService.zanoMoneyEquivalentPercent | number : '1.2-2' }}
                                                    %
                                                </span>
                                            </div>
                                        </td>
                                    </ng-container>

                                    <ng-template #templateNotLoadPrice>
                                        <td></td>
                                        <td></td>
                                    </ng-template>
                                    <td>
                                        <div class="text-ellipsis" fxLayout="row" fxLayoutAlign="end center">
                                            <button
                                                #trigger="cdkOverlayOrigin"
                                                (click)="$event.stopPropagation(); toggleDropDownMenu(trigger, asset)"
                                                [disabled]="false"
                                                cdkOverlayOrigin
                                                class="btn-icon circle row-options small ml-auto"
                                                type="button"
                                            >
                                                <mat-icon class="small" svgIcon="zano-row-options"></mat-icon>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                <tr class="row-divider"></tr>
                            </ng-container>
                        </ng-container>
                    </tbody>
                </table>
            </div>

            <pagination-template
                *ngIf="isShowPagination"
                #p="paginationApi"
                [id]="paginationId"
                class="ngx-pagination custom-pagination"
                (pageChange)="currentPage = $event"
            >
                <button (click)="p.previous()" [disabled]="p.isFirstPage()" class="pagination-previous btn-icon circle small mr-0_5">
                    <mat-icon svgIcon="zano-arrow-left"></mat-icon>
                </button>

                <div *ngFor="let page of p.pages; trackBy: trackByPages" [class.current]="p.getCurrent() === page.value" class="mr-0_5">
                    <a (click)="p.setCurrent(page.value)" *ngIf="p.getCurrent() !== page.value">
                        <span>{{ page.label }}</span>
                    </a>
                    <div *ngIf="p.getCurrent() === page.value">
                        <span>{{ page.label }}</span>
                    </div>
                </div>

                <button (click)="p.next()" [disabled]="p.isLastPage()" class="pagination-next btn-icon circle small">
                    <mat-icon svgIcon="zano-arrow-right"></mat-icon>
                </button>
            </pagination-template>
        </div>

        <ng-template
            (backdropClick)="$event.stopPropagation(); isOpenDropDownMenu = false"
            [cdkConnectedOverlayBackdropClass]="'opacity-0'"
            [cdkConnectedOverlayHasBackdrop]="true"
            [cdkConnectedOverlayOrigin]="triggerOrigin"
            [cdkConnectedOverlayOpen]="isOpenDropDownMenu"
            [cdkConnectedOverlayPositions]="[
                {
                    originX: 'end',
                    originY: 'top',
                    overlayX: 'end',
                    overlayY: 'top',
                    offsetY: 30
                }
            ]"
            cdkConnectedOverlay
        >
            <ul (click)="isOpenDropDownMenu = false" class="list">
                <li class="item">
                    <button class="w-100 px-2 py-1" type="button" (click)="assetDetails()">
                        <mat-icon svgIcon="zano-info-v2" class="mr-1"></mat-icon>
                        <span>{{ 'ASSETS.DROP_DOWN_MENU.ASSET_DETAILS' | translate }}</span>
                    </button>
                </li>

                <ng-container
                    *ngIf="
                        variablesService.currentWallet.loaded &&
                        variablesService.daemon_state === 2 &&
                        !variablesService.currentWallet.is_auditable &&
                        !variablesService.currentWallet.is_watch_only
                    "
                >
                    <li class="item">
                        <button routerLink="/wallet/send" [state]="{ asset: currentAsset }" class="w-100 px-2 py-1">
                            <mat-icon svgIcon="zano-send" class="mr-1"></mat-icon>
                            <span>{{ 'Send' | translate }}</span>
                        </button>
                    </li>

                    <ng-container *ngIf="variablesService.is_hardfok_active$ | async">
                        <li class="item">
                            <button routerLink="/wallet/create-swap" [state]="{ asset: currentAsset }" class="w-100 px-2 py-1">
                                <mat-icon svgIcon="zano-swap" class="mr-1"></mat-icon>
                                <span>{{ 'Swap' | translate }}</span>
                            </button>
                        </li>
                    </ng-container>
                </ng-container>

                <ng-container *ngIf="currentAsset.asset_info.ticker !== 'ZANO'">
                    <li class="item">
                        <button class="w-100 px-2 py-1" type="button" (click)="beforeRemoveAsset()">
                            <mat-icon svgIcon="zano-delete" class="mr-1"></mat-icon>
                            <span>{{ 'ASSETS.DROP_DOWN_MENU.REMOVE_ASSET' | translate }}</span>
                        </button>
                    </li>
                </ng-container>
            </ul>
        </ng-template>
    `,
})
export class AssetsComponent implements OnInit, OnDestroy {
    currentPage = 1;

    itemsPerPage = 10;

    paginationId = 'pagination-assets-id';
    zanoAssetInfo = zanoAssetInfo;
    defaultImgSrc = defaultImgSrc;
    triggerOrigin!: CdkOverlayOrigin;
    currentAsset!: AssetBalance;
    isOpenDropDownMenu = false;
    private destroy$ = new Subject<void>();
    private readonly _matDialog: MatDialog = inject(MatDialog);

    constructor(
        public variablesService: VariablesService,
        private backendService: BackendService,
        private walletsService: WalletsService,
        private dialog: Dialog,
        private intToMoneyPipe: IntToMoneyPipe,
        private translate: TranslateService
    ) {}

    get paginatePipeArgs(): PaginatePipeArgs {
        return {
            id: this.paginationId,
            itemsPerPage: this.itemsPerPage,
            currentPage: this.currentPage,
        };
    }

    get isShowPagination(): boolean {
        const { currentWallet } = this.variablesService;
        if (currentWallet) {
            const { balances } = currentWallet;
            return (balances?.length || 0) > this.itemsPerPage;
        }
        return false;
    }

    ngOnInit(): void {
        this.listenChangeWallet();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    toggleDropDownMenu(trigger: CdkOverlayOrigin, asset: AssetBalance): void {
        this.isOpenDropDownMenu = !this.isOpenDropDownMenu;
        this.triggerOrigin = trigger;
        this.currentAsset = asset;
    }

    trackByAssets(index: number, { asset_info: { asset_id } }: AssetBalance): number | string {
        return asset_id || index;
    }

    trackByPages(index: number): number | string {
        return index;
    }

    assetDetails(): void {
        const config: MatDialogConfig = {
            data: {
                assetInfo: this.currentAsset.asset_info,
            },
        };
        this._matDialog.open(AssetDetailsComponent, config);
    }

    beforeRemoveAsset(): void {
        if (!this.currentAsset) {
            return;
        }
        const { full_name } = this.currentAsset.asset_info;
        const config: MatDialogConfig<ConfirmModalData> = {
            data: {
                title: `Do you want delete "${full_name}"`,
            },
        };

        this._matDialog
            .open<ConfirmModalComponent, ConfirmModalData, boolean>(ConfirmModalComponent, config)
            .afterClosed().pipe(takeUntil(this.destroy$))
            .subscribe({
                next: confirmed => confirmed && this.removeAsset(),
            });
    }

    removeAsset(): void {
        const { wallet_id, sendMoneyParams } = this.variablesService.currentWallet;
        const { asset_id } = this.currentAsset.asset_info;
        const params: ParamsRemoveCustomAssetId = {
            wallet_id,
            asset_id,
        };
        this.backendService.removeCustomAssetId(params, () => {
            this.walletsService.updateWalletInfo(wallet_id);
            this.currentAsset = undefined;

            if (sendMoneyParams) {
                this.walletsService.currentWallet.sendMoneyParams.asset_id = zanoAssetInfo.asset_id;
            }
        });
    }

    getBalanceTooltip(balance: AssetBalance): HTMLDivElement {
        const tooltip = document.createElement('div');
        const scrollWrapper = document.createElement('div');
        const visibilityBalance = this.variablesService.visibilityBalance$.value;

        if (!balance) {
            return null;
        }

        scrollWrapper.classList.add('balance-scroll-list');
        [balance].forEach(({ unlocked, total, asset_info: { ticker, decimal_point } }: AssetBalance) => {
            const available = document.createElement('span');
            available.setAttribute('class', 'available');
            available.innerText = `${this.translate.instant('WALLET.AVAILABLE_BALANCE')} `;
            const availableB = document.createElement('b');
            availableB.innerText = visibilityBalance
                ? `${this.intToMoneyPipe.transform(unlocked, decimal_point)} ${ticker || '---'}`
                : '******';
            available.appendChild(availableB);
            scrollWrapper.appendChild(available);

            const locked = document.createElement('span');
            locked.setAttribute('class', 'locked');
            locked.innerText = `${this.translate.instant('WALLET.LOCKED_BALANCE')} `;
            const lockedB = document.createElement('b');
            lockedB.innerText = visibilityBalance
                ? `${this.intToMoneyPipe.transform(new BigNumber(total).minus(unlocked), decimal_point)} ${ticker || '---'}`
                : '******';
            locked.appendChild(lockedB);
            scrollWrapper.appendChild(locked);
        });
        tooltip.appendChild(scrollWrapper);
        const link = document.createElement('span');
        link.setAttribute('class', 'link');
        link.innerHTML = this.translate.instant('WALLET.LOCKED_BALANCE_LINK');
        link.addEventListener('click', () => {
            this.backendService.openUrlInBrowser(LOCKED_BALANCE_HELP_PAGE);
        });
        tooltip.appendChild(link);
        return tooltip;
    }

    private listenChangeWallet(): void {
        this.variablesService.currentWalletChangedEvent.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.currentPage = 0;
            },
        });
    }
}
