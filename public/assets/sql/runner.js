// SQLite (sql.js, MIT) in a worker. A new database is made for every run.
importScripts('sql-wasm.js');
initSqlJs({ locateFile: f => f }).then(SQL => {
  self.onmessage = e => {
    const db = new SQL.Database();
    try {
      db.run(e.data.setup);
      const before = db.exec('select total_changes()')[0].values[0][0];
      const results = [];
      for (const s of db.iterateStatements(e.data.sql)) {
        const rows = [];
        let more = 0;
        while (s.step()) { if (rows.length < 100) rows.push(s.get().map(v => (v instanceof Uint8Array ? '[blob]' : v))); else if (++more >= 10000) break; }
        const columns = s.getColumnNames();
        if (columns.length && results.length < 10) results.push({ columns, rows, more });
      }
      const changed = db.exec('select total_changes()')[0].values[0][0] - before;
      postMessage({ ok: true, results, changed });
    } catch (x) {
      postMessage({ ok: false, error: String((x && x.message) || x) });
    }
  };
  postMessage('ready');
}, () => postMessage({ ok: false, error: 'SQLite could not be loaded.' }));
