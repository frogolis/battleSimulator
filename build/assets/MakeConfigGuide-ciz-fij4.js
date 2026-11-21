import{j as e}from"./vendor-radix-B0MB3f57.js";import{C as d,a as n,b as x,h,c as m}from"./index-aFgzO-bf.js";import{T as j,a as o,b as c,c as r}from"./tabs-Dz1sf70U.js";import{A as a,b as i,a as t}from"./alert-By8GAPCY.js";import{B as s}from"./badge-BOYDyXGP.js";import{Z as p,a8 as N,a9 as v,a7 as l,k as u}from"./vendor-icons-DyzQUeJW.js";import"./vendor-charts-Cdgfu-b9.js";import"./vendor-react-D3F3s8fL.js";function T(){return e.jsxs("div",{className:"space-y-6",children:[e.jsxs(d,{children:[e.jsxs(n,{children:[e.jsxs(x,{className:"flex items-center gap-2",children:[e.jsx(p,{className:"w-5 h-5 text-purple-600"}),"Make(Integromat) 시나리오 구성"]}),e.jsx(h,{children:"구글 시트 → Figma Variables API 동기화"})]}),e.jsxs(m,{className:"space-y-6",children:[e.jsxs(a,{children:[e.jsx(N,{className:"w-4 h-4"}),e.jsx(i,{children:"목표"}),e.jsx(t,{children:"시트 값 변경 감지 → Figma 변수로 자동 반영하여 실시간 프로토타입 업데이트"})]}),e.jsxs(j,{defaultValue:"workflow",children:[e.jsxs(o,{className:"grid w-full grid-cols-3",children:[e.jsx(c,{value:"workflow",children:"워크플로우"}),e.jsx(c,{value:"api",children:"API 요청"}),e.jsx(c,{value:"figma",children:"Figma 설정"})]}),e.jsx(r,{value:"workflow",className:"space-y-4",children:e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200",children:[e.jsx("div",{className:"w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center flex-shrink-0",children:"1"}),e.jsxs("div",{className:"flex-1 space-y-2",children:[e.jsx("h4",{className:"text-green-900",children:"Google Sheets - Watch Rows"}),e.jsx("p",{className:"text-sm text-green-700",children:"시트의 행 변경/추가를 감지합니다."}),e.jsxs("div",{className:"bg-white p-3 rounded text-xs font-mono",children:[e.jsxs("div",{children:["Spreadsheet ID: ",e.jsx("span",{className:"text-blue-600",children:"YOUR_SHEET_ID"})]}),e.jsxs("div",{children:["Sheet Name: ",e.jsx("span",{className:"text-blue-600",children:"Dataset"})]}),e.jsxs("div",{children:["Trigger: ",e.jsx("span",{className:"text-blue-600",children:"On Update"})]})]})]})]}),e.jsxs("div",{className:"flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200",children:[e.jsx("div",{className:"w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0",children:"2"}),e.jsxs("div",{className:"flex-1 space-y-2",children:[e.jsx("h4",{className:"text-blue-900",children:"Iterator (선택사항)"}),e.jsx("p",{className:"text-sm text-blue-700",children:"여러 행이 동시에 변경된 경우, 한 건씩 처리합니다."}),e.jsx("div",{className:"bg-white p-3 rounded text-xs font-mono",children:e.jsxs("div",{children:["Array: ",e.jsx("span",{className:"text-blue-600",children:"{{1.values}}"})]})})]})]}),e.jsxs("div",{className:"flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200",children:[e.jsx("div",{className:"w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0",children:"3"}),e.jsxs("div",{className:"flex-1 space-y-2",children:[e.jsx("h4",{className:"text-purple-900",children:"HTTP - Figma Variables API"}),e.jsx("p",{className:"text-sm text-purple-700",children:"Figma 변수를 업데이트합니다. (아래 API 탭 참고)"}),e.jsxs("div",{className:"bg-white p-3 rounded text-xs font-mono space-y-1",children:[e.jsxs("div",{children:["Method: ",e.jsx(s,{children:"POST"})]}),e.jsxs("div",{children:["URL:"," ",e.jsx("span",{className:"text-purple-600",children:"https://api.figma.com/v1/files/FILE_KEY/variables"})]}),e.jsxs("div",{children:["Header: ",e.jsx("span",{className:"text-purple-600",children:"X-Figma-Token: YOUR_TOKEN"})]})]})]})]}),e.jsxs("div",{className:"flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200",children:[e.jsx("div",{className:"w-8 h-8 rounded-full bg-yellow-600 text-white flex items-center justify-center flex-shrink-0",children:"4"}),e.jsxs("div",{className:"flex-1 space-y-2",children:[e.jsx("h4",{className:"text-yellow-900",children:"Sleep (Rate Limit 방지)"}),e.jsx("p",{className:"text-sm text-yellow-700",children:"API 호출 간격 조절 (200-500ms 권장)"}),e.jsx("div",{className:"bg-white p-3 rounded text-xs font-mono",children:e.jsxs("div",{children:["Delay: ",e.jsx("span",{className:"text-yellow-600",children:"300ms"})]})})]})]})]})}),e.jsxs(r,{value:"api",className:"space-y-4",children:[e.jsxs(a,{children:[e.jsx(v,{className:"w-4 h-4"}),e.jsx(i,{children:"Figma Variables API"}),e.jsx(t,{children:"최신 Figma REST API를 사용하여 변수 값을 업데이트합니다."})]}),e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{children:[e.jsx("h4",{className:"text-sm mb-2",children:"HTTP Request 예시"}),e.jsxs("div",{className:"bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono overflow-x-auto space-y-2",children:[e.jsx("div",{className:"text-blue-400",children:"POST"}),e.jsxs("div",{className:"text-green-400",children:["https://api.figma.com/v1/files/","<FILE_KEY>","/variables"]}),e.jsx("div",{className:"mt-3 text-slate-400",children:"// Headers"}),e.jsx("div",{className:"text-yellow-300",children:`{
  "X-Figma-Token": "YOUR_PERSONAL_ACCESS_TOKEN",
  "Content-Type": "application/json"
}`})]})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"text-sm mb-2",children:"Request Body (JSON)"}),e.jsx("div",{className:"bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono overflow-x-auto",children:e.jsx("pre",{className:"whitespace-pre-wrap",children:`{
  "variableCollections": {
    "<COLLECTION_ID>": {
      "modes": {
        "<MODE_ID>": {
          "variables": {
            "vx": {
              "type": "FLOAT",
              "value": 250
            },
            "vy": {
              "type": "FLOAT",
              "value": 180
            },
            "vr_atk": {
              "type": "FLOAT",
              "value": 60
            },
            "vr_skill": {
              "type": "FLOAT",
              "value": 30
            },
            "v_attack": {
              "type": "BOOLEAN",
              "value": true
            },
            "v_miss": {
              "type": "BOOLEAN",
              "value": false
            },
            "v_crit": {
              "type": "BOOLEAN",
              "value": true
            }
          }
        }
      }
    }
  }
}`})})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"text-sm mb-2",children:"Make에서 동적 매핑"}),e.jsx("div",{className:"bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono overflow-x-auto",children:e.jsx("pre",{className:"whitespace-pre-wrap",children:`{
  "variableCollections": {
    "<COLLECTION_ID>": {
      "modes": {
        "<MODE_ID>": {
          "variables": {
            "vx": {
              "type": "FLOAT",
              "value": {{2.x}}
            },
            "vy": {
              "type": "FLOAT",
              "value": {{2.y}}
            },
            "vr_atk": {
              "type": "FLOAT",
              "value": {{2.atk_range}}
            },
            "vr_skill": {
              "type": "FLOAT",
              "value": {{2.skill_range}}
            },
            "v_attack": {
              "type": "BOOLEAN",
              "value": {{if(2.is_attack = 1, true, false)}}
            },
            "v_miss": {
              "type": "BOOLEAN",
              "value": {{if(2.is_miss = 1, true, false)}}
            },
            "v_crit": {
              "type": "BOOLEAN",
              "value": {{if(2.is_crit = 1, true, false)}}
            }
          }
        }
      }
    }
  }
}`})})]})]})]}),e.jsxs(r,{value:"figma",className:"space-y-4",children:[e.jsxs(a,{children:[e.jsx(l,{className:"w-4 h-4"}),e.jsx(i,{children:"Figma 변수 설정"}),e.jsx(t,{children:"Variables 패널에서 아래 변수들을 생성하고 레이어에 바인딩하세요."})]}),e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx("h4",{className:"text-sm mb-2",children:"1. 변수 컬렉션 생성"}),e.jsxs("div",{className:"bg-blue-50 p-4 rounded-lg space-y-2 text-sm",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(l,{className:"w-4 h-4 text-blue-600"}),e.jsx("span",{children:'Figma 파일 열기 → 우측 "Variables" 패널'})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(l,{className:"w-4 h-4 text-blue-600"}),e.jsx("span",{children:'Create collection → 이름: "GameState"'})]})]})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"text-sm mb-2",children:"2. 필수 변수 목록"}),e.jsx("div",{className:"border rounded-lg overflow-hidden",children:e.jsxs("table",{className:"w-full text-sm",children:[e.jsx("thead",{className:"bg-slate-100",children:e.jsxs("tr",{children:[e.jsx("th",{className:"text-left p-3",children:"변수명"}),e.jsx("th",{className:"text-left p-3",children:"타입"}),e.jsx("th",{className:"text-left p-3",children:"초기값"}),e.jsx("th",{className:"text-left p-3",children:"용도"})]})}),e.jsxs("tbody",{className:"divide-y",children:[e.jsxs("tr",{children:[e.jsx("td",{className:"p-3 font-mono text-blue-600",children:"vx"}),e.jsx("td",{className:"p-3",children:e.jsx(s,{variant:"outline",children:"Number"})}),e.jsx("td",{className:"p-3",children:"200"}),e.jsx("td",{className:"p-3",children:"X 좌표"})]}),e.jsxs("tr",{children:[e.jsx("td",{className:"p-3 font-mono text-blue-600",children:"vy"}),e.jsx("td",{className:"p-3",children:e.jsx(s,{variant:"outline",children:"Number"})}),e.jsx("td",{className:"p-3",children:"200"}),e.jsx("td",{className:"p-3",children:"Y 좌표"})]}),e.jsxs("tr",{children:[e.jsx("td",{className:"p-3 font-mono text-red-600",children:"vr_atk"}),e.jsx("td",{className:"p-3",children:e.jsx(s,{variant:"outline",children:"Number"})}),e.jsx("td",{className:"p-3",children:"60"}),e.jsx("td",{className:"p-3",children:"공격 범위"})]}),e.jsxs("tr",{children:[e.jsx("td",{className:"p-3 font-mono text-purple-600",children:"vr_skill"}),e.jsx("td",{className:"p-3",children:e.jsx(s,{variant:"outline",children:"Number"})}),e.jsx("td",{className:"p-3",children:"30"}),e.jsx("td",{className:"p-3",children:"스킬 범위"})]}),e.jsxs("tr",{children:[e.jsx("td",{className:"p-3 font-mono text-yellow-600",children:"v_attack"}),e.jsx("td",{className:"p-3",children:e.jsx(s,{variant:"outline",children:"Boolean"})}),e.jsx("td",{className:"p-3",children:"false"}),e.jsx("td",{className:"p-3",children:"공격 상태"})]}),e.jsxs("tr",{children:[e.jsx("td",{className:"p-3 font-mono text-orange-600",children:"v_crit"}),e.jsx("td",{className:"p-3",children:e.jsx(s,{variant:"outline",children:"Boolean"})}),e.jsx("td",{className:"p-3",children:"false"}),e.jsx("td",{className:"p-3",children:"크리티컬"})]}),e.jsxs("tr",{children:[e.jsx("td",{className:"p-3 font-mono text-slate-600",children:"v_miss"}),e.jsx("td",{className:"p-3",children:e.jsx(s,{variant:"outline",children:"Boolean"})}),e.jsx("td",{className:"p-3",children:"false"}),e.jsx("td",{className:"p-3",children:"회피"})]})]})]})})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"text-sm mb-2",children:"3. 레이어 바인딩 예시"}),e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"bg-slate-50 p-4 rounded-lg",children:[e.jsx("div",{className:"text-sm mb-2",children:"📍 캐릭터 프레임 (위치)"}),e.jsxs("div",{className:"text-xs space-y-1 font-mono text-slate-700",children:[e.jsx("div",{children:"• Auto Layout 컨테이너 프레임 생성"}),e.jsxs("div",{children:["• Padding-left → ",e.jsx("span",{className:"text-blue-600",children:"vx"})," 바인딩"]}),e.jsxs("div",{children:["• Padding-top → ",e.jsx("span",{className:"text-blue-600",children:"vy"})," 바인딩"]}),e.jsx("div",{children:"• 내부에 점(Ellipse) 배치"})]})]}),e.jsxs("div",{className:"bg-slate-50 p-4 rounded-lg",children:[e.jsx("div",{className:"text-sm mb-2",children:"🎯 공격 범위 (Circle)"}),e.jsxs("div",{className:"text-xs space-y-1 font-mono text-slate-700",children:[e.jsxs("div",{children:["• Width → ",e.jsx("span",{className:"text-red-600",children:"vr_atk * 2"})]}),e.jsxs("div",{children:["• Height → ",e.jsx("span",{className:"text-red-600",children:"vr_atk * 2"})]}),e.jsxs("div",{children:["• Visible → ",e.jsx("span",{className:"text-yellow-600",children:"v_attack"})]})]})]}),e.jsxs("div",{className:"bg-slate-50 p-4 rounded-lg",children:[e.jsx("div",{className:"text-sm mb-2",children:"⚡ 상태 표시 (Fill Color)"}),e.jsxs("div",{className:"text-xs space-y-1 font-mono text-slate-700",children:[e.jsxs("div",{children:["• Conditional: if ",e.jsx("span",{className:"text-orange-600",children:"v_crit"})," → Red"]}),e.jsxs("div",{children:["• Else if ",e.jsx("span",{className:"text-slate-600",children:"v_miss"})," → Gray"]}),e.jsx("div",{children:"• Else → Blue"})]})]})]})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"text-sm mb-2",children:"4. 프로토타입 재생 설정"}),e.jsxs("div",{className:"bg-purple-50 p-4 rounded-lg space-y-2 text-sm",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(l,{className:"w-4 h-4 text-purple-600"}),e.jsx("span",{children:"프레임 선택 → Prototype 탭"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(l,{className:"w-4 h-4 text-purple-600"}),e.jsx("span",{children:"Interaction: After delay (100ms)"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(l,{className:"w-4 h-4 text-purple-600"}),e.jsx("span",{children:"Action: Set variable (다음 틱 값으로)"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(l,{className:"w-4 h-4 text-purple-600"}),e.jsx("span",{children:"Navigate: None (같은 프레임 유지)"})]})]})]})]}),e.jsxs(a,{variant:"destructive",children:[e.jsx(u,{className:"w-4 h-4"}),e.jsx(i,{children:"주의사항"}),e.jsx(t,{children:"Figma 파일이 열려있는 상태에서 변수 업데이트가 반영됩니다. 팀/파일 권한과 토큰 scope를 확인하세요."})]})]})]})]})]}),e.jsxs(d,{children:[e.jsxs(n,{children:[e.jsx(x,{children:"대안: 무개발 워크플로우"}),e.jsx(h,{children:"Google Sheets Sync 플러그인 활용"})]}),e.jsxs(m,{className:"space-y-3",children:[e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx("h4",{className:"text-sm",children:"✅ 장점"}),e.jsxs("ul",{className:"text-sm text-slate-600 space-y-1 list-disc list-inside",children:[e.jsx("li",{children:"개발·API 없이 구성 가능"}),e.jsx("li",{children:"Figma 플러그인만으로 완성"}),e.jsx("li",{children:"초보자 친화적"})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx("h4",{className:"text-sm",children:"⚠️ 단점"}),e.jsxs("ul",{className:"text-sm text-slate-600 space-y-1 list-disc list-inside",children:[e.jsx("li",{children:"실시간 자동 동기화 불가"}),e.jsx("li",{children:"플러그인 수동 새로고침 필요"}),e.jsx("li",{children:"대량 데이터 처리 느림"})]})]})]}),e.jsx("div",{className:"bg-blue-50 p-4 rounded-lg",children:e.jsxs("p",{className:"text-sm text-blue-900",children:[e.jsx("strong",{children:"권장:"})," v1은 Google Sheets Sync로 프로토타입 → v2에서 Make로 실시간 동기화 구현"]})})]})]})]})}export{T as MakeConfigGuide};
