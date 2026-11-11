"""Run after render: python verify.py --ffmpeg PATH. Requires Pillow; FFmpeg must include blackdetect/alphaextract."""
import argparse,json,subprocess
from pathlib import Path
from PIL import Image,ImageStat
p=argparse.ArgumentParser();p.add_argument('--ffmpeg',required=True);a=p.parse_args()
out=Path('../../temp/mg-video'); report={}
for sec in [16,40,65,90]:
 target=out/f'decoded-alpha-{sec}.png'
 subprocess.run([a.ffmpeg,'-y','-v','error','-ss',str(sec),'-i',str(out/'cantaloom-mg-alpha.mov'),'-frames:v','1',str(target)],check=True)
 im=Image.open(target).convert('RGBA');alpha=im.getchannel('A');hole=alpha.crop((100,165,1820,915));assert hole.getextrema()==(0,0),(sec,hole.getextrema());assert alpha.getpixel((20,20))==255
 report[str(sec)]={'window_alpha':hole.getextrema(),'outside_alpha':alpha.getpixel((20,20))}
probe=out/'preview-decode.log'
if probe.exists():
 log=probe.read_text(errors='replace');assert 'black_start:' not in log;report['preview_blackdetect']='No full black frames detected'
report['audio']='Silent; no supplied audio, no sync acceptance claim'
(out/'verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report,indent=2))
