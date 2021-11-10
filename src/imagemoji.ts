// NOTE: A lot of this logic was cherry-picked from Twitter's original script:
//   https://github.com/twitter/twemoji/blob/master/scripts/build.js
// As such...
/*! Copyright Twitter Inc. and other contributors. Licensed under MIT */

// RegExp based on emoji's official Unicode standards
// http://www.unicode.org/Public/UNIDATA/EmojiSources.txt
import regex from "twemoji-parser/dist/lib/regex";

// avoid using a string literal like '\u200D' here because minifiers expand it inline
const zeroWidthJoiner = String.fromCharCode(0x200d);

// nodes with type 1 which should **not** be parsed
const skipTags = /^(?:style|script|noscript|iframe|noframes|select|textarea)$/;

/**
 * Shortcut to create text nodes.
 *
 * @param   text   text used to create DOM text node
 * @param   clean  strip any variation selectors found
 * @return  a DOM node with the given text
 */
const createText = function (text: string, clean: boolean): Text {
  return document.createTextNode(clean ? text.replace(/\ufe0f/g, "") : text);
};

/**
 * Given UTF16 surrogate pairs, returns the equivalent HEX codepoint.
 *
 * @param   unicodeSurrogates  generic utf16 surrogates pair, i.e. `\uD83D\uDCA9`
 * @param   separator          optional separator for double code points, default: `-`
 * @return  UTF16 transformed into codepoint string, i.e. `1F4A9`
 */
const toCodePoint = function (unicodeSurrogates: string, separator = "-"): string {
  // remove possible variants (if there is a zero-width-joiner (U+200D), leave them in)
  if (unicodeSurrogates.indexOf(zeroWidthJoiner) < 0) {
    unicodeSurrogates = unicodeSurrogates.replace(/\ufe0f/g, "");
  }

  const points: string[] = [];
  let char = 0;
  let previous = 0;
  let i = 0;

  while (i < unicodeSurrogates.length) {
    char = unicodeSurrogates.charCodeAt(i++);

    if (previous) {
      points.push((0x10000 + (previous - 0xd800 << 10) + (char - 0xdc00)).toString(16));
      previous = 0;
    } else if (char > 0xd800 && char <= 0xdbff) {
      previous = char;
    } else {
      points.push(char.toString(16));
    }
  }

  return points.join(separator);
};

/**
 * Given a generic DOM nodeType 1, walk through all children and store every
 * nodeType 3 (#text) found in the tree.
 *
 * @param   node     a DOM Element with probably some text in it
 * @param   allText  the list of previously discovered text nodes
 * @return  same list with new discovered nodes, if any
 */
const getAllTextNodes = function (node: Node, allText: Node[] = []): Node[] {
  const { childNodes } = node;
  let { length } = childNodes;

  while (length--) {
    const subnode = childNodes[length];
    const { nodeType } = subnode;

    // parse emoji only in text nodes
    if (nodeType === 3) {
      // collect them to process emoji later
      allText.push(subnode);
    } else if (
      nodeType === 1 &&
      !("ownerSVGElement" in subnode) &&
      !skipTags.test(subnode.nodeName.toLowerCase())
    ) {
      // ignore all nodes that are not type 1, that are svg, or that
      // should not be parsed as script, style, and others
      getAllTextNodes(subnode, allText);
    }
  }

  return allText;
};

/**
 * DOM version of the same logic / parser: emojify all found sub-text nodes by
 * placing image nodes instead.
 *
 * @param   node          generic DOM node with some text in some child node
 * @param   srcGenerator  the callback to invoke per each found emoji to get the image source
 * @return  same generic node with emoji in place, if any.
 */
