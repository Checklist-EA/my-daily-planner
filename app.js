'use strict';
const KEY='daily_planner_v1';const palette=['#1476d4','#15a46a','#e88b2c'];
const defaults={groups:['Cá nhân','Công việc','Gia đình'],tasks:[]};
const $=id=>document.getElementById(id);const pad=n=>String(n).padStart(2,'0');
function iso(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
let state=load(),view=new Date(),selected=iso(new Date());view.setDate(1);
function dateOf(s){let [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
function fmt(s){return dateOf(s).toLocaleDateString('vi-VN')}
function load(){try{let v=JSON.parse(localStorage.getItem(KEY));if(v&&Array.isArray(v.groups)&&Array.isArray(v.tasks))return {groups:[...defaults.groups.map((x,i)=>String(v.groups[i]||x))],tasks:v.tasks.filter(t=>t&&typeof t.id==='string'&&typeof t.title==='string'&&/^\d{4}-\d\d-\d\d$/.test(t.start)&&Number.isInteger(t.group)&&t.group>=0&&t.group<3)}}catch(e){}return structuredClone(defaults)}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){alert('Không thể lưu dữ liệu. Hãy xuất sao lưu và kiểm tra dung lượng thiết bị.')}}
function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function normalize(s){return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}
const lunarFmt=new Intl.DateTimeFormat('en-u-ca-chinese',{day:'numeric',month:'numeric',timeZone:'Asia/Ho_Chi_Minh'});
function lunar(d){try{let parts=lunarFmt.formatToParts(new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate(),12)));return {day:Number(parts.find(x=>x.type==='day')?.value),month:Number((parts.find(x=>x.type==='month')?.value||'').match(/\d+/)?.[0])}}catch(e){return {day:0,month:0}}}
function displayDate(t){return t.end||t.start}
function forDay(s,g){return state.tasks.filter(t=>displayDate(t)===s&&(g===undefined||t.group===g))}
function render(){
 $('month').textContent=`Tháng ${view.getMonth()+1}, ${view.getFullYear()}`;
 let first=new Date(view.getFullYear(),view.getMonth(),1),offset=(first.getDay()+6)%7,start=new Date(first);start.setDate(1-offset);
 let total=42; // luôn 6 tuần, tránh nhảy chiều cao khi chuyển tháng
 let html='';
 for(let i=0;i<total;i++){
  let d=new Date(start);d.setDate(start.getDate()+i);
  let day=iso(d),l=lunar(d),inMonth=d.getMonth()===view.getMonth();
  let isRed=d.getDay()===0||l.day===1||l.day===15||(l.month===1&&l.day>=1&&l.day<=3);
  let bars='';
  for(let g=0;g<3;g++){
   let tasks=forDay(day,g);
   if(tasks.length){let left=tasks.filter(t=>!t.done).length;
    bars+=`<button class="taskBar ${left?'':'allDone'}" style="--group-color:${palette[g]}" data-day="${day}" data-group="${g}" aria-label="${escapeHTML(state.groups[g])}: ${left} việc chưa hoàn thành"><span class="taskBarValue">${left||'✓'}</span></button>`;
   }else bars+='<span class="taskBar placeholder" aria-hidden="true"></span>';
  }
  html+=`<div class="day ${inMonth?'':'out'} ${day===iso(new Date())?'current':''}" data-date="${day}"><div class="dateRow"><span class="solar ${d.getDay()===0?'red':''}">${d.getDate()}</span><span class="lunar ${isRed?'red':''}">${l.day===1?`${l.day}/${l.month}`:l.day||''}</span></div><div class="taskBars">${bars}</div></div>`;
 }
 $('calendar').innerHTML=html;
 let n=state.tasks.filter(t=>!t.done&&t.end&&t.end<=iso(new Date())).length;
 $('pendingCount').textContent=n?`(${n})`:'';
}

