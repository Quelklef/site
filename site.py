import os
import time
import atexit
import shutil
import subprocess
from pathlib import Path
from docopt import docopt
from py.globals import build_target, build_source, set_build_time
import py.log as log_module
from py.log import log_section, log
from py.util import shell_exec, watch_dir, path_in_eq_dir
from py.parse import parse_item
from py.build import build_payloads

"""

TODO:

  - small refactor / code qual

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

  - port from jinja2 to unplate

  - clean up imports

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
                    If used with 'serve', will only rebuild the initial build
                    from scratch. Subsequent builds will be incremental.

"""

def find_items(directory: Path):
  """
  Find all files in a directory that
  end in '.fm'; parse them and return the
  parsed items.
  """
  items = []
  with log_section("Looking for items"):
    for file_loc in directory.glob('**/*.fm'):
      log(f"found '{file_loc}'")
      items.append(parse_item(Path(file_loc)))
    log(f"found {len(items)} items")
  return items


def build_site(*, from_scratch):

  # If we encounter an error in the middle of a build, the depth
  # counter won't reset to 0, so do it at the beginning of
  # every build
  log_module.depth = 0

  print("\n============== [ BEGIN BUILD ] ==============\n")

  with log_section('Building site'):

    # clone source folder to build folder
    with log_section(f"Clearing/creating {build_target}", multiline=False):
      # clear if exists
      if os.path.isdir(build_target) and from_scratch:
        shutil.rmtree(build_target)

      # the '/.' ensures that we don't move the source folder into the target folder
      # preserve timestampts so that skipping unmodified stuff works properly
      # from https://unix.stackexchange.com/a/180987/126342
      shell_exec(f'cp -r --preserve=timestamps "{build_source}/." "{build_target}"')

    # build items
    items = find_items(build_target)
    build_payloads(items, from_scratch=from_scratch)

   # Compile sass
    with log_section("Compiling sass", multiline=False):
      shell_exec(f'cd "{build_target}" && sass --quiet --update .:.')

    # Record the build time
    # Do it last so that if it was unsuccessful we don't
    # reach this line.
    # If we recorded the time of a failed build, then
    # we may mistakenly skip building an item in a following build
    set_build_time()

  print("\n============== [ BUILD COMPLETE ] ==============\n")


def try_build_site(*args, **kwargs):
  try:
    build_site(*args, **kwargs)
  except Exception as e:
    print()
    traceback.print_exc()
    print("\n^^ Exception occured while building site ^^\n")


def main():

  args = docopt(__doc__)

  if args['build']:
    build_site(from_scratch=args['--from-scratch'])

  elif args['serve']:

    # Build  once
    try_build_site(from_scratch=args['--from-scratch'])
    # Start webserver
    process = subprocess.Popen(['python3', '-m', 'http.server'], cwd=build_target)
    # Kill webserver on program exit
    atexit.register(lambda: process.kill())

    # Rebuild on change:

    def event_handler(event):
      # if the event was in the build target directory, ignore
      if path_in_eq_dir(event.src_path, build_target): return
      # if the event was us modifying /this/ file, ignore
      # since building again wouldn't be using the updated code
      if Path(event.src_path) == Path(__file__): return
      # if the event is just that the top directory was modified, ignore
      if event.src_path == '.': return
      # otherwise, rebuild
      try_build_site(from_scratch=False)

    watch_dir('.', event_handler)

  elif args['unindexed']:
    items = find_items(build_source)
    unindexed = [item for item in items if not item['indexed']]
    locations = [str(item['location']) for item in items]
    print('\n'.join(locations))


if __name__ =='__main__':
  main()
