# Testing on a real phone

The browser tests run a phone-sized layout, but they cannot tell you how it feels or runs on a real device.

## Set up

1. Phone and computer on the same Wi-Fi.
2. `npm run phone` builds the static site and prints addresses. Open the one that starts `192.168.` (or your Wi-Fi's range) on the phone.
   The `?diag` on the address puts frame rate, GPU, screen size and which Milky Way shader it started on in the corner.
3. If the phone cannot connect, allow Node through the Windows firewall for private networks, and check that the computer is
   not on a guest or "client isolation" network.
4. Alternatively, open the live site, https://joogiebear.github.io/space/?diag, from anywhere. Same build, no setup.

Browsers only give location, the camera and sensors to secure (`https`) pages, so on the local address "use my location" may be refused.
Type a place in the location box, or test location on the live site.

## What to check

- **Frame rate** in Local Universe, Solar System, Star Map and Sky Tonight. Under about 30 fps is worth reporting with the GPU line.
- **Milky Way** in Sky Tonight starts on the light shader on phones. Is it smooth? Does it look right?
- **Touch**: one finger orbits, two fingers pinch to zoom and rotate, a tap selects, a long press does nothing odd.
- **Hover tip**: touch has no hover, so a tap should show the name and open the info card instead.
- **Layout**: top tabs scroll, the active tab is visible, panels do not cover the controls, nothing runs under the notch or the browser bar,
  and turning the phone sideways still works.
- **Text** is readable without zooming; buttons are easy to hit.
- **Battery and heat** after five minutes in Sky Tonight.
- **Data**: the Events calendar and Sky Tonight satellites fill in on the live site.

Send what you find (the diag lines plus the page you were on) and I will fix it.
