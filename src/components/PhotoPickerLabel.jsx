import { Capacitor } from '@capacitor/core'
import { pickImageWithCamera } from '../utils/pickImage'

// Drop-in replacement for a <label><input type="file"></label> photo
// picker. On native platforms it invokes the native camera/photo-library
// picker directly (see pickImage.js) instead of letting WKWebView's own
// file input handle it, since that's what crashed the app on iPad App
// Review. On web, falls through to the wrapped <input type="file"> exactly
// as before.
export default function PhotoPickerLabel({ onPick, disabled, className, children, maxDimension = 1600 }) {
  async function handleClick(event) {
    if (!Capacitor.isNativePlatform() || disabled) return
    event.preventDefault()
    const file = await pickImageWithCamera({ maxDimension })
    if (file) onPick(file)
  }

  function handleInputChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) onPick(file)
  }

  return (
    <label onClick={handleClick} className={className}>
      {children}
      <input type="file" accept="image/*" onChange={handleInputChange} disabled={disabled} className="hidden" />
    </label>
  )
}
