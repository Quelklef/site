import jinja2
from pathlib import Path
from markdown import markdown as parse_markdown
from .globals import build_target, last_build_time, modified
from .calc_item_tree import calc_item_tree
from .log import log_section, log
from .util import shell_exec

jinja_env = jinja2.Environment(
  loader=jinja2.FileSystemLoader(build_target),
  variable_start_string='{$',
  variable_end_string='$}',
)

def render_jinja2(text, **context):
  template = jinja_env.from_string(text)
  return template.render(**context)

class composable:
  """
  Allow a function to be composed with >> such that
  (f >> g)(x) = g(f(x))
  """
  def __init__(self, f):
    self.f = f

  def __call__(self, *args, **kwargs):
    return self.f(*args, **kwargs)

  def __rshift__(self, other):
    def composed(*args, **kwargs):
      return other.f(self.f(*args, **kwargs))
    return composable(composed)

@composable
def markdown(item):
  item['payload'] = parse_markdown(item['payload'])
  return item

def make_jinja2_raw(jinja2_context):
  @composable
  def jinja2_raw(item):
    """ Jinja2 with no template """
    rendered = render_jinja2(item['payload'], **jinja2_context)
    item['payload'] = rendered
    return item
  return jinja2_raw

def make_jinja2(jinja2_context):
  def jinja2(layout_name, requires=[], context={}):
    """ Jinja2 with a template. Context goes to the template. """
    # TODO: this function is kina sus

    layout_loc = build_target / f"layouts/{layout_name}.jinja2"

    @composable
    def build(item):
      # TODO: find a better solution than tacking onto item
      #       it's done this way because it's how the jinja2
      #       thing that handles the requirements expects
      #       the requires to be a key in the given context
      item['requires'] = requires

      # render as jinja2
      rendered = render_jinja2(item['payload'], **jinja2_context)

      # wrap in layout
      with open(layout_loc, 'r') as layout_f:
        layout = layout_f.read()
        rendered = render_jinja2(layout, **jinja2_context, item=item, **context)

      item['payload'] = rendered
      return item
    return build
  return jinja2

@composable
def write(item):
  with open(item['target'], 'w') as out:
    out.write(item['payload'])
  return item

def write_to(location):
  location = build_target / location

  @composable
  def builder(item):
    with open(location, 'w') as out:
      out.write(item['payload'])
    return item
  return builder

def shell(shell_cmd):
  @composable
  def builder(item):
    shell_exec(shell_cmd)
    return item
  return builder

@composable
def noop(item):
  # Do nothing
  return item

def latex(rel_loc, *, tex_args="", bib_args=""):
  """ Compile a .tex file at the given location, either absolute or relative to the item """
  rel_loc = Path(rel_loc)

  @composable
  def builder(item):
    abs_loc = (item['location'].parent / rel_loc).resolve()
    abs_dir = abs_loc.parent
    tex_name = rel_loc.stem  # name of the file without .tex

    # pdflatex command modified from https://tex.stackexchange.com/a/459470
    do_pdflatex = lambda: shell_exec(f"cd \"{abs_dir}\" && ! : | pdflatex {tex_args} -halt-on-error {abs_loc} | grep '^!.*' -A200 --color=always")
    do_bibtex = lambda: shell_exec(f"cd \"{abs_dir}\" && bibtex -terse {bib_args} {tex_name} | grep '.' --color=always")

    do_pdflatex()
    do_bibtex()
    for _ in range(3):  # Do compilation a bunch of times for e.g. table-of-contents to work
      do_pdflatex()

  return builder

def build_payload(item, jinja2_context):
  """
  Build the underling payload of the item
  according to the given metadata.
  Output the built file to the appropriate location.
  """

  jinja2 = make_jinja2(jinja2_context)
  jinja2_raw = make_jinja2_raw(jinja2_context)

  build_f = eval(item['build'])
  clone = {**item}
  built = build_f(clone)

def item_modified(item):
  """ Was the item modified since last build? """
  return any(modified(path) for path in item['files'])

def build_payloads(items, *, from_scratch):
  """ Build the payloads of all items """

  indexed = [item for item in items if item['indexed']]
  index_tree = calc_item_tree(indexed)
  jinja2_context = {
    'items': indexed,
    'top_level_items': index_tree[0]['items'],
    'item_tree': index_tree[0]['children'],
  }

  with log_section("Building payloads"):
    for item in items:
      loc = item['location'].relative_to(build_target)

      if not from_scratch and not item_modified(item):
        log(f"- skipping '{loc}' because it has not been modified since the last build")
      else:
        with log_section(f"@ building '{loc}'"):
          build_payload(item, jinja2_context)

    log(f"{len(indexed)} payloads built")

