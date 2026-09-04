const plan=[
{day:'Lunes',title:'Empuje',items:[['Bench press','5×3–5','60 kg'],['Press inclinado mancuernas','3×8–10','22.5 kg c/u'],['Press militar mancuernas','4×5–6','20 kg c/u'],['Tríceps en polea','3×10–15','RIR 1–2']]},
{day:'Martes',title:'Pierna + pie',items:[['Sentadilla','5×3–5','45 kg'],['RDL','4×6–8','50 kg'],['Pantorrilla','4×8–12','RIR 2'],['Tibial anterior + pie','3×12–20','Controlado']]},
{day:'Miércoles',title:'Tirón',items:[['Jalón / dominadas','4×6–8','65–70 kg'],['Remo','4×6–8','45 kg'],['Curl bíceps','3×8–12','RIR 1–2'],['Face pull','3×12–15','Controlado']]},
{day:'Jueves',title:'Posterior + core',items:[['Hip thrust','4×6–8','RIR 2'],['Extensión lumbar','3×10–15','Controlado'],['Plancha + bird dog','3 rondas','30–45 s'],['Cuello: flex/ext/lateral','2×12–15','Suave']]},
{day:'Viernes',title:'Full body',items:[['Prensa / sentadilla ligera','3×8–10','RIR 2'],['Press mancuernas','3×8–12','RIR 2'],['Remo/polea','3×8–12','RIR 2'],['Curl + tríceps','3×10–15','RIR 1–2']]}
];
const $=s=>document.querySelector(s);const $$=s=>document.querySelectorAll(s);
let state=JSON.parse(localStorage.getItem('forgefit')||'{"week":1,"done":{},"logs":[]}');
function save(){localStorage.setItem('forgefit',JSON.stringify(state));render()}
function render(){
 $('#currentWeek').textContent=state.week;$('#logWeek').value=state.week;
 const day=plan[(new Date().getDay()+6)%7]||plan[0];$('#todayTitle').textContent=`${day.day} · ${day.title}`;
 $('#todayExercises').innerHTML=day.items.map((x,i)=>`<div class="exercise"><div><h3>${x[0]}</h3><p>${x[1]} · ${x[2]}</p></div><span class="load">${x[2]}</span><input class="done" type="checkbox" data-done="${state.week}-${day.day}-${i}" ${state.done[`${state.week}-${day.day}-${i}`]?'checked':''}></div>`).join('');
 $$('.done').forEach(c=>c.onchange=e=>{state.done[e.target.dataset.done]=e.target.checked;save()});
 $('#weekPlan').innerHTML=plan.map(d=>`<div class="day-card"><span class="eyebrow">${d.day.toUpperCase()}</span><h3>${d.title}</h3><p>${d.items.length} bloques · fuerza + accesorios</p></div>`).join('');
 const total=plan.length*4, completed=Object.values(state.done).filter(Boolean).length;const pct=Math.min(100,Math.round(completed/total*100));$('#progressBar').style.width=pct+'%';$('#progressText').textContent=pct+'%';
 $('#logTable').innerHTML=state.logs.length?`<table><thead><tr><th>Semana</th><th>Peso</th><th>Banca</th><th>Sentadilla</th><th>Sueño</th><th>Energía</th></tr></thead><tbody>${state.logs.map(l=>`<tr><td>${l.week}</td><td>${l.weight} kg</td><td>${l.bench} kg</td><td>${l.squat} kg</td><td>${l.sleep}/5</td><td>${l.energy}/5</td></tr>`).join('')}</tbody></table>`:'<p class="muted">Aún no hay registros. Guarda tu primera medición.</p>';
 const prs=[['Bench press','80 kg'],['Sentadilla','60 kg'],['RDL','50 kg'],['Press militar','20 kg c/u'],['Jalón','70 kg'],['Remo','45 kg']];$('#prGrid').innerHTML=prs.map(p=>`<div class="card pr-card"><span>${p[0]}</span><strong>${p[1]}</strong><small>PR / referencia</small></div>`).join('');
}
$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('active'));$$('.tab-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#'+b.dataset.tab).classList.add('active')});
$('#advanceWeek').onclick=()=>{if(state.week<8){state.week++;save()}else alert('Programa completado. Puedes iniciar otro ciclo.')};
$('#logForm').onsubmit=e=>{e.preventDefault();state.logs.unshift({week:+$('#logWeek').value,weight:+$('#logWeight').value,bench:+$('#logBench').value,squat:+$('#logSquat').value,sleep:+$('#logSleep').value,energy:+$('#logEnergy').value});e.target.reset();save()};
render();
