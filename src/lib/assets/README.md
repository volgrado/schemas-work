# Asset Management (`/src/lib/assets`)

This directory stores all the static assets used in the application, such as images, icons, and fonts.

## Philosophy

The goal is to keep the assets organized and optimized for use on the web.

1.  **Centralization**: All static assets reside here. This makes them easy to locate and manage.

2.  **Optimization**: Images and other assets should be optimized for the web before being added to the repository to ensure fast loading times. This may include image compression, selecting the appropriate format (e.g., WebP, SVG), and ensuring that the dimensions of the images are not larger than necessary.

## Directory Structure

- **/images**: Contains raster images such as PNG, JPG, WebP, etc.
- **/icons**: Contains icons, preferably in SVG format so that they are scalable and can be styled with CSS.
- **/fonts**: Contains custom font files if the application does not use a web font service such as Google Fonts.

## Usage in the Application

SvelteKit/Vite automatically manages the assets imported from this directory.

- **In Svelte components**: They can be imported directly into the script and used in the markup.

  ```svelte
  <script>
    import logo from '$lib/assets/icons/logo.svg';
  </script>

  <img src={logo} alt="Application logo" />
  ```

- **In CSS files**: They can be referenced using a relative path.

  ```css
  .background-image {
    background-image: url('$lib/assets/images/background.webp');
  }
  ```

Vite will process these references, hashing the file names for efficient caching in production and ensuring that the paths are correct.
