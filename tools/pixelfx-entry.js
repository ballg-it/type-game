// Entry for the vendored pixelfx bundle (vendor/pixelfx.js). pixelfx is MIT, by Patch:
// https://github.com/patch-gg/pixelfx (built from commit 5294518). Rebuild with, from a pixelfx checkout:
//   esbuild <this file> --bundle --format=iife --minify --outfile=vendor/pixelfx.js
// after copying this file into the checkout's root (imports are relative to it).
// Exposes window.PFX: the frame/instance helpers plus only the effects the fight uses.
import { createFrame, clearFrame, createFx, composite } from "./src/core/index.js";
import * as swordSlash from "./src/fx/melee/sword-slash.js";
import * as hitSpark from "./src/fx/impacts/hit-spark.js";
import * as shieldBlock from "./src/fx/impacts/shield-block.js";
import * as spellCharge from "./src/fx/arcane/spell-charge.js";
import * as critHit from "./src/fx/impacts/crit-hit.js";
import * as impactFrame from "./src/fx/impacts/impact-frame.js";
import * as groundSlam from "./src/fx/impacts/ground-slam.js";

window.PFX = {
  createFrame, clearFrame, createFx, composite,
  fx: { swordSlash, hitSpark, shieldBlock, spellCharge, critHit, impactFrame, groundSlam },
};
