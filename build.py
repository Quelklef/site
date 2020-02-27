import os
import sys
import time
import jinja2
import atexit
import shutil
import random
from markdown import markdown as parse_markdown
import traceback
import subprocess
import contextlib
import frontmatter

import watchdog
import watchdog.events
import watchdog.observers

from pathlib import Path
from docopt import docopt

from lib.log import log_section, log
from lib.calc_item_tree import calc_item_tree

"""

TODO:

  - small refactor / code qual

  - only rebuild items that were changed since last build

  - implement --from-scratch

  - think about how the design of the 'build' frontmatter attribute.
    it works fine now and has ok design, but it's perhaps not perfect.
    might actually be okay, though.

  - normalize urls.
    in the 'target' frontmatter attribute, they're relative to the item.
    in e.g. write_to in the build chain or in jinja2("proxy", context={"target": URI}),
      they're relative to the build target directory.
    they should all be normalized to be relative to the item.

  - most abstracts are ~1 sentence; switch to 'description' or something.
    then add an actual 'abstract' attribute for ~1para descriptions.

  - documentation
    new documentation and also
    redo some of the documentation for better explanations

"""

__doc__ = """

Site building utility

The website is best thought of as a collection of links to things.
Each link has an href and a bunch of associated metadata. The href
and metadata together is referred to as an 'item'. These items are
organized and displayed on the website's index.
Items are found by searching src/ for files ending with '.fm'. These
files may be 'pure links', e.g. pointing to an external website, or
contain a payload, such as a LaTeX file. The 'fm' denotes the existence
of frontmatter on the file, which gives the metadata. The payload
is mostly ignored, and the item denoted from the metadata is added
to the website index.

Usage:
  build.py build [--from-scratch]
  build.py serve [--from-scratch]
  build.py unindexed

Commands:
  build       Build the website once and exit.
  serve       Build the website once and rebuild when files change. Additionally,
              serve the website on localhost. Given arguments are passed onto
              the resulting `build.py build` calls.
  unindexed   List all the unindexed items

Options:
  --from-scratch    Unconditionally rebuild everything
                    Normally, items are skipped if it is detected that
                    they have not changed since the last build.
                    (TODO)

"""

def shell_exec(command):
  status = os.system(command)
  if os.WIFEXITED(status) and os.WEXITSTATUS(status) != 0:
    raise ChildProcessError(f"Shell command exited with status {os.WEXITSTATUS(status)}. Command was:\n    {command}")

def path_in_eq_dir(path, dir):
  """ Return true iff `path` is `dir` or within `dir` """
  # https://stackoverflow.com/a/47347518/4608364
  rpath = os.path.realpath(path)
  rdir = os.path.realpath(dir)
  return rpath == rdir or rpath.startswith(rdir + os.sep)


build_source = Path('src/').resolve()
build_target = Path('build/').resolve()

jinja_env = jinja2.Environment(
  loader=jinja2.FileSystemLoader(build_target),
  variable_start_string='{$',
  variable_end_string='$}',
)

# parser combinators

class ParseError(ValueError):
  pass

def instance(expected_type):
  def parser(val):
    if not isinstance(val, expected_type):
      if isinstance(val, NoneType):
        raise ParseError(f"This key is required.")
      else:
        raise ParseError(f"Required '{expected_type}', not '{type(val)}'.")
    return val
  return parser

def reserved(val):
  if val is not None:
    raise ParseError("This key may not be specified.")
  return None

def list_of(parser):
  def composite_parser(val):
    instance(list)(val)
    return map(parser, val)
  return composite_parser

def optionally(parser, default=None):
  def composite_parser(val):
    if val is None:
      return default
    return parser(val)
  return composite_parser

def required(parser):
  def composite_parser(val):
    if val is None:
      raise ParseError("This key is required.")
    return parser(val)
  return composite_parser

def one_of(*options):
  def parser(val):
    if val not in options:
      raise ParseError(f"Expected one of {', '.join(options)}, not 'val'")
    return val
  return parser