function open(title,html){$('sheetTitle').textContent=title;$('sheetBody').innerHTML=html;$('overlay').classList.remove('hidden')}
function close(){$('overlay').classList.add('hidden');render()}
function groupList(s,g){selected=s;let arr=forDay(s,g).sort((a,b)=>a.created.localeCompare(b.created));let done=arr.filter(t=>t.done).length;open(`${state.groups[g]} · ${fmt(s)}`,`<div class="muted">Hoàn thành ${done}/${arr.length}</div><div class="progress"><div style="width:${arr.length?done/arr.length*100:0}%"></div></div>${arr.map(taskRow).join('')||'<div class="empty">Chưa có công việc</div>'}<div class="actions"><button class="primary" data-action="new" data-group="${g}" data-day="${s}">＋ Thêm nhanh</button><button class="soft" data-action="day" data-day="${s}">Cả ngày</button></div>`)}
function taskRow(t){return `<div class="row"><input type="checkbox" data-action="check" data-id="${escapeHTML(t.id)}" ${t.done?'checked':''} aria-label="Hoàn thành"><div class="grow" data-action="edit" data-id="${escapeHTML(t.id)}" style="${t.done?'opacity:.65':''}"><div>${escapeHTML(t.title)}</div><small>${t.end?'Hạn '+fmt(t.end)+' · ':''}Ghi ngày ${fmt(t.start)}${t.doneAt?' · Xong '+new Date(t.doneAt).toLocaleString('vi-VN'):''}</small></div><button data-action="edit" data-id="${escapeHTML(t.id)}">Sửa</button></div>`}
function dayList(s){selected=s;open(`Ngày ${fmt(s)}`,state.groups.map((g,i)=>{let a=forDay(s,i),left=a.filter(t=>!t.done).length;return `<div class="row"><span class="bubble" style="background:${palette[i]}">${left||'✓'}</span><div class="grow"><b>${escapeHTML(g)}</b><small>${a.length} công việc · ${left} chưa xong</small></div><button data-action="group" data-day="${s}" data-group="${i}">Xem</button><button data-action="new" data-day="${s}" data-group="${i}">＋</button></div>`}).join(''))}
function form(id=null,g=0,s=selected){
 let t=state.tasks.find(x=>x.id===id),v=t||{title:'',note:'',start:s,end:'',group:g,repeat:'none'};
 open(t?'Chỉnh sửa công việc':'Thêm công việc',`<form id="taskForm"><label class="field">Nội dung công việc<input name="title" id="taskTitle" required maxlength="300" placeholder="Nhập hoặc dùng micro trên bàn phím" value="${escapeHTML(v.title)}"></label><label class="field">Nhóm<select name="group">${state.groups.map((x,i)=>`<option value="${i}" ${v.group===i?'selected':''}>${escapeHTML(x)}</option>`).join('')}</select></label><div class="dateFields"><label class="field">Ngày ghi nhận<input type="date" name="start" required value="${v.start}"></label><label class="field">Ngày kết thúc<input type="date" name="end" value="${v.end||''}"></label></div><details class="extraOptions" ${v.note?'open':''}><summary>Ghi chú chi tiết (tùy chọn)</summary><label class="field"><textarea name="note" placeholder="Không bắt buộc">${escapeHTML(v.note||'')}</textarea></label></details><div class="actions formActions"><button class="primary" type="submit">Lưu công việc</button>${t?'<button class="soft danger" type="button" id="deleteTask">Xóa</button>':''}</div></form>`);
 // Không tự bật bàn phím khi mở bảng: tránh Safari tự cuộn/zoom ngoài ý muốn.
 $('taskForm').onsubmit=e=>{e.preventDefault();let f=new FormData(e.target),start=String(f.get('start')),end=String(f.get('end'));if(end&&end<start){alert('Ngày kết thúc không được trước ngày ghi nhận.');return}let data={title:String(f.get('title')).trim(),group:Number(f.get('group')),start,end,note:String(f.get('note')).trim()};if(!data.title)return;if(t)Object.assign(t,data);else state.tasks.push({id:crypto.randomUUID(),...data,done:false,created:new Date().toISOString(),doneAt:null});save();groupList(displayDate(t||state.tasks.at(-1)),data.group)};
 if(t)$('deleteTask').onclick=()=>{if(confirm('Xóa công việc này?')){state.tasks=state.tasks.filter(x=>x.id!==t.id);save();dayList(selected)}}
}

