import UIKit
import Capacitor

// Disables WKWebView's own elastic/rubber-band scroll bounce. The app
// handles its own internal scrolling (see Layout.jsx's overflow-y-auto
// main area) inside a fixed h-svh shell — the outer webview scrolling
// too caused the header/status-bar area to glitch when a fast drag hit
// the end of the content and the webview itself started bouncing.
class MainViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.scrollView.bounces = false
    }
}
