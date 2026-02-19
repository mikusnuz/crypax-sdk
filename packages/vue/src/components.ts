import { defineComponent, h, type PropType } from 'vue'
import type { PaymentResult } from '@crypax/js'
import { useConfirmPayment } from './composables'

export const CheckoutButton = defineComponent({
  name: 'CheckoutButton',
  props: {
    clientSecret: { type: String, required: true },
    disabled: { type: Boolean, default: false },
  },
  emits: ['success', 'cancel', 'error'],
  setup(props, { emit, slots }) {
    const { confirmPayment, status } = useConfirmPayment()

    const handleClick = async () => {
      const result = await confirmPayment(props.clientSecret)
      if (result.status === 'confirmed') emit('success', result)
      else if (result.status === 'cancelled') emit('cancel')
      else if (result.status === 'failed') emit('error', result.error)
    }

    return () => {
      const isLoading = !['idle', 'confirmed', 'cancelled', 'failed', 'expired'].includes(status.value)

      return h(
        'button',
        {
          onClick: handleClick,
          disabled: props.disabled || isLoading,
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
            color: '#fff',
            fontSize: '15px',
            fontWeight: '600',
            cursor: isLoading || props.disabled ? 'not-allowed' : 'pointer',
            opacity: isLoading || props.disabled ? '0.6' : '1',
            transition: 'opacity 0.2s',
          },
        },
        slots.default?.() || [isLoading ? 'Processing...' : 'Pay'],
      )
    }
  },
})
