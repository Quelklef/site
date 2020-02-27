from pathlib import Path
import time

build_source = Path('src/').resolve()
build_target = Path('build/').resolve()

# File containing the last build time
build_time_f = build_target / '_build_time.txt'

# get the last build time
if build_time_f.is_file():
  with open(build_time_f, 'r') as f:
    try:
      last_build_time = float(f.read())
    except ValueError:
      last_build_time = None
else:
  last_build_time = None

def set_build_time():
  with open(build_time_f, 'w') as f:
    f.write(str(time.time()))

def modified(path: Path):
  """ Was the file at the given path modified since the last build? """

  if last_build_time is None:
    # air on the conservative side
    return True

  mod_time = path.stat().st_mtime
  return mod_time > last_build_time
