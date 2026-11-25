/** Runs visitor code away from the page: no network, no access to the site, and a hard time limit. */

export interface RunResult { out: string; ok: boolean; ms: number; }
const LIMIT_MS = 4000;

const FRAME = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:"><script>
addEventListener('message', e => {
  if (e.source !== parent) return;
  const src = 'const __o=[];let __n=0;const __s=v=>{try{return typeof v==="string"?v:v instanceof Error?String(v):JSON.stringify(v,(k,x)=>typeof x==="bigint"?x+"n":typeof x==="function"?"[function]":x instanceof Map?[...x]:x instanceof Set?[...x]:x,1)??String(v)}catch{return String(v)}};const __p=(...a)=>{const l=a.map(__s).join(" ");if((__n+=l.length)<20000)__o.push(l)};for(const k of ["log","info","warn","error","debug"])console[k]=__p;(async()=>{try{const r=await (0,eval)("(async()=>{"+' + JSON.stringify(e.data.code + '\\n') + '+"})()");if(r!==undefined)__p(r);postMessage({out:__o.join("\\\\n"),ok:true})}catch(x){__p(String(x));postMessage({out:__o.join("\\\\n"),ok:false})}})()';
  const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  w.onmessage = m => parent.postMessage(m.data, '*');
  w.onerror = x => parent.postMessage({ out: x.message || 'The code could not start.', ok: false }, '*');
});
parent.postMessage('ready', '*');
</script>`;

export function runJavaScript(code: string): Promise<RunResult> {
  return new Promise(resolve => {
    const f = document.createElement('iframe');
    f.setAttribute('sandbox', 'allow-scripts');
    f.style.display = 'none';
    f.title = 'Code runner';
    const started = performance.now();
    const finish = (out: string, ok: boolean) => {
      removeEventListener('message', on);
      clearTimeout(timer);
      f.remove(); // also ends the worker
      resolve({ out, ok, ms: Math.round(performance.now() - started) });
    };
    const on = (e: MessageEvent) => {
      if (e.source !== f.contentWindow) return;
      if (e.data === 'ready') { f.contentWindow!.postMessage({ code: code.slice(0, 20000) }, '*'); return; }
      finish(String(e.data?.out ?? '').slice(0, 20000) || '(no output)', e.data?.ok === true);
    };
    const timer = setTimeout(() => finish(`Stopped after ${LIMIT_MS / 1000} seconds.`, false), LIMIT_MS);
    addEventListener('message', on);
    f.srcdoc = FRAME;
    document.body.append(f);
  });
}

export interface SqlResult { columns: string[]; rows: (string | number | null)[][]; more: number; }
export type SqlRun = { ok: true; results: SqlResult[]; changed: number; ms: number } | { ok: false; error: string; ms: number };

/** SQLite in a worker, with a fresh copy of the sample tables every time. */
export function runSql(sql: string, setup: string): Promise<SqlRun> {
  return new Promise(resolve => {
    const w = new Worker(new URL('assets/sql/runner.js', document.baseURI));
    let started = performance.now();
    const finish = (r: { ok: true; results: SqlResult[]; changed: number } | { ok: false; error: string }) => { clearTimeout(timer); w.terminate(); resolve({ ...r, ms: Math.round(performance.now() - started) }); };
    // loading SQLite the first time may be slow; the short limit starts once it is ready
    let timer = setTimeout(() => finish({ ok: false, error: 'SQLite could not be loaded.' }), 20000);
    w.onmessage = e => {
      if (e.data === 'ready') {
        clearTimeout(timer);
        started = performance.now();
        timer = setTimeout(() => finish({ ok: false, error: `Stopped after ${LIMIT_MS / 1000} seconds.` }), LIMIT_MS);
        w.postMessage({ setup, sql: sql.slice(0, 10000) });
      } else finish(e.data);
    };
    w.onerror = () => finish({ ok: false, error: 'SQLite could not be loaded.' });
  });
}

export const SAMPLE_SQL = `CREATE TABLE department (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE employee (id INTEGER PRIMARY KEY, name TEXT NOT NULL, salary INTEGER NOT NULL, department_id INTEGER REFERENCES department(id), manager_id INTEGER REFERENCES employee(id), hired DATE NOT NULL);
CREATE TABLE customer (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customer(id), amount REAL NOT NULL, status TEXT NOT NULL, ordered DATE NOT NULL);
INSERT INTO department VALUES (1,'Engineering'),(2,'Sales'),(3,'Support'),(4,'Finance');
INSERT INTO employee VALUES (1,'Asha',120000,1,NULL,'2019-03-11'),(2,'Ravi',95000,1,1,'2020-07-01'),(3,'Meena',95000,1,1,'2021-01-18'),(4,'John',70000,2,1,'2018-11-05'),(5,'Priya',82000,2,4,'2022-02-14'),(6,'Arun',54000,3,4,'2023-06-20'),(7,'Sara',61000,3,6,'2024-09-02'),(8,'Dev',45000,NULL,6,'2025-04-28');
INSERT INTO customer VALUES (1,'Blue Clinic','Chennai'),(2,'City Hospital','Bengaluru'),(3,'Green Labs','Chennai'),(4,'Star Pharmacy',NULL);
INSERT INTO orders VALUES (1,1,2500,'PAID','2026-01-12'),(2,1,900,'PAID','2026-03-03'),(3,2,12000,'PAID','2026-03-15'),(4,2,400,'CANCELLED','2026-04-01'),(5,3,7600,'PENDING','2026-05-22'),(6,3,1500,'PAID','2026-06-10'),(7,1,3100,'PENDING','2026-07-19');`;
