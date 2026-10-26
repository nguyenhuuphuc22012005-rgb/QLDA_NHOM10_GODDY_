
/**
 * TASK-180: GODDY Recruit Toast Notifications
 * Usage: showToast('Lưu thành công!', 'success');
 */
(function () {
    'use strict';

    const ICONS = {
        success: '✓',
        error: '✕',
        warning: '!',
        info: 'i'
    };

    const TITLES = {
        success: 'Thành công',
        error: 'Có lỗi xảy ra',
        warning: 'Cảnh báo',
        info: 'Thông báo'
    };

    const MAX_TOASTS = 4;

    function getContainer() {
        let container = document.getElementById('goddy-toast-container');

        if (!container) {
            container = document.createElement('div');
            container.id = 'goddy-toast-container';
            container.className = 'goddy-toast-container';
            container.setAttribute('aria-label', 'Thông báo hệ thống');
            document.body.appendChild(container);
        }

        return container;
    }

    function showToast(message, type = 'info', duration = 4000) {
        const validType = Object.prototype.hasOwnProperty.call(ICONS, type)
            ? type
            : 'info';

        const container = getContainer();
        const toast = document.createElement('div');

        toast.className = `goddy-toast goddy-toast--${validType}`;
        toast.setAttribute(
            'role',
            validType === 'error' ? 'alert' : 'status'
        );

        const icon = document.createElement('span');
        icon.className = 'goddy-toast__icon';
        icon.textContent = ICONS[validType];
        icon.setAttribute('aria-hidden', 'true');

        const content = document.createElement('div');
        content.className = 'goddy-toast__content';

        const title = document.createElement('strong');
        title.className = 'goddy-toast__title';
        title.textContent = TITLES[validType];

        const description = document.createElement('div');
        description.className = 'goddy-toast__message';
        description.textContent = String(message ?? '');

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'goddy-toast__close';
        closeButton.textContent = '×';
        closeButton.setAttribute('aria-label', 'Đóng thông báo');

        let timeoutId = null;
        let closed = false;

        function dismiss() {
            if (closed) return;
            closed = true;

            if (timeoutId !== null) {
                clearTimeout(timeoutId);
            }

            toast.classList.add('goddy-toast--leaving');

            toast.addEventListener('animationend', function () {
                toast.remove();
            }, { once: true });

            // Fallback khi người dùng bật reduced motion.
            setTimeout(function () {
                toast.remove();
            }, 350);
        }

        closeButton.addEventListener('click', dismiss);

        content.append(title, description);
        toast.append(icon, content, closeButton);

        while (container.children.length >= MAX_TOASTS) {
            container.firstElementChild.remove();
        }

        container.appendChild(toast);

        const milliseconds = Number(duration);

        if (Number.isFinite(milliseconds) && milliseconds > 0) {
            timeoutId = setTimeout(dismiss, milliseconds);
        }

        return { close: dismiss, element: toast };
    }

    window.showToast = showToast;

    window.toastSuccess = function (message, duration) {
        return showToast(message, 'success', duration);
    };

    window.toastError = function (message, duration) {
        return showToast(message, 'error', duration);
    };

    window.toastWarning = function (message, duration) {
        return showToast(message, 'warning', duration);
    };

    window.toastInfo = function (message, duration) {
        return showToast(message, 'info', duration);
    };
})();
