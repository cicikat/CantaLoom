"""Offline PCM pitch estimates: diagnostic, not a listening-quality score."""
import json, wave, math
from pathlib import Path
import numpy as np
root=Path('D:/ai/hacson/external/runtime/exports/v03-p0')
report=json.loads((root/'report.json').read_text(encoding='utf-8'))
for case in report['reports']:
 with wave.open(str(root/(case['label']+'.wav'))) as f:
  rate=f.getframerate();pcm=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float)/32768
 measurements=[]
 for n in case['notes']:
  center=(n['beat']+n['duration']*.6)*60/report['bpm']-case['result']['startSeconds']
  start=max(0,int(center*rate)-4096);x=pcm[start:start+8192:4];sr=rate/4
  x=x-x.mean();acf=np.correlate(x,x,'full')[len(x)-1:];acf=acf/np.maximum(1,np.arange(len(x),0,-1))
  lo=int(sr/1000);hi=min(len(acf)-1,int(sr/90));peaks=[i for i in range(lo+1,hi) if acf[i]>acf[i-1] and acf[i]>=acf[i+1]]
  lag=max(peaks,key=lambda i:acf[i]) if peaks else lo
  hz=sr/lag;midi=69+12*math.log2(hz/440)
  measurements.append({'expectedMidi':n['midi'],'estimatedMidi':round(midi,2),'seconds':round(center,3),'noteDurationSeconds':n['duration']*60/report['bpm']})
 case['pitchMeasurements']=measurements
 case['durationStdBeats']=float(np.std([n['duration'] for n in case['notes']]))
 case['pitchCaveat']='Autocorrelation can octave-error on breath/consonants; not a subjective singing-quality score.'
(root/'analysis.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([{'label':c['label'],'durationStd':c['durationStdBeats'],'pitch':c['pitchMeasurements']} for c in report['reports']],ensure_ascii=False))
