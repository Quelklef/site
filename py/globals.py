from pathlib import Path

build_source = Path('src/').resolve()
build_target = Path('build/').resolve()

# File containing the last build time
build_time_f = build_target / '_build_time.txt'
