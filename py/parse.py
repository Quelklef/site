from pathlib import Path
import frontmatter

from .globals import build_target

class ParseError(ValueError):
    pass

# parser combinators

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

def list_of(parser):
  def composite_parser(val):
    instance(list)(val)
    return list(map(parser, val))
  return composite_parser

def parse_item(item_path: Path):
  """
  Parse an item from a file, expecting some frontmatter followed by
  a payload. The payload may or may not be empty. The frontmatter
  is expeected to adhere to a particular format which I will not
  mention in this docstring--read the function.
  """
  abs_item_path = item_path.resolve()

  with open(abs_item_path) as f:
    metadata, payload = frontmatter.parse(f.read())
    if metadata == {}:
      raise ParseError(f"Item at '{item_path}' has no metadata!")

  def parse_target(path):
    # default to file location with '.fm' removed
    if path is None:
      return Path(str(item_path)[:-len('.fm')]).resolve()

    # preserve e.g. http:// links
    # TODO: technically, colons can be in directory names.
    if ':' in path:
      return path

    # make absolute
    return (item_path.parent / path).resolve()

  # All possible keys
  accepted_keys = {
    # Title of the post
    'title': instance(str),

    # A list of tags (strings)
    'tags': instance(list),

    # A ~paragraph description of the item
    'abstract': optionally(instance(str)),

    # The URI of the target
    # If not specified, defaults to the filename with '.fm' removed from the end
    'target': parse_target,

    # A list of paths to files or directories
    # Documents all the files that 'belong' to this item
    # On site rebuild, an item will only be rebuilt if any
    # of the files in its 'files' attribute has changed.
    # Defaults to a list containing only the item file itself.
    'files': optionally(
      list_of(lambda path: (item_path / path).resolve()),
      default=[abs_item_path],
    ),

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
      err.args = (f"There was an error with key '{key}' in file '{item_path}': {str(err)}",)
      raise err
    item[key] = parsed

  item['payload'] = payload
  item['location'] = item_path

  if isinstance(item['target'], Path):
    # make relative if it's a target to a file (as opposed to e.g. an http:// link)
    rel_target = item['target'].relative_to(build_target)
    # prepend a '/' to make it an absolute html link
    computed_href = '/' + str(rel_target)
    item['computed_href'] = computed_href
  else:
    item['computed_href'] = item['target']

  return item


