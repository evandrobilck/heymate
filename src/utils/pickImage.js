import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

// Native platforms only. Asks the OS for an already-downscaled photo via
// the native picker's own quality/size options, instead of handing
// WKWebView a full-resolution capture straight off the camera through a
// plain <input type="file"> — that hand-off is what crashed the app on
// iPad review (a raw camera photo can decode to 50-200MB+ in memory,
// enough to get the app killed before resizeImageFile, which only runs
// once the file has already reached JS, ever gets a chance to run).
// Returns null if the user cancels the picker.
export async function pickImageWithCamera({ maxDimension = 1600, quality = 80 } = {}) {
  let photo
  try {
    photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt,
      quality,
      width: maxDimension,
      height: maxDimension,
      correctOrientation: true,
    })
  } catch (err) {
    if (err?.message?.toLowerCase().includes('cancel')) return null
    throw err
  }

  const response = await fetch(photo.webPath)
  const blob = await response.blob()
  const extension = photo.format ?? 'jpeg'
  return new File([blob], `photo.${extension}`, { type: blob.type || `image/${extension}` })
}
