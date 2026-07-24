// Downscales an image file client-side before it's previewed/uploaded.
// A camera photo straight off a modern iPhone can decode to 50-200MB+ in
// memory, which is enough to get iOS WKWebView killed — this caps that.
export async function resizeImageFile(file, { maxDimension = 1600, quality = 0.8 } = {}) {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) return file

    const name = file.name.replace(/\.\w+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg' })
  } catch (err) {
    console.error('resizeImageFile failed, using original file', err)
    return file
  }
}
