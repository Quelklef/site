import os
import atexit
from pathlib import Path
import watchdog.events
import watchdog.observers

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


def was_modified(path: Path, *, since):
  """
  Was the file at the given path modified since the given time?
  e.g. `if modified(path, since=yesterday):`
  """

  # TODO
  # Hack to get the index to rebuild every time
  # since detecting changes to files/ doesn't seem to
  # be working
  if 'index' in str(path):
    return True

  if since is None:
    # air on the conservative side
    return True

  mod_time = path.stat().st_mtime
  return mod_time > since


def flatten(xss):
  """
  Flatten a list one level
  """
  result = []
  for xs in xss:
    result.extend(xs)
  return result
