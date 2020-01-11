import sys
import os
import frontmatter
import glob
import markdown
import jinja2
import datetime
import time
import subprocess
import atexit
from sortedcollections import SortedList
from docopt import docopt

from lib.calc_item_tree import calc_item_tree
from lib.log import log_section

# == CLI == #

__doc__ = """

Site building utility

Usage:
  build.py build [--no-latex]
  build.py serve [--no-latex]

Commands:
  build   Build the website once and exit.
  serve   Build the website once and rebuild when files change. Additionally,
          serve the website on localhost. Given arguments are passed onto
          the resulting `built.py build` calls.

Options:
  --no-latex   Do not build latex files.

"""

print(f"Command: {' '.join(sys.argv)}")  # Naive
args = docopt(__doc__)

if args['serve']:

  # Start webserver
  process = subprocess.Popen(['python3', '-m', 'http.server'], cwd='./site')

  # Kill webserver on program exit
  atexit.register(lambda: process.kill())

  # Build once and rebuild on change
  nolatex = '--no-latex' if args['--no-latex'] else ''
  os.system(f"""
  python3 build.py build {nolatex}

  while inotifywait -qqre close_write *
  do
    python3 build.py build {nolatex}
  done
  """)
  quit()


print("\n= = = = = = = = = = = = = = = = = = = = = = = =")
with log_section("Building website", multiline=True):
  # == Renderers == #

  def render_markdown(text):
    return markdown.markdown(text)

  def render_jinja2(text, context={}):
    template = jinja_env.from_string(text)
    return template.render(**context)

  # == Preprocessing and Frontmatter Handling == #

  # Bash it up
  with log_section("Clearing/creating site/"):
    os.system("""
    # Clone src/ to site/
    [ ! -d site/ ] && mkdir site
    rm -rf site/*
    cp -r src/* site
    """)
    os.chdir('site/')

  # Compile LaTeX
  if args['--no-latex']:
    print("Skipping LaTeX due to '--no-latex'")
  else:
    with log_section(f"Compiling LaTeX") as printer:
      compiled_count = 0

      for file_loc in glob.iglob('**', recursive=True):
        if os.path.isfile(file_loc) and file_loc.endswith('.tex'):
          printer.flash(f"Compiling {file_loc}")
          compiled_count += 1

          dir = os.path.dirname(file_loc)
          rel_file_loc = os.path.basename(file_loc)
          assert '.' in rel_file_loc
          file_name = rel_file_loc[:rel_file_loc.index('.')]

          # https://tex.stackexchange.com/a/459470
          # FIXME: don't make -shell-escape baked-in
          pdflatex = lambda: os.system(f"cd \"{dir}\" && : | pdflatex -shell-escape -halt-on-error {rel_file_loc} | grep '^!.*' -A200 --color=always")
          bibtex = lambda: os.system(f"cd \"{dir}\" && bibtex -terse {file_name}")

          pdflatex()
          bibtex()
          for _ in range(3):  # Do compilation a bunch of times for e.g. table-of-contents to work
            pdflatex()

      printer.print(f"compiled {compiled_count} files")

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

  # Sort by reverse chronological, breaking ties alphabetically
  items = SortedList([], key=lambda item: (datetime.date.today() - item['date'], item['title']))

  # Default values for item frontmatter
  item_defaults = {
    'tags': [],
  }

  for item_loc in glob.iglob('items/**', recursive=True):
    if os.path.isfile(item_loc) and item_loc.endswith('.fm'):
      o = frontmatter.load(item_loc)
      item = o.metadata

      if not item.get('indexed', True):
        continue

      # Apply defaults
      defaults = {
        'tags': [],
        #       make link absolute
        'href': os.path.join('/' + item_loc[:-len(get_full_extension(item_loc))] + '.html'),
      }
      item = {**defaults, **item}

      # Strip `/index.html` because it's prettier without it
      if item['href'].endswith('/index.html'):
        item['href'] = item['href'][:-len('index.html')]

      items.add(item)

  # == Main Execution == #

  # Create item tree for Jinja2 rendering
  item_tree = calc_item_tree(items)
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

  with log_section("Rendering") as printer:
    rendered_count = 0

    for file_loc in glob.iglob('./**', recursive=True):
      if (os.path.isfile(file_loc)
          and './templates' not in file_loc
          and './layouts' not in file_loc
          and './includes' not in file_loc):

        printer.flash(f"rendering {file_loc}")

        try:
          render_file(file_loc)
        except ValueError:
          pass
        else:
          rendered_count += 1

    printer.print(f"rendered {rendered_count} files")

  # Compile sass
  with log_section("Compiling css"):
    os.system("sass --quiet --update .:.")

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

  with log_section("Cleaning") as printer:
    removed_count = 0

    for file_loc in glob.iglob('**', recursive=True):
      if os.path.isfile(file_loc) and any(file_loc.endswith(suffix) for suffix in delete_exts):
        printer.flash(f"removing {file_loc}")
        removed_count += 1

        os.system(f"rm {file_loc}")

    printer.print(f"removed {removed_count} files")
