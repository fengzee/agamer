/**
 * 按钮状态管理类，处理按钮的加载状态和禁用状态
 */
export class ButtonStateManager {
  constructor(buttonId) {
    this.button = document.querySelector(`#${buttonId}`);
    this.container = this.button.parentElement;
  }

  setLoading(isLoading) {
    if (isLoading) {
      this.container.classList.add('loading');
      this.button.disabled = true;
    } else {
      this.container.classList.remove('loading');
      this.button.disabled = false;
    }
  }

  async wrapOperation(operation) {
    this.setLoading(true);
    try {
      await operation();
    } finally {
      this.setLoading(false);
    }
  }
} 