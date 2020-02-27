
def calc_item_tree(items):
  """
  What we have is a bunch of items, each of which have 0 or more tags.
  This function turns a list of items into a rose tree with a particular
  structure.

  Consider the example:
    file: tree.png | tags: [png, nature]
    file: rose.png | tags: [png, nature, flower]
    file: bush.png | tags: [png, nature]
    file: math.txt | tags: [txt, school]
    file: blue.iso | tags: []

  We'd like to organize this into a rose tree where lists of files are
  the roses and going down one path represents 'choosing' a tag in the
  sense that all files under that path will have that tag.
  So:
    1. A branch represents a tag. All files in nodes under that branch
       must have that tag.
    2. Roses are lists of files. The rose is all the files with the
       tags corresponding to the current path, and only those tags.

  We will also want that if the contents of one tag B are a strict
  subset of another tag A, then the subset B will ONLY show up as
  an option under A.

  For this example, we'd end up with:

    •─ <no tags>: [blue.iso]
       ├── png: []
       │   └── nature: [tree.png, bush.png]
       │       └── flower: [rose.png]
       ├── txt: []
       │   └── school: [math.txt]
       └── school: p[
           └── txt: [math.txt]

  Note that since school is not a strict subset of txt, and txt is not
  a strict subset of school, but they are both subsets of each other,
  both appear at the top-level of the tree.
  Also note that math.txt appears in two places in the tree.
  """

  tags = sorted(set(tag for item in items for tag in item['tags']))
  return [calc_item_tree_aux(items, None, [], tags)]

def strict_superset(li0, li1):
  return len(li0) > len(li1) and all(x in li0 for x in li1)

def without(li, x):
  li_ = li[:]
  li_.remove(x)
  return li_

def calc_item_tree_aux(items, tag, tags, universe):
  # Auxiliary item tree calculation function
  # Takes `items`, the list of all items,
  #       `tag`, the tag of the current branch
  #       `tags`, the ancestor tags (i.e. the path on the tree so far)
  #       `universe`, all tags in the tree

  def items_with(tag):
    return [item for item in items if tag in item['tags']]

  rose = sorted(
    [item for item in items if set(item['tags']) == set(tags)],
    key=lambda item: item['title']
  )

  children = []
  for child_tag in universe:
    # If going down this path contains at least one item
    nonempty = any(
      set(item['tags']) >= {*tags, child_tag}
      for item in items
    )

    # If this  tag is a strict subset of another tag
    subset = any(
      strict_superset(items_with(tag), items_with(child_tag))
      for tag in universe
    )

    if nonempty and not subset:
      children.append(
        calc_item_tree_aux(
          items,
          child_tag,
          tags + [child_tag],
          without(universe, child_tag)
        )
      )

  return {
    "tag": tag,
    "items": rose,
    "children": children,
  }
  
