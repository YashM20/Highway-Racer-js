/**
 * Simple notification system for displaying achievements and game events
 */
export class NotificationSystem {
    constructor() {
        this.container = document.getElementById('notifications');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notifications';
            this.container.className = 'fixed bottom-4 right-4 z-50';
            document.body.appendChild(this.container);
        }
        
        this.notifications = [];
        this.maxNotifications = 3;
    }
    
    /**
     * Show a notification message
     * @param {string} message - Notification text
     * @param {string} type - Notification type (info, success, warning, error)
     * @param {number} duration - Duration in milliseconds
     */
    show(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type} mb-2 transform translate-x-full opacity-0 transition-all duration-300 ease-out`;
        
        // Set styles based on type
        switch (type) {
            case 'success':
                notification.classList.add('bg-green-500');
                break;
            case 'warning':
                notification.classList.add('bg-yellow-500');
                break;
            case 'error':
                notification.classList.add('bg-red-500');
                break;
            default: // info
                notification.classList.add('bg-blue-500');
                break;
        }
        
        // Add common styles
        notification.classList.add(
            'rounded-lg', 'p-3', 'text-white', 'shadow-lg', 'flex', 
            'items-center', 'justify-between', 'max-w-xs'
        );
        
        // Set content
        notification.innerHTML = `
            <div class="flex items-center">
                <span class="mr-2">${this.getIcon(type)}</span>
                <span>${message}</span>
            </div>
            <button class="ml-2 p-1 hover:bg-white hover:bg-opacity-20 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        `;
        
        // Add to container
        this.container.appendChild(notification);
        this.notifications.push(notification);
        
        // Limit number of notifications
        if (this.notifications.length > this.maxNotifications) {
            this.dismissNotification(this.notifications[0]);
        }
        
        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full', 'opacity-0');
        }, 10);
        
        // Close button event
        const closeButton = notification.querySelector('button');
        closeButton.addEventListener('click', () => {
            this.dismissNotification(notification);
        });
        
        // Auto-dismiss
        if (duration > 0) {
            setTimeout(() => {
                this.dismissNotification(notification);
            }, duration);
        }
        
        return notification;
    }
    
    /**
     * Dismiss a notification
     * @param {HTMLElement} notification - The notification element
     */
    dismissNotification(notification) {
        if (!notification) return;
        
        // Animate out
        notification.classList.add('translate-x-full', 'opacity-0');
        
        // Remove after animation
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications = this.notifications.filter(n => n !== notification);
        }, 300);
    }
    
    /**
     * Clear all notifications
     */
    clearAll() {
        [...this.notifications].forEach(notification => {
            this.dismissNotification(notification);
        });
    }
    
    /**
     * Get icon SVG based on notification type
     * @param {string} type - Notification type
     * @returns {string} SVG icon markup
     */
    getIcon(type) {
        switch (type) {
            case 'success':
                return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>`;
            case 'warning':
                return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>`;
            case 'error':
                return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>`;
            default: // info
                return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>`;
        }
    }
    
    /**
     * Show a success notification
     * @param {string} message - Notification text
     * @param {number} duration - Duration in milliseconds
     */
    success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }
    
    /**
     * Show a warning notification
     * @param {string} message - Notification text
     * @param {number} duration - Duration in milliseconds
     */
    warning(message, duration = 3000) {
        return this.show(message, 'warning', duration);
    }
    
    /**
     * Show an error notification
     * @param {string} message - Notification text
     * @param {number} duration - Duration in milliseconds
     */
    error(message, duration = 3000) {
        return this.show(message, 'error', duration);
    }
    
    /**
     * Show an info notification
     * @param {string} message - Notification text
     * @param {number} duration - Duration in milliseconds
     */
    info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    }
} 