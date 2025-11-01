<!--
  @component
  Logo

  This component renders the application's SVG logo. It is designed for reusability,
  allowing for easy control over its size and color from any parent component.

  Responsibilities:
  - Renders the vector graphic of the logo.
  - Accepts a `size` prop to dynamically control its width and height.
  - Uses `fill="currentColor"` in the SVG path, which allows its color to be easily
    manipulated via the parent's CSS `color` property.

  Props:
  - `size`: The width and height of the logo in pixels. Defaults to 24.

  Accessibility:
  - `aria-hidden="true"` and `focusable="false"` are set because the logo is a
    purely decorative element. Any interactive element wrapping the logo (like a link
    to the homepage) should provide its own accessible name.
-->
<script lang="ts">
  /**
   * @prop {number} [size=24]
   * The size (width and height) of the logo in pixels.
   */
  export let size: number = 24;
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 1024 1024"
  width={size}
  height={size}
  aria-hidden="true"
  focusable="false"
  class="app-logo"
>
  <path
    fill="currentColor"
    d="M364.5 699.5c-16 27.9-31.9 55.5-47.6 83.1-2.2 3.9-4.6 6.2-9.6 6.4-27 1.1-50.2-13-72.9-26.4-7.6-4.5-15.2-9-22.8-13.6-2.5-1.5-4.7-1.8-7.5-.6-25.6 11.6-54.9-4.2-59.9-31.4-5.3-28.6 15.9-50.7 40.1-51.5 26.2-.9 44.8 21.4 43.9 42.5-.1 2.3.3 4.3 2.5 5.6 17.3 9.9 33.8 21.4 52.3 29.3 51.7 22.1 108.2-11.3 118.2-63.6 5-26.1-5.8-51.1-30.2-66.8-18.7-12-39.5-20-59.3-29.9-17.5-8.9-35.8-16.4-52.4-26.9-24.1-15.3-37.7-37.7-41.7-65.7-5.2-37.3 7.7-68.2 36.9-91.2 52.6-41.5 138.4-17.3 153.3 55.4 1.5 7.3 1.8 14.6-3 21.1-5.1 6.8-13.1 9.6-21.2 7.4-8.3-2.2-14.4-9.1-14.9-18.6-.8-18.1-18.8-40.9-44.9-45.4-32.5-5.7-62.3 15.4-67.3 49.4-3.5 23.8 6.8 45.5 30 58.3 21 11.6 43.1 21 64.4 32 14.1 7.2 28.9 13 42.1 21.9 25.6 17.4 42.3 41.2 46.8 71.9 5.7 39.2-7 72.8-34.9 100.7-12 12.1-26 21.2-41.8 27.8-1.5.6-3.2.9-4.8 3.1 20.5 37.7 41.3 75.8 62.3 114.3 2.8-2.9 3.9-5.7 5.2-8.3 47.3-93.5 94.6-187 141.9-280.5 4.2-8.4 9.5-15.6 19-18.7 14.2-4.8 28.7 1.1 35.2 14.8 10.9 22.8 21.5 45.8 32.3 68.7 12.3 26.1 24.6 52.1 37 78.1.7 1.5 1.6 2.9 2.8 5 3.2-6.4 6.2-12.2 9.2-18.1 29.8-59.2 59.5-118.5 89.3-177.7 3-5.9 6.4-11.8 8.7-18-2.5-6.7-3.3-12.3-4.1-18.8-3-23.4 10.4-45.4 33.4-51.1 27.1-6.7 51.9 7.9 58.3 34.7 6.1 25.6-11.1 50.2-38 54.7-2.4.4-5.1 1.3-7.4.8-6.7-1.5-9.1 2.1-11.7 7.4-37.3 74.5-74.8 148.8-112.2 223.2-2.3 4.6-4.1 9.5-7.7 13.3-11.2 11.8-29.1 10.8-38.5-2.5-6-8.4-9.4-18.3-13.8-27.6-20.6-42.8-41-85.6-61.5-128.4-.7-1.3-1.1-2.8-2.5-3.6-2.1.5-2.4 2.6-3.2 4.1-42.3 83-84.5 165.9-126.8 248.9-7.1 13.9-14.1 27.9-21.6 41.7-4.7 8.8-10.9 16-22.3 15.9-9.1-.2-15.4-4.9-19.8-12.4-9.7-16.5-19.2-33.1-28.7-49.7-2.8-4.9-5.7-9.8-8.7-15.1z"
  />
</svg>

<style>
  /* By default, the logo will inherit its color from the parent. */
  .app-logo {
    color: inherit;
  }
</style>
