#!/bin/bash

if [ -d venv ]; then
  echo "Already initialized! Delete venv/ to force reinitialization"
  exit
fi

echo "Initializing submodules ..."
git submodule update --init --recursive

echo "Creating python virtualenv under venv/ ..."
mkdir venv
cd venv
python3 -m venv .

echo "Installing pip requirements ..."
source bin/activate
cd ..
pip3 install -r requirements.txt

echo "Recommended course of action: run 'source venv/bin/activate && python3 build.py watch'"
