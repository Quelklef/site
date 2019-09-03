import time
import sys
from contextlib import contextmanager

class Printer:
  def __init__(self):
    self.backtrack_amt = 0

  def print(self, msg):
    # Using '\b \b' instead of just '\b' keeps there from being residue
    print("\b \b" * self.backtrack_amt, end='')
    self.backtrack_amt = 0
    print(msg + " ... ", end='')
    sys.stdout.flush()

  def flash(self, msg):
    """ Log a message, but have the next message overwrite it. """
    self.print(msg)
    self.backtrack_amt = len(msg) + 5  # 5 for ' ... '

printer = Printer()

@contextmanager
def log_section(text, multiline=False):
  if multiline:
    print(text + " ... ")
  else:
    print(text + " ... ", end='')

  start = time.time()

  yield printer

  elapsed = time.time() - start

  if multiline:
    print(f"... done! [{elapsed:.2f}s]")
  else:
    print(f"done! [{elapsed:.2f}s]")

