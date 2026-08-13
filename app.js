import { firebaseConfig } from "./firebase-config.js";

// 第一版採示範資料，firebaseConfig 先保留供下一階段接上 Authentication 與 Firestore。
void firebaseConfig;

const categoryTargets = { "校必修": 30, "院必修": 18, "專業必修": 47, "專業選修": 33, "分類通識": 12 };
const termNames = { "1-1":"一年級上學期","1-2":"一年級下學期","2-1":"二年級上學期","2-2":"二年級下學期","3-1":"三年級上學期","3-2":"三年級下學期","4-1":"四年級上學期","4-2":"四年級下學期" };

const demoStudent = {
  id:"B11500001", name:"王小明", department:"旅館管理與廚藝創意系", program:"日間部四技", admissionYear:"115",
  courses:[
    {id:"GE101",name:"分類通識-音樂好好聽(藝術領域)",credits:2,category:"分類通識",term:"1-1",status:"done"},
    {id:"PE101",name:"體育(一)",credits:2,category:"校必修",term:"1-1",status:"done"},
    {id:"CH101",name:"應用中文(一)",credits:2,category:"校必修",term:"1-1",status:"done"},
    {id:"EN101",name:"應用英文(一)",credits:2,category:"校必修",term:"1-1",status:"failed",attemptTerm:"115-1"},
    {id:"CS101",name:"程式設計概論",credits:2,category:"院必修",term:"1-1",status:"missing"},
    {id:"HC101",name:"旅館事業概論",credits:2,category:"專業必修",term:"1-1",status:"done"},
    {id:"HC102",name:"餐旅安全與法規",credits:2,category:"專業必修",term:"1-1",status:"done"},
    {id:"HC103",name:"餐飲廚藝概論",credits:2,category:"專業必修",term:"1-1",status:"done"},
    {id:"HC104",name:"餐旅美學",credits:2,category:"專業選修",term:"1-1",status:"done"},
    {id:"TO101",name:"觀光產業概論",credits:2,category:"專業選修",term:"1-1",status:"done"},
    {id:"GE102",name:"分類通識-創意邏輯動動手(自然領域)",credits:2,category:"分類通識",term:"1-2",status:"done"},
    {id:"PE102",name:"體育(二)",credits:2,category:"校必修",term:"1-2",status:"missing"},
    {id:"CH102",name:"應用中文(二)",credits:2,category:"校必修",term:"1-2",status:"missing"},
    {id:"EN102",name:"應用英文(二)",credits:2,category:"校必修",term:"1-2",status:"missing"},
    {id:"AI101",name:"人工智慧概論",credits:2,category:"院必修",term:"1-2",status:"missing"},
    {id:"HC110",name:"房務管理",credits:2,category:"專業必修",term:"1-2",status:"missing"},
    {id:"HC111",name:"房務模擬實務",credits:2,category:"專業必修",term:"1-2",status:"missing"},
    {id:"X001",name:"國際禮儀",credits:2,category:null,term:"2-1",status:"unmatched",passed:true},
    {id:"X002",name:"投資理財實務",credits:2,category:null,term:"2-1",status:"unmatched",passed:true}
  ]
};

let currentRole="student", activeTab="timeline", selectedUnmatched=null;
const views=[...document.querySelectorAll(".view")];
function showView(id){views.forEach(v=>v.classList.toggle("hidden",v.id!==id));window.scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll("[data-back]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.back)));
document.querySelector("#studentEntry").onclick=()=>showView("queryView");
document.querySelector("#teacherEntry").onclick=()=>{renderStudentList();showView("teacherView")};
document.querySelector("#addStudentBtn").onclick=()=>alert("第一版先確認檢核畫面；下一版再接上新增學生與 Firebase 儲存。");

document.querySelector("#queryForm").addEventListener("submit",e=>{
  e.preventDefault();
  const ok=document.querySelector("#queryName").value.trim()===demoStudent.name&&document.querySelector("#queryStudentId").value.trim().toUpperCase()===demoStudent.id;
  document.querySelector("#queryError").textContent=ok?"":"查無資料，請確認姓名及學號。";
  if(ok)openStudent("student");
});

function renderStudentList(){
  document.querySelector("#studentList").innerHTML=`<article class="student-row"><div><h3>${demoStudent.name}</h3><p>${demoStudent.id}｜${demoStudent.department}｜${demoStudent.admissionYear}學年度入學</p></div><button class="primary" id="openDemo">查看學分</button></article>`;
  document.querySelector("#openDemo").onclick=()=>openStudent("teacher");
}

function openStudent(role){
  currentRole=role; activeTab="timeline";
  document.querySelectorAll(".teacher-only").forEach(el=>el.classList.toggle("hidden",role!=="teacher"));
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.tab==="timeline"));
  document.querySelector("#termFilter").value="all";
  document.querySelector("#detailBack").onclick=()=>showView(role==="teacher"?"teacherView":"queryView");
  renderDetail();showView("detailView");
}

