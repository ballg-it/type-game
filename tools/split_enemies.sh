#!/bin/sh
# Rebuild art/enemies/<id>.png from the AI lineup (art/enemies/lineup-green.jpg, green screen).
# Heights = on-stage px (640x360 stage) so the fight draws them 1:1; keep in sync with ENEMY_FIT in index.html.
set -e
cd "$(dirname "$0")/.."
python -c "import sys;sys.path.insert(0,'tools');from PIL import Image;import numpy as np;from key_frames import key;Image.fromarray(np.asarray(key(Image.open('art/enemies/lineup-green.jpg'))).astype('uint8'),'RGBA').save('art/enemies/lineup.png')"
python tools/split_lineup.py art/enemies/lineup.png art/enemies bandit:360:122 ghost:1040:124 oni:1740:136 queen:2380:150 \
  --cut "oni:queen:2030,0;2030,500;2160,560;2160,660;2100,720;2100,1110;2165,1170;2130,1260;2025,1340;2022,1536"
# Battle-stance redraws (generated one at a time from the lineup crop) replace the lineup poses
python tools/key_art.py art/enemies/bandit-green.jpg art/enemies/bandit.png 128
python tools/key_art.py art/enemies/ghost-green.jpg art/enemies/ghost.png 132
python tools/key_art.py art/enemies/oni-green.jpg art/enemies/oni.png 140
python tools/key_art.py art/enemies/queen-green.jpg art/enemies/queen.png 154
python tools/key_art.py art/enemies/mirror-green.jpg art/enemies/mirror.png 152
python tools/key_art.py art/enemies/phantom-green.jpg art/enemies/phantom.png 144
python tools/key_art.py art/enemies/jester-green.jpg art/enemies/jester.png 146
python tools/key_art.py art/enemies/twins-green.jpg art/enemies/twins.png 138