function search(){open('Tìm kiếm công việc',`<label class="field">Từ khóa<input id="query" placeholder="Ví dụ: khach hang" autocomplete="off"></label><label class="field">Trạng thái<select id="status"><option value="all">Tất cả</option><option value="open">Chưa hoàn thành</option><option value="done">Đã hoàn thành</option></select></label><div id="results"></div>`);let run=()=>{let q=normalize($('query').value.trim()),status=$('status').value,a=state.tasks.filter(t=>(!q||normalize(t.title+' '+(t.note||'')).includes(q))&&(status==='all'||(status==='done')===!!t.done)).sort((a,b)=>displayDate(b).localeCompare(displayDate(a)));$('results').innerHTML=`<p class="muted">${a.length} kết quả</p>`+a.slice(0,300).map(t=>`<div class="row"><span class="bubble" style="background:${palette[t.group]}">${t.done?'✓':'·'}</span><div class="grow" data-action="edit" data-id="${escapeHTML(t.id)}">${escapeHTML(t.title)}<small>${fmt(displayDate(t))} · ${escapeHTML(state.groups[t.group])}</small></div><button data-action="edit" data-id="${escapeHTML(t.id)}">Xem</button></div>`).join('')};$('query').oninput=run;$('status').onchange=run;run();$('query').focus()}
function pending(){let today=iso(new Date()),a=state.tasks.filter(t=>!t.done).sort((x,y)=>displayDate(x).localeCompare(displayDate(y)));open('Việc đang chờ',`<p class="muted">${a.length} công việc chưa hoàn thành · ${a.filter(t=>t.end&&t.end<today).length} quá hạn</p>${a.map(t=>`<div class="row"><span class="bubble" style="background:${palette[t.group]}">·</span><div class="grow" data-action="edit" data-id="${escapeHTML(t.id)}">${escapeHTML(t.title)}<small class="${t.end&&t.end<today?'danger':''}">${t.end?'Hạn '+fmt(t.end):'Ghi '+fmt(t.start)} · ${escapeHTML(state.groups[t.group])}</small></div><button data-action="edit" data-id="${escapeHTML(t.id)}">Xem</button></div>`).join('')||'<div class="empty">Không có việc đang chờ</div>'}`)}
function download(name,content,type){let a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function settings(){open('Cài đặt & sao lưu',`<p class="muted">Đổi tên 3 nhóm công việc</p>${state.groups.map((x,i)=>`<label class="field"><span style="color:${palette[i]}">●</span> Nhóm ${i+1}<input id="groupName${i}" maxlength="40" value="${escapeHTML(x)}"></label>`).join('')}<div class="actions"><button class="primary" id="saveGroups">Lưu tên nhóm</button></div><hr><div class="actions"><button class="soft" id="backup">Xuất sao lưu JSON</button><button class="soft" id="restore">Khôi phục JSON</button><button class="soft" id="report">Xuất báo cáo CSV</button></div><p class="muted">Dữ liệu lưu trên thiết bị này. Hãy sao lưu định kỳ vào iCloud Drive. Khôi phục sẽ thay thế dữ liệu hiện tại.</p>`);$('saveGroups').onclick=()=>{state.groups=state.groups.map((x,i)=>$('groupName'+i).value.trim()||x);save();settings()};$('backup').onclick=()=>download(`lich-cong-viec-${iso(new Date())}.json`,JSON.stringify({app:'daily-planner',version:1,exported:new Date().toISOString(),data:state},null,2),'application/json');$('restore').onclick=()=>$('importFile').click();$('report').onclick=()=>{let rows=[['Ngày ghi nhận','Ngày kết thúc','Nhóm','Công việc','Hoàn thành','Ghi chú'],...state.tasks.map(t=>[t.start,t.end||'',state.groups[t.group],t.title,t.done?'Có':'Không',t.note||''])];let csv='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');download(`bao-cao-${iso(new Date())}.csv`,csv,'text/csv;charset=utf-8')}}
$('importFile').onchange=async e=>{let file=e.target.files[0];if(!file)return;try{let obj=JSON.parse(await file.text());if(obj.app!=='daily-planner'||obj.version!==1||!Array.isArray(obj.data?.groups)||obj.data.groups.length!==3||!Array.isArray(obj.data?.tasks)||obj.data.tasks.some(t=>typeof t.id!=='string'||typeof t.title!=='string'||!/^\d{4}-\d\d-\d\d$/.test(t.start)||!Number.isInteger(t.group)||t.group<0||t.group>2))throw Error('File không hợp lệ');if(confirm(`Khôi phục ${obj.data.tasks.length} công việc? Dữ liệu hiện tại sẽ bị thay thế.`)){state={groups:obj.data.groups.map(String),tasks:obj.data.tasks};save();close();alert('Đã khôi phục dữ liệu')}}catch(err){alert('Không thể đọc file sao lưu hợp lệ.')}e.target.value=''};
$('calendar').onclick=e=>{let dot=e.target.closest('button[data-group]');if(dot){groupList(dot.dataset.day,Number(dot.dataset.group));return}let day=e.target.closest('[data-date]');if(day)dayList(day.dataset.date)};
$('sheetBody').addEventListener('click',e=>{let el=e.target.closest('[data-action]');if(!el)return;let {action,id,day,group}=el.dataset;if(action==='group')groupList(day,Number(group));if(action==='day')dayList(day);if(action==='new')form(null,Number(group),day);if(action==='edit')form(id)});
$('sheetBody').addEventListener('change',e=>{if(e.target.dataset.action==='check'){let t=state.tasks.find(t=>t.id===e.target.dataset.id);if(t){t.done=e.target.checked;t.doneAt=t.done?new Date().toISOString():null;save();let parent=e.target.closest('.row');parent.querySelector('.grow').style.opacity=t.done?'.65':'1';render()}}});
$('prev').onclick=()=>{view.setMonth(view.getMonth()-1);render()};$('next').onclick=()=>{view.setMonth(view.getMonth()+1);render()};$('today').onclick=()=>{view=new Date();view.setDate(1);render()};$('add').onclick=()=>form(null,0,selected);$('search').onclick=search;$('settings').onclick=settings;$('pending').onclick=pending;$('close').onclick=close;$('overlay').onclick=e=>{if(e.target===$('overlay'))close()};if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});render();