function earnedCredits(){
  const totals=Object.fromEntries(Object.keys(categoryTargets).map(k=>[k,0]));
  demoStudent.courses.filter(c=>c.status==="done"||(c.status==="classified"&&c.passed)).forEach(c=>{if(c.category in totals)totals[c.category]+=c.credits});
  return totals;
}

function renderDetail(){
  const totals=earnedCredits(), total=Object.values(totals).reduce((a,b)=>a+b,0);
  document.querySelector("#studentHeader").innerHTML=`<div><h2>${demoStudent.name}</h2><p>${demoStudent.id}｜${demoStudent.department}｜${demoStudent.program}｜${demoStudent.admissionYear}學年度入學</p></div><div class="progress-total"><span>目前已取得</span><strong>${total} 學分</strong></div>`;
  document.querySelector("#creditSummary").innerHTML=Object.entries(categoryTargets).map(([name,target])=>{const got=totals[name]||0,p=Math.min(100,Math.round(got/target*100));return `<article class="credit-card"><h3>${name}</h3><div class="credit-numbers"><strong>${got}</strong><span>／${target} 學分</span></div><div class="meter"><span style="width:${p}%"></span></div></article>`}).join("");
  renderCourses();
}

document.querySelector("#detailTabs").addEventListener("click",e=>{const tab=e.target.closest("[data-tab]");if(!tab)return;activeTab=tab.dataset.tab;document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t===tab));document.querySelector("#termFilter").closest("label").classList.toggle("hidden",activeTab==="unmatched");renderCourses()});
document.querySelector("#termFilter").onchange=renderCourses;

function statusInfo(c){
  if(c.status==="done"||c.status==="classified")return ["done","已完成",c.status==="classified"?`人工認列為${c.category}`:""];
  if(c.status==="failed")return ["failed","尚未完成",`曾於${c.attemptTerm}修習，但未通過`];
  if(c.status==="unmatched")return ["pending","待人工分類","時序表內找不到此課程"];
  return ["missing","尚未修習",""];
}

function renderCourses(){
  let list=demoStudent.courses,filter=document.querySelector("#termFilter").value;
  if(activeTab==="missing")list=list.filter(c=>["missing","failed"].includes(c.status));
  if(activeTab==="unmatched")list=list.filter(c=>c.status==="unmatched");
  else if(filter!=="all")list=list.filter(c=>c.term===filter);
  const content=document.querySelector("#courseContent");
  if(!list.length){content.innerHTML=`<div class="empty">目前沒有符合條件的課程。</div>`;return}
  const groups=activeTab==="unmatched"?{"待人工分類":list}:Object.groupBy?Object.groupBy(list,c=>c.term):list.reduce((o,c)=>((o[c.term]??=[]).push(c),o),{});
  content.innerHTML=Object.entries(groups).sort(([a],[b])=>a.localeCompare(b)).map(([term,courses])=>`<section class="term-section"><h3>${termNames[term]||term}</h3><table class="course-table"><thead><tr><th>課程名稱</th><th>學分類別</th><th>學分</th><th>修課狀態</th>${currentRole==="teacher"&&activeTab==="unmatched"?"<th>操作</th>":""}</tr></thead><tbody>${courses.map(c=>{const [klass,label,note]=statusInfo(c);return `<tr><td data-label="課程">${c.name}</td><td data-label="類別">${c.category||"尚未分類"}</td><td data-label="學分">${c.credits}</td><td data-label="狀態"><span class="status ${klass}">${label}</span>${note?`<div class="course-note">${note}</div>`:""}</td>${currentRole==="teacher"&&activeTab==="unmatched"?`<td data-label="操作"><button class="action-link classify" data-id="${c.id}">人工認列</button></td>`:""}</tr>`}).join("")}</tbody></table></section>`).join("");
  document.querySelectorAll(".classify").forEach(btn=>btn.onclick=()=>openClassify(btn.dataset.id));
}

function openClassify(id){selectedUnmatched=demoStudent.courses.find(c=>c.id===id);document.querySelector("#classifyCourseName").textContent=`${selectedUnmatched.name}（${selectedUnmatched.credits}學分）`;document.querySelector("#classifyDialog").showModal()}
document.querySelector("#saveClassification").addEventListener("click",e=>{
  if(!selectedUnmatched)return;
  const type=document.querySelector("#classificationType").value;
  if(type==="excluded"){selectedUnmatched.status="excluded";selectedUnmatched.category=null}else{selectedUnmatched.status="classified";selectedUnmatched.category=document.querySelector("#classificationCategory").value}
  selectedUnmatched.note=document.querySelector("#classificationNote").value.trim();
  setTimeout(()=>{renderDetail();activeTab="unmatched";document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.tab==="unmatched"));renderCourses()},0);
});
