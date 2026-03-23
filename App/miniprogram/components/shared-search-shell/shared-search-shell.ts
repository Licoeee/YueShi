interface SharedSearchShellDetail {
  value?: unknown
}

function parseInputValue(detail: unknown): string {
  if (typeof detail === 'string') {
    return detail
  }

  if (typeof detail === 'object' && detail !== null && 'value' in detail) {
    const value = (detail as SharedSearchShellDetail).value
    return typeof value === 'string' ? value : ''
  }

  return ''
}

Component({
  options: {
    addGlobalClass: true,
    virtualHost: true,
  },

  externalClasses: ['shell-class', 'input-class', 'clear-class', 'clear-text-class'],

  properties: {
    value: {
      type: String,
      value: '',
    },
    placeholder: {
      type: String,
      value: '',
    },
    disabled: {
      type: Boolean,
      value: false,
    },
  },

  methods: {
    handleInputChange(event: WechatMiniprogram.CustomEvent<SharedSearchShellDetail>): void {
      const value = parseInputValue(event.detail)
      this.triggerEvent('change', { value })
    },

    handleClearTap(): void {
      if (this.data.disabled || this.data.value.length === 0) {
        return
      }

      this.triggerEvent('clear')
    },
  },
})
