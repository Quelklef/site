import sys
import os
import frontmatter
import glob
import markdown
import jinja2
import datetime
import time
from sortedcollections import SortedList
from contextlib import contextmanager

import calc_item_tree

# == CLI == #

__doc__ = """
build.py [--no-latex]
build.py watch <args...>

  --no-latex: don't compile latex
"""

if len(sys.argv) > 1 and sys.argv[1] == 'watch':
  args = ' '.join("'" + s.replace("'", "\\'") + "'" for s in sys.argv[2:])
  os.system(f"""
  ( cd site/ && python3 -m http.server ) & pid=$!
  python3 build.py {args}
  trap "kill $pid" EXIT INT

  while inotifywait -qqre close_write *
  do
    python3 build.py {args}
  done
  """)
  quit()

print("\n= = = = = = = = = = = = = = = = = = = = = = = =\nBuilding website ...")
print(f"Command: {' '.join(sys.argv)}")  # Naive
build_start_time = time.time()

@contextmanager
def log_section(text):
  x = 0
  col_size = 20

  print(text + " ... ", end='')
  start = time.time()

  def log_msg(*args, **kwargs):
    print(*args, "... ", **kwargs, end='')

  yield log_msg

  elapsed = time.time() - start
  print(f"done! [{elapsed:.2f}s]")

# == Renderers == #

def render_markdown(text):
  return markdown.markdown(text)

def render_jinja2(text, context={}):
  template = jinja_env.from_string(text)
  return template.render(**context)

# == Preprocessing and Frontmatter Handling == #

# Bash it up
with log_section("Clearing/creating site/") as log:
  os.system("""
  # Clone src/ to site/
  [ ! -d site/ ] && mkdir site
  rm -rf site/*
  cp -r src/* site
  """)
  os.chdir('site/')

# Compile sass
with log_section("Compiling css") as log:
  os.system("sass --quiet --update .:.")

# Compile LaTeX
if '--no-latex' in sys.argv:
  print("Skipping LaTeX due to '--no-latex'")
else:
  for file_loc in glob.iglob('**', recursive=True):
    if os.path.isfile(file_loc) and file_loc.endswith('.tex'):
      with log_sction(f"Compiling {file_loc} ..."):
        dir = os.path.dirname(file_loc)
        rel_file_loc = os.path.basename(file_loc)
        # https://tex.stackexchange.com/a/459470
        os.system(f"""
        cd {dir}
        : | pdflatex {rel_file_loc} -halt-on-error | grep '^!.*' -A200 --color=always
        """)

jinja_env = jinja2.Environment(
  loader=jinja2.FileSystemLoader('./'),
  variable_start_string='{$',
  variable_end_string='$}',
)

def get_full_extension(file_loc):
  """ Get the full extension, e.g. `.zip.bz2` rather than just `.bz2` """
  exts = []

  while True:
    init, last = os.path.splitext(file_loc)
    file_loc = init
    exts.append(last)
    if not last:
      break

  return ''.join(reversed(exts))

# Create a dict of all items, { source_loc => item }
# An 'item', effectively, is a link with metadata
# Each item will be repesented by a dictionary of metadata
# If the metadata does not have an 'href' attribute, it will be
# assigned one

# As we create this dict, we actually strip the frontmatter off of
# the files.

# Sort by reverse chronological
items = SortedList([], key=lambda item: datetime.date.today() - item['date'])

# Default values for item frontmatter
item_defaults = {
  'tags': [],
}

for item_loc in glob.iglob('items/**', recursive=True):
  if os.path.isfile(item_loc) and item_loc.endswith('.fm'):
    o = frontmatter.load(item_loc)
    item = o.metadata
    defaults = {
      'tags': [],
      'href': item_loc[:-len(get_full_extension(item_loc))] + '.html' ,
    }
    item = {**defaults, **item}
    items.add(item)

# == Main Execution == #

# Create item tree for Jinja2 rendering
item_tree = calc_item_tree.calc_item_tree(items)
jinja2_context = {
  'items': items,
  'top_level_items': item_tree[0]['items'],
  'item_tree': item_tree[0]['children'],
}

def render_file(file_loc):
  """ Render a file to HTML """
  ext = get_full_extension(file_loc)

  if (not ext.startswith('.md')
      and not ext.startswith('.jinja2')
      and not ext.startswith('.html')):
    raise ValueError("Unrenderable file")

  dest = file_loc[:-len(ext)] + '.html'

  if file_loc.endswith('.fm'):
    o = frontmatter.load(file_loc)
    content = o.content
    metadata = o.metadata
  else:
    with open(file_loc, 'r') as f:
      content = f.read()
    metadata = None

  if ext.startswith('.md'):
    rendered = render_markdown(content)
  elif ext.startswith('.jinja2'):
    rendered = render_jinja2(content, jinja2_context)
  elif ext.startswith('.html'):
    rendered = content

  # Wrap in a layout if had metadata with 'layout' attr
  if metadata and 'layout' in metadata:
    layout_loc = os.path.join('layouts/', metadata['layout'] + '.jinja2')
    with open(layout_loc, 'r') as l:
      rendered = render_jinja2(
        l.read(),
        {
          **jinja2_context,
          'item': {**metadata, 'content': rendered}
        },
      )

  with open(dest, 'w') as f:
    f.write(rendered)

with log_section("Rendering") as log:
  rendered_count = 0

  for file_loc in glob.iglob('./**', recursive=True):
    if (os.path.isfile(file_loc)
        and './templates' not in file_loc
        and './layouts' not in file_loc
        and './includes' not in file_loc):

      try:
        render_file(file_loc)
      except ValueError:
        pass
      else:
        rendered_count += 1

  log(f"rendered {rendered_count} files")

# == Cleanup == #

# Only a partial cleanup, but it's better than nothing

delete_exts = [
  ".sass",
  ".sassc",
  ".css.map",
  ".log",
  ".tex",
  ".aux",
  ".out",
  ".toc",
  ".jinja2",
  ".jinja2.fm",
  ".md",
  ".md.fm",
  ".txt.fm",
  ".html.fm",
  ".bib",
  ".gitignore",
  ".git",
  ".py",
]

with log_section("Cleaning") as log:
  removed_count = 0
  for file_loc in glob.iglob('**', recursive=True):
    if os.path.isfile(file_loc) and any(file_loc.endswith(suffix) for suffix in delete_exts):
      removed_count += 1
      os.system(f"rm {file_loc}")

  log(f"removed {removed_count} files")

build_time_elapsed = time.time() - build_start_time
print(f"... build complete in {build_time_elapsed:.2f}s!")

