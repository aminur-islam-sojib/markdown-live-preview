import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfirmDialog } from '../src/components/ConfirmDialog';

// Configure React act environment for Vitest/JSDOM
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('ConfirmDialog component', () => {
  let container: HTMLDivElement | null = null;
  let root: any = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('renders nothing when isOpen is false', () => {
    act(() => {
      root.render(
        <ConfirmDialog
          isOpen={false}
          title="Delete Note"
          message="Are you sure?"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );
    });

    expect(container?.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('renders title, message, and confirm/cancel buttons when isOpen is true', () => {
    act(() => {
      root.render(
        <ConfirmDialog
          isOpen={true}
          title="Delete Document"
          message="This action cannot be undone."
          confirmLabel="Delete Note"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );
    });

    const dialog = container?.querySelector('[role="alertdialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain('Delete Document');
    expect(dialog?.textContent).toContain('This action cannot be undone.');
    expect(dialog?.textContent).toContain('Delete Note');
    expect(dialog?.textContent).toContain('Cancel');
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    act(() => {
      root.render(
        <ConfirmDialog
          isOpen={true}
          title="Confirm Action"
          message="Proceed?"
          confirmLabel="Proceed"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
    });

    const buttons = container?.querySelectorAll('button');
    const confirmBtn = Array.from(buttons || []).find((b) => b.textContent?.includes('Proceed'));

    expect(confirmBtn).toBeDefined();
    act(() => {
      confirmBtn?.click();
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when cancel button or close X is clicked', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    act(() => {
      root.render(
        <ConfirmDialog
          isOpen={true}
          title="Delete Item"
          message="Are you sure?"
          cancelLabel="Nevermind"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
    });

    const cancelBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Nevermind')
    );

    expect(cancelBtn).toBeDefined();
    act(() => {
      cancelBtn?.click();
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('omits cancel button in isAlert mode', () => {
    act(() => {
      root.render(
        <ConfirmDialog
          isOpen={true}
          title="Important Notice"
          message="Please acknowledge."
          confirmLabel="OK"
          isAlert={true}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );
    });

    const dialog = container?.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('OK');
    expect(dialog?.textContent).not.toContain('Cancel');
  });

  it('triggers onCancel when Escape key is pressed', () => {
    const onCancel = vi.fn();

    act(() => {
      root.render(
        <ConfirmDialog
          isOpen={true}
          title="Dismissible Dialog"
          message="Press escape to close"
          onConfirm={() => {}}
          onCancel={onCancel}
        />
      );
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
