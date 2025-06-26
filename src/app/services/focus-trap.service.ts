import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FocusTrapService {
  private focusableElementsString = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), ion-button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable], [role="button"]:not([disabled])';
  private focusedElementBeforeModal: HTMLElement | null = null;

  constructor() { }

  trapFocus(element: HTMLElement): void {
    // Store the element that had focus before the modal opened
    this.focusedElementBeforeModal = document.activeElement as HTMLElement;

    const focusableElements = element.querySelectorAll(this.focusableElementsString);
    const focusableElementsArray = Array.prototype.slice.call(focusableElements);

    const firstTabStop = focusableElementsArray[0];
    const lastTabStop = focusableElementsArray[focusableElementsArray.length - 1];

    // Focus the first element
    if (firstTabStop) {
      setTimeout(() => firstTabStop.focus(), 100);
    }

    // Add keydown listener for tab key
    const handleKeydown = (e: KeyboardEvent) => {
      // Check for TAB key press
      if (e.key === 'Tab') {
        // SHIFT + TAB
        if (e.shiftKey) {
          if (document.activeElement === firstTabStop) {
            e.preventDefault();
            lastTabStop?.focus();
          }
        // TAB
        } else {
          if (document.activeElement === lastTabStop) {
            e.preventDefault();
            firstTabStop?.focus();
          }
        }
      }

      // Check for ESCAPE key press
      if (e.key === 'Escape') {
        e.preventDefault();
        // Trigger modal close event
        const closeEvent = new CustomEvent('modal-escape', { bubbles: true });
        element.dispatchEvent(closeEvent);
      }
    };

    element.addEventListener('keydown', handleKeydown);

    // Store the handler so we can remove it later
    (element as any).__focusTrapHandler = handleKeydown;
  }

  removeFocusTrap(element: HTMLElement): void {
    // Remove the keydown listener
    const handler = (element as any).__focusTrapHandler;
    if (handler) {
      element.removeEventListener('keydown', handler);
      delete (element as any).__focusTrapHandler;
    }

    // Restore focus to the element that had focus before the modal opened
    if (this.focusedElementBeforeModal && typeof this.focusedElementBeforeModal.focus === 'function') {
      setTimeout(() => {
        this.focusedElementBeforeModal?.focus();
        this.focusedElementBeforeModal = null;
      }, 100);
    }
  }

  // Disable background focus by setting tabindex="-1" on elements outside the modal
  disableBackgroundFocus(modalElement: HTMLElement): void {
    // Find the modal wrapper
    const modalWrapper = modalElement.closest('ion-modal') || modalElement;
    
    // Get all focusable elements in the document
    const allFocusableElements = document.querySelectorAll(this.focusableElementsString);
    
    allFocusableElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      
      // Check if element is inside the modal
      const isInModal = modalWrapper.contains(element);
      
      if (!isInModal) {
        // Store original tabindex and disable the element
        const originalTabIndex = htmlElement.getAttribute('tabindex');
        htmlElement.setAttribute('data-original-tabindex', originalTabIndex || '');
        htmlElement.setAttribute('tabindex', '-1');
        
        // Also make it non-interactive
        htmlElement.setAttribute('data-original-pointer-events', htmlElement.style.pointerEvents || '');
        htmlElement.style.pointerEvents = 'none';
        
        // Add inert attribute if supported
        if ('inert' in htmlElement) {
          htmlElement.setAttribute('data-was-inert', htmlElement.hasAttribute('inert') ? 'true' : 'false');
          (htmlElement as any).inert = true;
        }
      }
    });

    // Also disable focus on the router outlet specifically
    const routerOutlets = document.querySelectorAll('ion-router-outlet:not(.modal-wrapper)');
    routerOutlets.forEach((outlet) => {
      const htmlOutlet = outlet as HTMLElement;
      if (!modalWrapper.contains(htmlOutlet)) {
        htmlOutlet.setAttribute('data-focus-disabled', 'true');
        htmlOutlet.style.pointerEvents = 'none';
        if ('inert' in htmlOutlet) {
          (htmlOutlet as any).inert = true;
        }
      }
    });
  }

  // Restore background focus
  enableBackgroundFocus(): void {
    // Restore tabindex for all disabled elements
    const elementsWithDisabledFocus = document.querySelectorAll('[data-original-tabindex]');
    elementsWithDisabledFocus.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const originalTabIndex = htmlElement.getAttribute('data-original-tabindex');
      
      if (originalTabIndex === '' || originalTabIndex === null) {
        htmlElement.removeAttribute('tabindex');
      } else {
        htmlElement.setAttribute('tabindex', originalTabIndex);
      }
      
      htmlElement.removeAttribute('data-original-tabindex');
      
      // Restore pointer events
      const originalPointerEvents = htmlElement.getAttribute('data-original-pointer-events');
      if (originalPointerEvents !== null) {
        if (originalPointerEvents === '') {
          htmlElement.style.removeProperty('pointer-events');
        } else {
          htmlElement.style.pointerEvents = originalPointerEvents;
        }
        htmlElement.removeAttribute('data-original-pointer-events');
      }
      
      // Restore inert attribute
      if ('inert' in htmlElement) {
        const wasInert = htmlElement.getAttribute('data-was-inert');
        if (wasInert === 'false') {
          (htmlElement as any).inert = false;
        }
        htmlElement.removeAttribute('data-was-inert');
      }
    });

    // Restore router outlets
    const disabledRouterOutlets = document.querySelectorAll('[data-focus-disabled]');
    disabledRouterOutlets.forEach((outlet) => {
      const htmlOutlet = outlet as HTMLElement;
      htmlOutlet.removeAttribute('data-focus-disabled');
      htmlOutlet.style.removeProperty('pointer-events');
      if ('inert' in htmlOutlet) {
        (htmlOutlet as any).inert = false;
      }
    });
  }
} 