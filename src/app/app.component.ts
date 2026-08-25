import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Router } from '@angular/router';
import { PushNotificationService } from './services/push-notification.service';
import { SharedService } from './services/shared.service';

type AppBackButtonEvent = { canGoBack?: boolean };
type PluginListenerHandle = { remove: () => Promise<void> | void };
type CapacitorAppPlugin = {
  addListener: (
    eventName: 'backButton',
    listenerFunc: (event: AppBackButtonEvent) => void
  ) => Promise<PluginListenerHandle>;
  exitApp?: () => Promise<void>;
};

const CapacitorApp = registerPlugin<CapacitorAppPlugin>('App');

@Component({
    selector: 'app-root',
    template: '<router-outlet></router-outlet><app-reminder-notification></app-reminder-notification>',
    standalone: false
})
export class AppComponent implements OnInit, OnDestroy {
  private androidBackButtonHandle?: PluginListenerHandle;

  constructor(
    private push: PushNotificationService,
    private shared: SharedService,
    private ngZone: NgZone,
    private router: Router
  ) {}

  ngOnInit() {
    this.shared.initPwa();
    this.registerAndroidBackButton();

    // Check for notification permissions each time the app opens if not already granted
    if (Notification.permission !== 'granted') {
      // On iOS, never ask for notifications outside the installed PWA — the
      // permission registers against the Safari tab origin (not the PWA),
      // which prevents iOS from listing the install in Settings → Notifications.
      if (this.push.isIos() && !this.push.isStandalone()) return;

      // Delay slightly to ensure Snackbar and other services are fully initialized
      setTimeout(() => {
        this.push.requestPermissionWithReason(
          "Kept needs your permission to send you important reminders and notifications. Would you like to enable them now?"
        ).catch(console.error);
      }, 2000);
    }
  }

  ngOnDestroy() {
    this.androidBackButtonHandle?.remove();
  }

  private async registerAndroidBackButton() {
    if (Capacitor.getPlatform() !== 'android') return;

    try {
      this.androidBackButtonHandle = await CapacitorApp.addListener('backButton', event => {
        this.ngZone.run(() => this.handleAndroidBackButton(event));
      });
    } catch (error) {
      console.warn('Android back button listener unavailable', error);
    }
  }

  private handleAndroidBackButton(event: AppBackButtonEvent) {
    if (this.closeOpenTooltip()) return;

    if (this.shared.selectedNoteIds.value.length) {
      this.shared.clearNoteSelection();
      return;
    }

    if (this.isNoteModalOpen()) {
      this.shared.saveNote.next(true);
      return;
    }

    if (document.querySelector('app-input.mobile-active')) {
      this.shared.closeMobileComposer.next(true);
      return;
    }

    if (this.isSidebarOpen()) {
      this.shared.closeSideBarIfOpen.next(true);
      return;
    }

    if (this.router.url !== '/' || event.canGoBack) {
      window.history.back();
      return;
    }

    CapacitorApp.exitApp?.();
  }

  private closeOpenTooltip() {
    const tooltipEl = document.querySelector<HTMLDivElement>('[data-tooltip="true"][data-is-tooltip-open="true"]');
    if (!tooltipEl) return false;
    this.shared.closeTooltip(tooltipEl);
    return true;
  }

  private isNoteModalOpen() {
    const modal = document.querySelector<HTMLElement>('app-notes .modal-container');
    if (!modal) return false;
    return getComputedStyle(modal).display !== 'none';
  }

  private isSidebarOpen() {
    const sidebar = document.querySelector<HTMLElement>('[sideBar]');
    return !!sidebar && !sidebar.classList.contains('close') && !!document.querySelector('.sidebar-backdrop');
  }
}
