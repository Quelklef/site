import unplate as unplate_module
from pathlib import Path
from markdown import markdown as parse_markdown
from .globals import build_target
from .calc_item_tree import calc_item_tree
from .log import log_section, log
from .util import shell_exec, was_modified, flatten

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
    def composed(item, ctx):
      return other.f(self.f(item, ctx), ctx)
    return composable(composed)

@composable
def markdown(item, ctx):
  item['payload'] = parse_markdown(item['payload'])
  return item

@composable
def write(item, ctx):
  with open(item['target'], 'w') as out:
    out.write(item['payload'])
  return item

def write_to(location):
  location = build_target / location

  @composable
  def builder(item, ctx):
    with open(location, 'w') as out:
      out.write(item['payload'])
    return item
  return builder

def shell(shell_cmd):
  @composable
  def builder(item, ctx):
    shell_exec(shell_cmd)
    return item
  return builder

@composable
def noop(item, ctx):
  # Do nothing
  return item


unplate_options = unplate_module.options.Options()
unplate_options.interpolation_open = '[|'
unplate_options.interpolation_close = '|]'

@composable
def unplate(item, ctx):

  # because unplate requires the exact tokens '[unplate.template(' in
  # order to work, we can't write '[unplate_module.template(', so
  # we need to make the following assignment
  # TODO: this is gonna act funny if the payload contains a triple-quote
  unplate = unplate_module
  # add three underscores after 'template' to reduce change of namespace
  # conflict with the payload code
  code = f"""
[unplate.begin(template___)] @ '''
{ item['payload'] }
''' [unplate.end]
  """

  ctx = {**ctx}
  exec(unplate_module.compile_anon(code, options=unplate_options), ctx)

  item['payload'] = ctx['template___']
  return item

def latex(rel_loc, *, tex_args="", bib_args=""):
  """ Compile a .tex file at the given location, either absolute or relative to the item """
  rel_loc = Path(rel_loc)

  @composable
  def builder(item, ctx):
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


# TODO: code smell
import sys
sys.path.append('src/')
import templates

def template(template_name, *args, **kwargs):
  template = templates.templates[template_name]

  @composable
  def builder(item, ctx):
    result = template(item=item, *args, **kwargs)
    item['payload'] = result
    return item
  return builder

def build_payload(item, build_ctx):
  """
  Build the underling payload of the item
  according to the given metadata.
  Output the built file to the appropriate location.
  """

  build_f = eval(item['build'])
  clone = {**item}
  built = build_f(clone, ctx=build_ctx)

def item_was_modified(item, *, since):
  """ Was the item modified since last build? """
  return any(was_modified(path, since=since) for path in item['files'])

def build_payloads(items, *, last_build_time):
  """ Build the payloads of all items """

  indexed = [item for item in items if item['indexed']]
  index_tree = calc_item_tree(indexed)
  build_ctx = {
    'items': indexed,
    'top_level_items': index_tree[0]['items'],
    'item_tree': index_tree[0]['children'],
    'tags': set(flatten([item['tags'] for item in indexed])),
  }

  with log_section("Building payloads"):
    for item in items:
      loc = item['location'].relative_to(build_target)

      if not item_was_modified(item, since=last_build_time):
        log(f"- skipping '{loc}' because it has not been modified since the last build")
      else:
        with log_section(f"@ building '{loc}'"):
          build_payload(item, build_ctx)

    log(f"{len(indexed)} payloads built")