const parseNode = function (node: Node, srcGenerator: (icon: string) => string): Node {
  const allText = getAllTextNodes(node, []);
  let { length } = allText;

  while (length--) {
    let modified = false;
    const fragment = document.createDocumentFragment();
    const subnode = allText[length];
    const text = subnode.nodeValue || "";
    let match: RegExpExecArray | null;
    let i = 0;

    while ((match = regex.exec(text))) {
      const { index } = match;

      if (index !== i) {
        fragment.appendChild(createText(text.slice(i, index), true));
      }

      const rawEmoji = match[0]; // eslint-disable-line prefer-destructuring
      const icon = toCodePoint(rawEmoji);
      const src = srcGenerator(icon);
      i = index + rawEmoji.length;

      if (icon && src) {
        const img = new Image();
        img.setAttribute("draggable", "false");
        img.className = "emoji";
        img.alt = rawEmoji;
        img.src = src;
        img.onerror = function () {
          // remove missing images to preserve the original text intent when
          // a fallback for network problems is desired
          if (this.parentNode) {
            this.parentNode.replaceChild(createText(this.alt, false), this);
          }
        };

        modified = true;

        fragment.appendChild(img);
      } else {
        fragment.appendChild(createText(rawEmoji, false));
      }
    }

    // is there actually anything to replace in here?
    if (modified) {
      // any text left to be added?
      if (i < text.length) {
        fragment.appendChild(createText(text.slice(i), true));
      }

      // replace the text node only, leave intact anything else surrounding such text
      subnode.parentNode?.replaceChild(fragment, subnode);
    }
  }

  return node;
};

/**
 * String/HTML version of the same logic / parser: emojify a generic text placing images tags
 * instead of surrogates pair.
 *
 * @param   str           generic string with possibly some emoji in it
 * @param   srcGenerator  the callback to invoke per each found emoji to get the image source
 * @return  the string with `<img>` tags replacing all found and parsed emoji
 */
const parseString = function (str: string, srcGenerator: (icon: string) => string): string {
  return str.replace(regex, function (rawEmoji: string): string {
    const icon = toCodePoint(rawEmoji);
    const src = srcGenerator(icon);

    // recycle the match string replacing the emoji with its image counterpart
    return (icon && src) ? `<img class="emoji" draggable="false" alt="${rawEmoji}" src="${src}"/>` : rawEmoji;
  });
};

/**
 * Default callback used to generate emoji image source based on Twitter CDN.
 *
 * @param   icon  the emoji codepoint string
 * @return  the corresponding image URL to use
 */
const getTwemojiSvg = function (icon: string): string {
  return `https://twemoji.maxcdn.com/v/latest/svg/${icon}.svg`;
};

/**
 * "Emojify" a generic text or DOM Element with `<img>` tags or HTMLImage nodes.
 *
 * @overloads
 *
 * String replacement for `innerHTML` or server side operations:
 *  `imagemoji.parse(string)`
 *  `imagemoji.parse(string, Function)`
 *
 * HTML element tree parsing for safer operations over existing DOM:
 *  `imagemoji.parse(Node)`
 *  `imagemoji.parse(Node, Function)`
 *
 * @param  what  The source to parse and enrich with emoji
 *
 *             string:          Replace emoji matches with `<img>` tags.
 *                              Mainly used to inject emoji via `innerHTML`
 *                              It does **not** parse the string or validate it,
 *                              it simply replaces found emoji with a tag.
 *                              NOTE: be sure this won't affect security.
 *
 *             Node:            Walk through the DOM tree and find emoji
 *                              that are inside **text node only** (nodeType === 3)
 *                              Mainly used to put emoji in already generated DOM
 *                              without compromising surrounding nodes and
 *                              **avoiding** the usage of `innerHTML`.
 *                              NOTE: Using DOM elements instead of strings should
 *                              improve security without compromising too much
 *                              performance compared with a less safe `innerHTML`.
 *
 * @param  how   If specified, this will be invoked per each emoji that has been
 *               found through the RegExp except those follwed by the invariant
 *               \uFE0E ("as text"). Once invoked, parameters will be:
 *
 *                       icon {string}    the lower case HEX code point
 *                                        i.e. "1f4a9"
 *
 * @example
 *
 *  imagemoji.parse("I \u2764\uFE0F emoji!");
 *  //=> I <img class="emoji" draggable="false" alt="❤️" src="https://twemoji.maxcdn.com/v/latest/svg/2764.svg"/> emoji!
 *
 *  imagemoji.parse("I \u2764\uFE0F emoji!", (icon) => "/assets/emoji/" + icon + ".png");
 *  //=> I <img class="emoji" draggable="false" alt="❤️" src="/assets/emoji/2764.png"/> emoji!
 *
 */
const parse = function (what: string | Node, how?: (icon: string) => string): string | Node {
  // only accept custom how if it's a function
  how = (typeof how === "function") ? how : getTwemojiSvg;

  // if first argument is string, return html <img> tags
  // otherwise use the DOM tree and parse text nodes only to inject images
  return (typeof what === "string") ? parseString(what, how) : parseNode(what, how);
};

export { parse };
