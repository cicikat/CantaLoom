export const FPS=30;
export const palette={purple:'#5929E8',yellow:'#F9E44D',pink:'#FF78BE',orange:'#FF752B',white:'#F5F1FF',ink:'#181426'};
export const slots=[
 {id:'input',start:8,end:24,title:'让灵感开口',detail:'输入需求 · 启动创作',file:null,trim:0},
 {id:'edit',start:30,end:50,title:'把音乐，变成你的',detail:'歌词 · 旋律 · 音符编辑',file:null,trim:0},
 {id:'voice',start:57,end:75,title:'听见虚拟歌姬',detail:'歌声合成 · 音频试听',file:null,trim:0},
 {id:'pv',start:82,end:96,title:'让作品发光',detail:'最终音乐 / PV 成品',file:null,trim:0}
];
export const shots=[{id:'opening',start:0,end:8},{id:'ingredients',start:24,end:30},{id:'singing',start:50,end:57},{id:'showcase',start:75,end:82},{id:'ending',start:96,end:102}];
export const audio={file:null,volume:0.8,bpm:120}; // No fabricated music: silent until a licensed track is supplied.
export const typography={family:'Microsoft YaHei, sans-serif',latin:'Arial, Microsoft YaHei, sans-serif'};
export const motion={transition:1.15,overshoot:1.12};
