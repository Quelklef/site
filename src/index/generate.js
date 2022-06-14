
let out = '';

out += String.raw`
<!DOCTYPE HTML>

<html>
  <head>
    <title>maynards.site</title>
    <meta charset="utf-8" />
    <meta content="width=device-width, initial-scale=1" name="viewport"/>
  </head>
  <body>

<style>

@import url('https://fonts.googleapis.com/css2?family=Merriweather&display=swap');

body {
  margin: 0;
  padding: 0 10vw;
  padding-bottom: 200px;
}

* {
  box-sizing: border-box;
}

main {
  font-size: 14px;
  font-family: 'Merriweather', serif;

  max-width: 600px;
  margin: 0 auto;

  display: flex;
  flex-direction: column;
}

.item {
  width: 100%;
  margin-bottom: 1em;
}

.item-href, .item-desc {
  display: inline-block;
  width: 100%;
  padding: .25em .5em;
}

.item-href {
  font-family: monospace;
  font-size: 1.15em;
}

.lonk {
  color: #C06;
  text-decoration: none;
}

.lonk:hover {
  background-color: #cc006614;
}

.item-desc {
}

.title {
  margin: 4em 0;
}

.title h1 {
  font-size: 1.5em;
  font-weight: normal;
  margin: 0;
  margin-bottom: .5em;
}

.title p {
  font-size: .8em;
  margin: 0;
}

</style>

<main>

<div class="title">
  <h1>maynard's website</h1>
  <p>eli.t.maynard@gmail.com</p>
</div>

<div class="items">

`;

const items = [
  {
    text: 'resume',
    href: 'https://maynards.site/resume',
  },
  {
    text: 'twitter',
    href: 'https://twitter.com/quelklef',
  },
  {
    text: 'github',
    href: 'https://github.com/quelklef',
  },
  {
    text: 'ζ',
    href: 'https://z.maynards.site',
    desc: 'Zettelkasten &mdash; notes and thoughts',
  },
  {
    text: 'fitch',
    href: 'https://maynards.site/fitch',
    desc: 'Interactive proof assistant for Fitch-style natural deduction',
  },
  {
    text: 'mathsproofbot',
    href: 'https://twitter.com/mathsproofbot/with_replies',
    desc: 'Fitch-style proof bot',
  },
  {
    text: 'minesweeper',
    href: 'https://maynards.site/items/minesweeper/full',
    desc: 'Keyboard-only mineseeper',
  },
  {
    text: 'daygen',
    href: 'https://daygen.maynards.site',
    desc: 'Randomize your life',
  },
  {
    text: 'legacy index',
    href: 'https://maynards.site/legacy-index',
    desc: 'Legacy website index',
  },
];

for (const item of items) {
  out += String.raw`
    <div class="item">
      <a class="item-href lonk" href="${item.href}">↳ ${item.text}</a>
      ` + (item.desc ? `<span class="item-desc">${item.desc}</span>` : '') + `
    </div>
  `;
}

out += String.raw`

</div>

</main>

  </body>
</title>
`;





require('fs').writeFileSync('./index.html', out);
