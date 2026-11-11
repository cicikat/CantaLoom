"""python verify-v2.py --ffmpeg PATH. Requires Pillow; rendered V2 files must exist."""
import argparse,json,subprocess,re
from pathlib import Path
from PIL import Image,ImageDraw
p=argparse.ArgumentParser();p.add_argument('--ffmpeg',required=True);a=p.parse_args();out=Path('../../temp/mg-video-v2');report={}
for sec in [7,7.7,16,29.3,40,56.4,65,90]:
 f=out/f'decoded-alpha-{sec}.png';subprocess.run([a.ffmpeg,'-v','error','-y','-ss',str(sec),'-i',str(out/'cantaloom-mg-v2-alpha.mov'),'-frames:v','1',str(f)],check=True)
 im=Image.open(f).convert('RGBA');alpha=im.getchannel('A');assert alpha.getpixel((960,540))==0,sec
 if sec in [16,40,65,90]:assert alpha.crop((110,170,1810,910)).getextrema()==(0,0)
 report[str(sec)]={'centerAlpha':alpha.getpixel((960,540)),'extrema':alpha.getextrema()}
for name in ['cantaloom-mg-v2-preview.mp4','PilotOpeningV2.mp4','PilotScreenV2.mp4']:
 r=subprocess.run([a.ffmpeg,'-v','info','-i',str(out/name),'-vf','blackdetect=d=0.03:pix_th=0.02,signalstats,metadata=print:file='+(out/(name+'.stats.txt')).as_posix(),'-an','-f','null','-'],capture_output=True);(out/(name+'.decode.log')).write_bytes(r.stderr);assert r.returncode==0;assert b'black_start:' not in r.stderr
 stats=(out/(name+'.stats.txt')).read_text();ys=[float(v) for v in re.findall(r'lavfi.signalstats.YAVG=([\d.]+)',stats)];assert max(ys)<235;report[name]={'decoded':True,'blackFrames':False,'maximumAverageLuma':max(ys),'minimumAverageLuma':min(ys)}
fs=sorted(out.glob('PreviewV2-*.png'),key=lambda f:float(f.stem.split('-')[-1]));sheet=Image.new('RGB',(1440,((len(fs)+2)//3)*290),'#181426');draw=ImageDraw.Draw(sheet)
for i,f in enumerate(fs):sheet.paste(Image.open(f).resize((474,267)),((i%3)*480,(i//3)*290));draw.text(((i%3)*480,(i//3)*290+270),f.stem,fill='white')
sheet.save(out/'contact-v2.jpg');(out/'verification-v2.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