// V1.2: tính chiều cao vùng lịch theo phần không gian thực tế trên iPhone.
function fitCalendar(){
 const cal=$('calendar');if(!cal)return;
 const top=cal.getBoundingClientRect().top;
 const nav=document.querySelector('nav');
 const bottom=nav?nav.getBoundingClientRect().top:window.innerHeight;
 const available=Math.floor(bottom-top-3);
 cal.style.setProperty('--calendar-height',Math.max(330,available)+'px');
}
window.addEventListener('resize',fitCalendar);
window.addEventListener('orientationchange',()=>setTimeout(fitCalendar,150));
requestAnimationFrame(fitCalendar);
// Chỉ nhận vuốt bắt đầu trong lịch; vuốt dọc vẫn cuộn bình thường.
let swipeStart=null,ignoreClickUntil=0;
const calEl=$('calendar');
calEl.addEventListener('touchstart',e=>{
 if(e.touches.length!==1){swipeStart=null;return}
 const t=e.touches[0];swipeStart={x:t.clientX,y:t.clientY};
},{passive:true});
calEl.addEventListener('touchend',e=>{
 if(!swipeStart||e.changedTouches.length!==1)return;
 const t=e.changedTouches[0],dx=t.clientX-swipeStart.x,dy=t.clientY-swipeStart.y;
 swipeStart=null;
 if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4){
  ignoreClickUntil=Date.now()+400;
  view.setDate(1);view.setMonth(view.getMonth()+(dx<0?1:-1));
  render();requestAnimationFrame(fitCalendar);
 }
},{passive:true});
calEl.addEventListener('touchcancel',()=>swipeStart=null,{passive:true});
calEl.addEventListener('click',e=>{if(Date.now()<ignoreClickUntil){e.stopImmediatePropagation();e.preventDefault()}},true);
