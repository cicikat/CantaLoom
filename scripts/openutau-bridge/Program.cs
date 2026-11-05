using System.Collections.Concurrent;
using System.Diagnostics;
using System.Reflection;
using System.Text.Json;
using OpenUtau.Core;
using OpenUtau.Core.Ustx;
using OpenUtau.Core.Format;
using OpenUtau.Core.Util;
using OpenUtau.Core.DiffSinger;
using OpenUtau.Core.Render;

// Uses unmodified official OpenUtau assemblies. This adapter has no model code.
sealed class PumpScheduler : TaskScheduler {
 readonly ConcurrentQueue<Task> tasks=new();
 protected override IEnumerable<Task> GetScheduledTasks()=>tasks.ToArray();
 protected override void QueueTask(Task t)=>tasks.Enqueue(t);
 protected override bool TryExecuteTaskInline(Task t,bool queued)=>false;
 public void Pump(){while(tasks.TryDequeue(out var t))TryExecuteTask(t);}
}
static class Program {
 [STAThread] static int Main(string[] args){try{return Run(args);}catch(Exception e){Console.Error.WriteLine(e.ToString());return 1;}}
 static int Run(string[] args){
  if(args.Length<5)throw new ArgumentException("project.ustx output.wav singersRoot CPU|DirectML durationSeconds");
  System.Text.Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);
  var started=Stopwatch.StartNew();var scheduler=new PumpScheduler();
  var external=Directory.GetParent(Directory.GetParent(args[2]).FullName).FullName;
  typeof(PathManager).GetProperty("CachePath").SetValue(PathManager.Inst,Path.Combine(external,"runtime","cache","openutau",args[3],Path.GetFileNameWithoutExtension(args[1])));
  Directory.CreateDirectory(PathManager.Inst.CachePath);
  Preferences.Default.AdditionalSingerPath=args[2];Preferences.Default.OnnxRunner=args[3];
  if(args[3]=="DirectML"){var gpus=Onnx.getGpuInfo();Console.WriteLine("DEVICES "+string.Join(" | ",gpus));var nvidia=gpus.FirstOrDefault(g=>g.description.Contains("NVIDIA",StringComparison.OrdinalIgnoreCase));if(nvidia!=null)Preferences.Default.OnnxGpu=nvidia.deviceId;}
  Preferences.Default.DiffSingerSteps=20;Preferences.Default.DiffSingerDepth=.6;
  DocManager.Inst.PostOnUIThread=a=>Task.Factory.StartNew(a,CancellationToken.None,TaskCreationOptions.None,scheduler);
  DocManager.Inst.Initialize(Thread.CurrentThread,scheduler);SingerManager.Inst.Initialize();
  Console.WriteLine("SINGERS "+string.Join(" | ",SingerManager.Inst.Singers.Select(x=>x.Key)));
  var project=Ustx.Load(args[0]);DocManager.Inst.ExecuteCmd(new LoadProjectNotification(project));
  var parts=project.parts.OfType<UVoicePart>().ToArray();if(parts.Length==0)throw new Exception("No vocal parts");
  while(parts.Any(p=>!p.PhonemesUpToDate||p.renderPhrases.Count==0)){
   scheduler.Pump();Thread.Sleep(10);if(started.Elapsed.TotalSeconds>180)throw new Exception("Phonemization timed out; singer/phonemizer invalid");
  }
  var phrases=parts.SelectMany(p=>p.renderPhrases).ToArray();
  Console.WriteLine("PHONES "+string.Join(" ",parts.SelectMany(p=>p.phonemes).Select(p=>p.phoneme)));
  const int rate=44100;const double padding=.2;var origin=project.timeAxis.TickPosToMsPos(parts.Min(p=>p.position))/1000-padding;
  var seconds=double.Parse(args[4],System.Globalization.CultureInfo.InvariantCulture)+padding*2;
  var mix=new float[(int)Math.Ceiling(seconds*rate)];var renderer=new DiffSingerRenderer();var cancellation=new CancellationTokenSource();
  foreach(var phrase in phrases){var task=renderer.Render(phrase,new OpenUtau.Core.Render.Progress(phrases.Length),0,cancellation,false);while(!task.IsCompleted){scheduler.Pump();Thread.Sleep(10);}var result=task.GetAwaiter().GetResult();if(result.samples==null||result.samples.Length==0)throw new Exception("Renderer returned no samples");var offset=(int)Math.Round(((result.positionMs-result.leadingMs)/1000-origin)*rate);for(int i=0;i<result.samples.Length;i++){int j=offset+i;if(j>=0&&j<mix.Length)mix[j]+=result.samples[i];}}
  var rms=Math.Sqrt(mix.Select(x=>(double)x*x).Average());if(rms<.00001)throw new Exception("Rendered audio is silent");
  using(var writer=new BinaryWriter(File.Create(args[1]))){writer.Write(System.Text.Encoding.ASCII.GetBytes("RIFF"));writer.Write(36+mix.Length*2);writer.Write(System.Text.Encoding.ASCII.GetBytes("WAVEfmt "));writer.Write(16);writer.Write((short)1);writer.Write((short)1);writer.Write(rate);writer.Write(rate*2);writer.Write((short)2);writer.Write((short)16);writer.Write(System.Text.Encoding.ASCII.GetBytes("data"));writer.Write(mix.Length*2);foreach(var x in mix)writer.Write((short)(Math.Clamp(x,-1,1)*32767));}
  var report=new {engine="OpenUtau 0.1.576 / DiffSinger",provider=args[3],milliseconds=started.ElapsedMilliseconds,sampleRate=rate,durationSeconds=seconds,startSeconds=origin,rms,phrases=phrases.Length,phonemes=parts.SelectMany(p=>p.phonemes).Select(p=>p.phoneme).ToArray(),peakWorkingSetBytes=Process.GetCurrentProcess().PeakWorkingSet64};
  File.WriteAllText(args[1]+".json",JsonSerializer.Serialize(report,new JsonSerializerOptions{WriteIndented=true}));Console.WriteLine(JsonSerializer.Serialize(report));return 0;
 }
}
