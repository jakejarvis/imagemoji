# 🖼️ imagemoji

[![CI](https://github.com/jakejarvis/imagemoji/actions/workflows/ci.yml/badge.svg)](https://github.com/jakejarvis/imagemoji/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/imagemoji?logo=npm)](https://www.npmjs.com/package/imagemoji)
[![MIT License](https://img.shields.io/github/license/jakejarvis/imagemoji)](LICENSE)

Replaces emojis in strings or DOM nodes with corresponding images of your choosing. A barebones, mostly drop-in replacement for Twemoji's [`twemoji.parse()`](https://github.com/twitter/twemoji#twemojiparse---v1) (and heavily cherry-picked from Twitter's [original script](https://github.com/twitter/twemoji/blob/master/scripts/build.js) to cut some cruft and save a few bytes).

## Usage

### via [unpkg](https://unpkg.com/browse/imagemoji/)

```html
<html>
<head>
  <style>
    /* All inserted images have class="emoji" */
    img.emoji {
      width: 30px;
      height: 30px;
    }
  </style>
</head>
<body>
  <p>I 💩 emoji!</p>

  <script src="https://unpkg.com/imagemoji/dist/imagemoji.min.js"></script>
  <script>
    imagemoji.parse(document.body);
    //=> <p>I <img class="emoji" draggable="false" alt="💩" src="https://twemoji.maxcdn.com/v/latest/svg/1f4a9.svg"/> emoji!</p>

    imagemoji.parse(document.body, (icon) => `/assets/emoji/${icon}.png`);
    //=> <p>I <img class="emoji" draggable="false" alt="💩" src="/assets/emoji/1f4a9.png"/> emoji!</p>
  </script>
</body>
</html>
```

### via [NPM](https://www.npmjs.com/package/imagemoji)

`npm install imagemoji` or `yarn add imagemoji`

```js
import { parse as parseEmoji } from "imagemoji";
// or...
// const parseEmoji = require("imagemoji").parse;

parseEmoji(document.body);
parseEmoji(document.body, (icon) => `https://cdn.example.com/emoji/${icon}.svg`);
```

## API

### .parse(what, how?)

#### what

Type: `string` or `Node`

Either a plain string or a DOM node (e.g. `document.body`) containing emojis to replace with `<img>`s.

#### how

Type: `function`\
Default: `(icon) => "https://twemoji.maxcdn.com/v/latest/svg/" + icon + ".svg"`

A callback function to determine the image source URL of a given emoji codepoint (always lowercase, e.g. `1f4a9` for 💩, and variations are joined with dashes, e.g. `1f468-200d-1f4bb` for 👨‍💻). Defaults to pulling SVGs from the [Twemoji CDN](https://github.com/twitter/twemoji#cdn-support).

## License

MIT
