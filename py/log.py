import time
import sys
from contextlib import contextmanager

depth = 0

def log(text, **kwargs):
  print("  " * depth + text, **kwargs)

@contextmanager
def log_section(text, multiline=True):
  global depth

  if multiline:
    log(text + " ...")
  else:
    log(text + ' ...', end='')
    sys.stdout.flush()

  start = time.time()
  depth += 1

  yield log

  depth -= 1
  elapsed = time.time() - start

  if multiline:
    log(f"... done! [{elapsed:.2f}s]")
  else:
    print(f" done! [{elapsed:.2f}s]")