def parse_item(fileloc: Path):
  """
  Parse an item from a file, expecting some frontmatter followed by
  a payload. The payload may or may not be empty. The frontmatter
  is expeected to adhere to a particular format which I will not
  mention in this docstring--read the function.
  """

  with open(fileloc) as f:
    metadata, payload = frontmatter.parse(f.read())
    if metadata == {}:
      raise ParseError(f"Item at '{fileloc}' has no metadata!")

  def parse_target(path):
    # default to file location with '.fm' removed
    if path is None:
      return Path(str(fileloc)[:-len('.fm')])

    # preserve e.g. http:// links
    # TODO: technically, colons can be in directory names.
    if ':' in path:
      return path

    # make absolute
    return (fileloc.parent / path).resolve()

  # All possible keys
  accepted_keys = {
    # Title of the post
    'title': instance(str),

    # A list of tags (strings)
    'tags': instance(list),

    # A ~paragraph description of the item
    'abstract': optionally(instance(str)),

    # The url of the target
    # If not specified, defaults to the filename with '.fm' removed from the end
    'target': parse_target,

    # The build chain of the item.
    # Should be one or more item separated by " -> "
    # Designates the build process for the item.
    # For instance, `markdown -> jinja2` will parse
    # the payload as markdown and feed the resultant
    # HTML into the jinja2 template, which will
    # give the result.
    # Default: standalone
    # Accepted values:
    # - noop: ignore the payload; output nothing
    # - plaintext: output payload as-is
    # - markdown: parse payload as markdown and
    #             output result HTML
    # - jinja2: wrap payload in a Jinja2 template
    #           (also see the 'layout' property)
    'build': optionally(instance(str), default='noop'),

    # Should the item be included in the index?
    # (default: True)
    'indexed': optionally(instance(bool), default=True),

    # The content that the frontmatter is annotation
    # i.e., the 'actual' content of the file
    'payload': reserved,

    # The file location
    'location': reserved,

    # The value that should go into an <a> tag
    'computed_href': reserved,
  }

  superfluous_keys = metadata.keys() - accepted_keys.keys()
  if superfluous_keys:
    raise ParseError(f"Unaccpetable key(s): {', '.join(superfluous_keys)}")

  item = {}
  for key, parser in accepted_keys.items():
    value = metadata.get(key)
    try:
      parsed = parser(value)
    except ParseError as err:
      err.args = (f"There was an error with key '{key}' in file '{fileloc}': {str(err)}",)
      raise err
    item[key] = parsed

  item['payload'] = payload
  item['location'] = fileloc

  if isinstance(item['target'], Path):
    # make relative if it's a target to a file (as opposed to e.g. an http:// link)
    rel_target = item['target'].relative_to(build_target)
    # prepend a '/' to make it an absolute html link
    computed_href = '/' + str(rel_target)
    item['computed_href'] = computed_href
  else:
    item['computed_href'] = item['target']

  return item


def find_items(directory: Path):
  """
  Find all files in a directory that
  end in '.fm'; parse them and return the
  parsed items.
  """
  items = []
  with log_section("Looking for items"):
    for file_loc in directory.glob('**/*.fm'):
      rel_loc = file_loc.relative_to(directory)
      log(f"found '{rel_loc}'")
      items.append(parse_item(Path(file_loc)))
    log(f"found {len(items)} items")
  return items


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


def build_payload(item, jinja2_context):
  """
  Build the underling payload of the item
  according to the given metadata.
  Output the built file to the appropriate location.
  """

  @composable
  def markdown(item):
    item['payload'] = parse_markdown(item['payload'])
    return item

  @composable
  def jinja2_raw(item):
    """ Jinja2 with no template """
    rendered = render_jinja2(item['payload'], **jinja2_context)
    item['payload'] = rendered
    return item

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


  build_f = eval(item['build'])
  clone = {**item}
  built = build_f(clone)


def build_payloads(items):
  """
  Build the payloads of all items
  """

  indexed = [item for item in items if item['indexed']]
  random.shuffle(indexed)
  index_tree = calc_item_tree(indexed)
  jinja2_context = {
    'items': indexed,
    'top_level_items': index_tree[0]['items'],
    'item_tree': index_tree[0]['children'],
  }

  with log_section("Building payloads"):
    for item in indexed:
      loc = item['location'].relative_to(build_target)
      with log_section(f"building '{loc}'", multiline=False):
        build_payload(item, jinja2_context)
    log(f"{len(indexed)} payloads built")


def watch_dir(target, callback):
  """ Watch the target directory and call the decorated function on each change. Blocking. """

  class EventHandler(watchdog.events.FileSystemEventHandler):
    def on_any_event(self, event):
      callback(event)

  # Create observer
  event_handler = EventHandler()
  observer = watchdog.observers.Observer()
  file_observer = watchdog.observers.Observer()
  observer.schedule(event_handler, target, recursive=True)

  # Kill observer on program exit
  atexit.register(observer.stop)

  # Start and block
  observer.start()
  observer.join()


def main():

  args = docopt(__doc__)

  if args['build']:
    build_site()

  elif args['serve']:

    def try_build():
      try:
        build_site()
      except Exception as e:
        print()
        traceback.print_exc()
        print("\n^^ Exception occured while building site ^^\n")

    # Build  once
    try_build()

    # Start webserver
    process = subprocess.Popen(['python3', '-m', 'http.server'], cwd=build_target)

    # Kill webserver on program exit
    atexit.register(lambda: process.kill())

    # Rebuild on change

    def event_handler(event):
      # if the event was in the build target directory, ignore
      if path_in_eq_dir(event.src_path, build_target): return
      # if the event was us modifying /this/ file, ignore
      # since building again wouldn't be using the updated code
      if Path(event.src_path) == Path(__file__): return
      # if the event is just that the top directory was modified, ignore
      if event.src_path == '.': return
      # otherwise, rebuild
      try_build()

    watch_dir('.', event_handler)

  elif args['unindexed']:
    items = find_items(build_target)
    unindexed = [item for item in items if not item['indexed']]
    locations = [str(item['location']) for item in items]
    print('\n'.join(locations))


def build_site():

  print("\n============== [ BEGIN BUILD ] ==============\n")

  with log_section('Building site'):

    # clone source folder to build folder
    with log_section(f"Clearing/creating {build_target}", multiline=False):
      # clear if exists
      if os.path.isdir(build_target):
        shutil.rmtree(build_target)
      shutil.copytree(build_source, build_target)

    # build items
    items = find_items(build_target)
    build_payloads(items)

   # Compile sass
    with log_section("Compiling sass", multiline=False):
      os.system("sass --quiet --update .:.")

  print("\n============== [ BUILD COMPLETE ] ==============\n")

if __name__ =='__main__':
  main()
