// Mechanical native-icon export from the approved artwork; no shape/color edits.
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

guard CommandLine.arguments.count == 3 else {
    fatalError("usage: swift export-macos-icon.swift source.png output.png")
}
let input = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])
guard let file = CGImageSourceCreateWithURL(input as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(file, 0, nil) else {
    fatalError("Cannot read approved icon artwork")
}
let width = image.width, height = image.height
let colorSpace = CGColorSpaceCreateDeviceRGB()
let bitmapInfo = CGImageAlphaInfo.premultipliedLast.rawValue
    | CGBitmapInfo.byteOrder32Big.rawValue
guard let source = CGContext(data: nil, width: width, height: height,
                             bitsPerComponent: 8, bytesPerRow: width * 4,
                             space: colorSpace, bitmapInfo: bitmapInfo),
      let pixels = source.data?.assumingMemoryBound(to: UInt8.self) else {
    fatalError("Cannot inspect icon alpha bounds")
}
source.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
var minX = width, minY = height, maxX = -1, maxY = -1
for y in 0..<height {
    for x in 0..<width where pixels[(y * width + x) * 4 + 3] >= 128 {
        minX = min(minX, x); minY = min(minY, y)
        maxX = max(maxX, x); maxY = max(maxY, y)
    }
}
guard maxX >= minX && maxY >= minY else { fatalError("Icon is empty") }

// Match the ~80.5% opaque tile extent measured in Finder/Chrome's native icons.
// Center the actual tile, not the generated master's slightly offset canvas.
let size = 1024
let scale = 824.0 / Double(max(maxX - minX + 1, maxY - minY + 1))
let centerX = Double(minX + maxX + 1) / 2
let centerY = Double(minY + maxY + 1) / 2
guard let canvas = CGContext(data: nil, width: size, height: size,
                             bitsPerComponent: 8, bytesPerRow: size * 4,
                             space: colorSpace, bitmapInfo: bitmapInfo) else {
    fatalError("Cannot create transparent native icon canvas")
}
canvas.interpolationQuality = .high
canvas.draw(image, in: CGRect(x: 512 - centerX * scale,
                              // Bitmap scan rows and image-space Y are inverted.
                              y: 512 - (Double(height) - centerY) * scale,
                              width: Double(width) * scale,
                              height: Double(height) * scale))
guard let rendered = canvas.makeImage(),
      let destination = CGImageDestinationCreateWithURL(
        output as CFURL, UTType.png.identifier as CFString, 1, nil
      ) else { fatalError("Cannot encode native icon") }
CGImageDestinationAddImage(destination, rendered, nil)
guard CGImageDestinationFinalize(destination) else { fatalError("Cannot save native icon") }
