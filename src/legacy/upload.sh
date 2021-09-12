#!/bin/bash

set -e

# build
if [ "$1" = "--build" ]; then
  git submodule init
  git submodule update --recursive
  pipenv run python3 site.py build --from-scratch
fi

# upload
rsync -rvutP build/* root@167.99.145.139:/var/www/maynards.site/
