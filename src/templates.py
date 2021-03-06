import unplate

if unplate.true:
  exec(unplate.compile(__file__), locals(), globals())
else:

  templates = {}

  def indexed(name):
    def decorator(template):
      templates[name] = template
      return template
    return decorator

  def tmpl_base(body='', head='', title="Maynard's Site"):
    [unplate.begin(template)] @ """
    <!DOCTYPE html>
    <html>
      <head>
        <title>{{ title }}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link rel="stylesheet" type="text/css" href="https://necolas.github.io/normalize.css/8.0.1/normalize.css">
        <link rel="stylesheet" type="text/css" href="/assets/css/global.css">
        <!--
          <link rel="stylesheet" type="text/css" media="only screen and (min-device-width: 480px)" href="/assets/css/global-mobile.css">
        -->
        <link rel="icon" href="/assets/favicon.ico" type="image/x-icon">
        {{ head }}
      </head>
      <body>
        <div class="\header">
          <div class="\header\middle">
            <p class="\header\title">
              Maynard's Site
              &nbsp;
              <img src="/assets/favicon.ico" />
              &nbsp;
            </p>
            <a href="/">Index</a>
            <a href="/items/mailing-list.html">Mailing list</a>
          </div>
        </div>
        <div id="\content">
          {{ body }}
        </div>
      </body>
    </html>
    """ [unplate.end]
    return template

  def tmpl_requires(requires):
    [unplate.begin(template)] @ r"""
    >>> if 'mathjax' in requires:
      <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js?config=TeX-MML-AM_CHTML" async></script>
      <script type="text/x-mathjax-config">
        MathJax.Hub.processSectionDelay = 0;
        MathJax.Hub.Config({
          tex2jax: {
            inlineMath: [['$','$'], ['\\(', '\\)']],
          },
        });
      </script>
    <<<

    >>> if 'notes' in requires:
      <script src="https://unpkg.com/hybrids@2.0.2/dist/hybrids.js"></script>
      <script src="/assets/notes/notes.js"></script>
      <script src="/assets/notes/linewrap.js"></script>
      <link rel="stylesheet" type="text/css" href="/assets/notes/notes.css">
    <<<

    >>> if 'syntax-highlighting' in requires:
      <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/highlight.js/10.1.1/styles/dracula.min.css">
      <script src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/10.1.1/highlight.min.js"></script>
      <script>
      document.addEventListener("DOMContentLoaded", function() {
        hljs.initHighlightingOnLoad();
      });
      </script>
    <<<
    """ [unplate.end]
    return template

  @indexed('simple')
  def tmpl_simple(item, *, requires=[]):
    title = item['title']
    head = tmpl_requires(requires)
    body = item['payload']
    return tmpl_base(body, head, title)

  @indexed('post')
  def tmpl_post(item, *, requires=[]):

    title = item['title']
    head = tmpl_requires(requires)

    [unplate.begin(body)] @ """
    <h2>{{ item['title'] }}</h2>
    {{ item['payload'] }}
    """ [unplate.end]

    return tmpl_base(body, head, title)

  @indexed('proxy')
  def tmpl_proxy(item, target, *, requires=[]):

    head = tmpl_requires(requires)

    [unplate.begin(body)] @ """
    <div class="--fullwidth">
      <div class="\proxy-window">
        <a
          target="_blank"
          href="{{ target }}"
          class="--plain-link \proxy-window\iframe-wrap"
        >
          <iframe tabindex="-1" id="the-iframe" src="{{ target }}"></iframe>
        </a>
        <div class="\proxy-window\caption">The above is a preview. <a target="_blank" href="{{ target }}">See the app itself.</a></div>
      </div>
    </div>

    <script>
      const iframe = document.getElementById('the-iframe');

      function ensureIframeNotFocused() {
        if (document.activeElement === iframe)
          document.activeElement.blur();
      }

      // Ensure not focused at several points, just in case
      document.addEventListener('load', ensureIframeNotFocused);
      iframe.addEventListener('load', ensureIframeNotFocused);
      iframe.addEventListener('focus', ensureIframeNotFocused);
    </script>

    <h2>{{ item['title'] }}</h2>
    {{ item['payload'] }}
    """ [unplate.end]

    return tmpl_base(body, head)
