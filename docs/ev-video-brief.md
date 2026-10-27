# VoltRoute scroll-driven EV film

The landing page now uses the supplied `gemini_generated_video_9333099f.mp4` as a real scroll-controlled video, rather than the previous generated still. Login continues to use the transparent studio car image.

## Included assets

- `public/videos/ev-turntable-scroll.mp4`: 1184 × 440, approximately 5.83 seconds, silent H.264, approximately 2.1 MB. Every frame is a keyframe for responsive forward/backward seeking. The MP4 metadata is placed first for fast loading.
- `public/images/ev-turntable-poster.jpg`: a matching first-frame fallback for reduced motion, loading, or video errors.

The source was 1280 × 720 and approximately 10 seconds long. The web version uses the first moving portion (0.2–6.0 seconds), cropped to `1184:440:48:120`. This excludes the overhead studio light and the lower-right Gemini mark, while retaining the car through the turn. The original file in Downloads is unchanged; only the cropped, silent derivative is served by the website.

## Scrolling behavior

The hero stays pinned while the visitor scrolls through it. Its normalized scroll position maps directly to the video playhead. Scrolling down advances the film; scrolling up reverses it; stopping the scroll holds that frame. There is no autoplay or looping. A single outstanding seek is allowed, then the most recent target is applied when that seek completes. This avoids old seek requests accumulating during quick scrolls. Subtle perspective, scale, glass overlays, and edge feathering keep the film integrated into the existing green UI.

Reduced-motion visitors get the poster and a normal-height, unpinned hero. Video failure also falls back to the poster. The rest of the landing page remains reachable through the existing navigation and CTA buttons.

## Original generation brief (reference only)

For a genuine turntable, generate this video in Gemini/Veo using that image as the visual reference:

> Create an 8-second, 16:9, 1920×1080 premium automotive studio film. A single unbranded silver electric sports coupe with a panoramic black glass roof, clean aerodynamic body, elegant dark wheels, and pale mint reflections. Match the supplied reference car exactly throughout. Seamless matte dark forest-green studio background, hex #111C16, with a subtle reflective floor and soft mint rim lighting. Locked camera, low automotive-advertising viewpoint, entire car visible at all times, centered with at least 12% safe space on all sides. The car rotates smoothly through a 180-degree turntable motion from right to left. Hold the opening three-quarter view for 0.5 seconds, rotate slowly and continuously during seconds 0.5–6.5, ease gently to a complete stop, then hold the final view for 1.5 seconds. Keep the vehicle on one spot; no driving or wheel spinning. Cinematic, photorealistic materials, consistent geometry, beautiful controlled reflections. No cuts, camera movements, zooms, morphing, extra cars, people, scenery, text, logos, number plates, watermarks, or audio. Provide a clean cinematic background plate for a website; all interface elements will be added separately.

## Exact generated-image prompt

Use case: product-mockup. Asset type: premium automotive website hero and login visual, transparent background cutout. Create one extraordinary photorealistic unbranded electric grand touring sports coupe. Pearlescent silver with subtle pale mint highlights, dark panoramic glass roof, sculpted clean aerodynamic body, delicate full width white LED headlights, realistic elegant dark alloy wheels. Camera front left three-quarter view, nose points toward the viewer's left, entire car visible and well within frame, low viewpoint, wide 16:9 composition centered, car fills 85% width with generous breathing room around wheels and roof. Cinematic studio mint rim lighting, soft silver reflections, precision automotive advertisement photograph, true PBR materials, restrained luxury, realistic proportions, crisp body detail. Isolated vehicle only with transparent background and a subtle soft contact shadow under wheels. No floor rectangle, no scene, no scenery, no text, no letters, no logos, no watermark, no charging cable. The website background is dark forest green #111d17 and the car should be beautifully visible over that background, but do NOT include any background color in the image.
